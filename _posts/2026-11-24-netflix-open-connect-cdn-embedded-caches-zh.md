---
layout: single
title: "趁你睡觉时填满的 CDN：Netflix Open Connect 如何从你的 ISP 内部送出视频"
description: "普通 CDN 等第一个观众 miss 了才去取文件。Netflix Open Connect 反着来：18,000 台免费 appliance 塞进 ISP 网络，趁夜间低谷以封顶速率填入明天预测要播的内容，由 AWS 里的控制面按库存——而不是靠猜——做 steering；单机冲向 400 Gb/s 的关键，是让 TLS 不再碰 CPU。本文讲机制、每个机制打断的回路，以及它们都修不掉的东西。"
date: 2026-11-24 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Netflix
  - CDN
  - Open Connect
  - FreeBSD
  - 中文
excerpt: "Open Connect 不是更快的缓存，而是一个昨天就决定了你今晚看什么的缓存——18,000 台 appliance、低谷填充、按库存 steering。"
---

> [English version](/backend%20infra/netflix-open-connect-cdn-embedded-caches/)

这是 🚀 Extreme Scale 系列的第七篇。

先看那个反转。传统 CDN 是需求驱动的：观众按下播放键，最近的边缘节点发现自己没有这个文件，在全天最忙的时刻跨上游网络去取，取回来才开始服务。Netflix 自己的 Open Connect 概览用一句话写了相反的设计：为 Netflix 定制的方案可以做成**主动的、定向的缓存（proactive, directed cache）**，"比标准的需求驱动 CDN 方案高效得多，把对上游网络容量的总需求降低几个数量级"。到 2022 年 12 月，这套设计是**横跨 175 个国家、6,000 个地点的 18,000 台服务器**，其中大多数坐在 ISP 的网络里，用的是 Netflix 免费送出的硬件——Netflix 估计，仅 2021 年这个项目就帮 ISP 避免了 **12.5 亿美元**的支出。

有意思的问题不是规模，而是这个反转为什么成立，逐个机制看：Open Connect 的每个部件都打断一个让普通 CDN 在峰值时又贵又慢的具体回路，每个部件也都有明说的边界。

## 背景：当你自己就是峰值，租峰值就行不通了

Netflix 在 2011 年启动 Open Connect，官方概览只给了两个理由。第一，Netflix 已经占了消费级 ISP 网络总流量的很大一部分，必须与这些 ISP 直接、协作地打交道。第二，就是上面那个定制化、主动式的设计。两个理由其实是同一件事的两面：晚间峰值时，Netflix 流量*就是*网络为之而建的那份负载的大头。按 GB 计费的商业 CDN 账单，恰好随最伤人的那批字节增长，而每一字节都在链路最拥堵的时刻穿过 transit 和 peering 链路。

于是 Netflix 沿着"扩展单位不同"的那条线把系统劈成两半。**控制面**在 AWS：播放授权、许可、某个设备需要哪些文件、以及 steering 决策。它按每秒请求数扩展，几乎不搬字节。**数据面**就是 Open Connect 本身：appliance 的唯一职责，用 Netflix 的原话，是"尽可能快地把可播放的比特送到客户端设备"。它按每秒比特数扩展。OCA 不存任何客户数据——没有观看历史、没有 DRM 状态、没有会员数据。一台 appliance 只做两件事：向控制面汇报自己，以及在客户端请求时用 HTTP/HTTPS 送出文件。

部署有两种形式，硬件相同。在互联网交换点（IXP），Netflix 安装 OCA 集群，与在场的 ISP 通过免结算 peering 互联。在 ISP 网络内部，Netflix 向合格 ISP 免费提供 appliance；ISP 提供电力、机柜空间和连接，并且——这个细节很关键——由 ISP 直接控制自己的哪些客户被路由到这些内嵌 OCA。Netflix 2018 年的说法是，全球接近 95% 的流量经由 Open Connect 与会员所用住宅 ISP 之间的直连交付。

{% mermaid %}
graph TD;
    A["Viewer - presses play"] -->|"playback request - small"| B["Playback apps - AWS control plane"];
    B -->|"authorization and file list"| C["Steering service - AWS"];
    D["Embedded OCA - inside ISP"] -->|"health and BGP routes and file list"| E["Cache control service - AWS"];
    F["IXP OCA cluster - peering site"] -->|"health and BGP routes and file list"| E;
    E -->|"inventory and proximity data"| C;
    C -->|"ranked OCA URLs"| A;
    A -->|"video bytes - HTTPS"| D;
    A -->|"fallback if local cannot serve"| F;
    G["Nightly fill - off peak"] -->|"predicted files - capped rate"| D;
    G -->|"predicted files - capped rate"| F;
{% endmermaid %}

整个拓扑就是这样：一个在 AWS 里、不搬视频的大脑，加上几千台刻意做笨、刻意本地的盒子，什么都不搬、只搬视频。下面是机制。

## 机制 1：Push fill——在峰值出现之前把字节搬完

需求驱动 CDN 的第一个失效回路是时间性的：缓存*从峰值里*给自己填充。晚上 8 点，新剧集的第一个观众触发一次跨上游链路的回源，而那些链路正承载着所有人 8 点的流量；这次回源与它本该服务的播放互相争抢，一次同步上线还会把回源乘上每一个缺文件的边缘节点。

Open Connect 打断这个回路的办法，是把填充搬到网络空闲时，并提前决定填什么。Netflix 的合作伙伴文档写得很明确：OCA 采用 **push fill** 方法，每天在一个与 ISP 网络规划团队共同设定的窗口内填充，使其"发生在你的 Netflix 流量低谷"，且"不扰动你的入站流量峰值"。默认窗口是**本地时间凌晨 2 点到下午 2 点、共 12 小时**（可平移两小时），每台 appliance 有硬性速率上限——存储型 appliance 最高 **1.2 Gb/s**、每窗口最多 **6.5 TB**。控制面用热度决定每台 appliance 应该存什么——概览里说的是"不断演进的热度算法"，在最大化 offload 效率的同时"最小化以内容更新形式出现的 churn"——绝大多数内容和软件更新都走这个窗口，因为 Netflix 说它能"高精度预测会员会看什么、什么时间看"。

填充的来源是分层的，而分层是这个机制的另一半。同一集群或同一子网内的 appliance 互相 **peer fill**：集群里一台 OCA 用常规填充下载了一部片，邻居就从它那里取副本，而不是走 transit 或 peering。再不行就 **tier fill**：能在彼此 BGP feed 里看到对方的 OCA 互相填充，而不是从更上游取。只有本地副本都耗尽了，填充才向上游回落。因果链是：预测决定*填什么*，低谷决定*何时填*，上限决定*最多能伤人多狠*（不许伤人），peer 先于 tier 的来源顺序决定每个字节*要走多远*——理想情况是一个机架，而不是一条骨干。

Push fill **修不掉什么**：它是对可预测性的下注，而文档自己点名了下注输掉的情形。**周期外填充（out-of-cycle fill）**存在，恰恰是因为赌注有时会输——修复播放问题需要重新编码、当天播出的新片、直播活动，都会迫使填充流量出现在窗口之外，代价按当时的网络算。一台 appliance 也只存"该地区目录的一部分，一般小于完整的地区内容库"，所以长尾在结构上就不是本地的：冷门或没预测到的内容按设计从更远的站点提供。而上限是双刃的——合作伙伴 FAQ 明确答复，填充速率不能应要求简单调高；低谷纪律就是产品本身，不是可随手覆盖的默认值。

## 机制 2：定向 steering——控制面早就知道每个文件在哪块盘上

第二个失效回路是信息性的。传统边缘是靠*发生*一次 miss 才知道自己 miss 了。Open Connect 的 steering 则是这样建的：这种意义上的 miss 基本不可能被递到客户端手里——控制面只提供它已经知道存有该文件的 appliance。

汇报回路是持续的，与任何请求无关。每台 OCA 周期性地向 AWS 的 Cache Control Service 汇报三样东西，用 2025 年 Netflix 技术博客的原话：它的**容量与健康状况、学到的 BGP 路由、以及当前存储的文件清单**。会员按下播放键时，Playback Apps 服务确定该片和该设备需要哪些文件，然后请 Steering Service 做 steering。Steering 把汇报上来的库存与健康状况，与 geo 位置等客户端信息求交集，返回一份**排序后的 OCA URL 列表**；客户端连上排名第一的 OCA 开始串流。

BGP 在这里不是装饰，而是"本地"的定义。OCA 是定向缓存 appliance：内嵌 OCA 只服务那些经由它与 ISP 路由器的 BGP 会话通告给它的 IP 地址的客户端，所以控制哪些客户前缀可以被这台盒子服务的，是 ISP——不是 Netflix，也不是 appliance 本身。Netflix 的 cache miss 框架用同样方式定义邻近性：最邻近的站点，是为客户端 IP 通告了**最长、最具体匹配前缀**的那个站点。Steering 因此扎根于 ISP 自己声明的路由现实，而不是对某个 IP 地址地理位置的猜测。

这个回路的健康那一半，让"本地"不至于变成"本地且熔断"。每台 OCA 对自己的瓶颈指标——CPU、磁盘使用率等——跑一个控制回路，汇报自己还能接多少流量。Netflix 2025 年的框架把每一个没有从最佳本地站点送出的字节，分成恰好两个有名有姓的原因。**内容 miss（content miss）**：文件不在本地 OCA 上——是预测、放置或存储容量的问题。**健康 miss（health miss）**：本地硬件正在饱和，于是客户端被刻意导向别处——是容量或负载均衡的问题。这个区分是运营性的，不是分类学游戏：两种 miss 的负责人和修法不同，而 Netflix 把 steering 清单日志与 OCA 服务器日志近实时地 join 起来，正是为了让每个 miss 到达时已经贴好了原因标签。

Steering **修不掉什么**：它只能在已存在的副本和已配置的容量之间做选择。真正不可预测的爆款造成的内容 miss 没法被 steer 掉——没有本地副本可排第一；上线夜的健康 miss 是一张以"本地性降级"形式寄来的容量账单，不是谁重试一下就能消除的错误。Steering 还继承了 BGP 眼中的世界：邻近性是合作伙伴通告的前缀具体程度，当通告粗糙、或客户端的表面地址 misrepresent 了它的网络位置时，"最近"的站点是路由空间里的最近——通常、但不总是等于体验上的最近。

## 机制 3：一台盒子、400 Gb/s——别再碰数据了

第三个失效回路在一台服务器内部，而且是内存带宽回路，不是 CPU 回路。Netflix 的负载异常纯粹：静态的、预编码好的文件，用 FreeBSD 的 `sendfile(2)` 发送——它的全部意义就是让批量数据从磁盘到网络、CPU 不经用户态拷贝。然后 TLS 成了必需品，而朴素的 TLS 会打破 `sendfile`：如果用户态软件必须加密字节，字节就必须被碰——读、加密、写——每碰一次都在花这台机器最稀缺的资源。

Drew Gallatin 在 EuroBSDCon 2021 的演讲把墙量了出来。自 2020 年起，单台 Netflix 服务器已经能送出 **200 Gb/s 的 TLS 加密视频**；问题是如何从同级机器上送出约 **400 Gb/s**：AMD EPYC 7502P（32 核）、八通道 256 GB DDR4-3200 提供约 **150 GB/s 内存带宽**、两块 Mellanox ConnectX-6 Dx 网卡（共四个 100 GbE 口）、18 块 NVMe 盘。送 400 Gb/s 意味着发出 50 GB/s——但用软件内核 TLS（主机 CPU 在 `sendfile` 管线里做加密）时，演讲的数据流账本需要约 **200 GB/s 的内存带宽**，因为载荷反复穿过内存。这超过了机器的约 150 GB/s。软件路径的实测结果：约 **240 Gb/s，受限于内存带宽**。

修复办法是按顺序删掉"触碰"。**内核 TLS**（2016 年进入栈中）把批量加密搬进内核，让 `sendfile` 管线活下来：握手留在用户态，批量加密在数据本来所在的地方做，用户态拷贝消失。接着是 **NUMA 纪律**：在多节点的 EPYC 上，穿过 Infinity Fabric（演讲账本里约每链路 47 GB/s）的批量数据会拥堵 fabric、让 CPU 停顿，所以 Netflix 的策略是尽可能让批量数据不走 fabric——每条流由持有其磁盘和网卡的那个 NUMA 节点服务。最后是**网卡内联 kTLS 卸载**：ConnectX-6 在卡上加密，主机 CPU 完全不为加密碰载荷，演讲报告约**每块网卡 190 Gb/s、两块合计约 380 Gb/s**，CPU 利用率降到约 50–60%。2022 年的后续报告给出了沿同一轨迹冲向 800 Gb/s 的初步结果。

这套机制**修不掉什么**：墙仍然是内存带宽；卸载把加密的触碰从 CPU 上挪走，但字节仍要穿过内存从 NVMe 到网卡，这也是为什么已发布的生产 appliance 等级远低于实验室峰值——Netflix 当前的 Open Connect 规格里，存储型 appliance 的运营吞吐约 **200 Gb/s**、全球型 appliance 约 **80 Gb/s**。400 Gb/s 是一台调优测试机逼近的数字，不是合作伙伴该对一台机架设备期待的数字，把两者混为一谈正是 CDN 数字变成营销话术的方式。这个机制真正的教训更窄、也更可迁移：在几百 Gb/s 的量级上，吞吐是"数据被触碰次数"的预算，你删掉的每一次拷贝，都是不用换硬件就买回来的容量。

## 经济学也是一个机制

很容易把"免费 appliance"当成营销。它是承重结构。ISP 的成本由 transit、peering 和长途链路上的峰值容量主导；Open Connect 在峰值时把 Netflix 字节从那些链路上拿掉（本地服务），又把替代字节搬到低谷（填充）——那是 ISP 已经付过钱、且闲着没用的容量。Netflix 那个"2021 年帮 ISP 避免 12.5 亿美元支出"的估计是自报的、写给合作伙伴看的，应当当作 Netflix 的主张、而非审计结论。但激励的方向不依赖确切数字：ISP 愿意托管这台盒子，是因为它删掉了 ISP 最贵的那份流量；Netflix 愿意送出盒子，是因为拥有交付的最后一公里比硬件值钱。同样的逻辑解释了十周年文章里那句压缩注脚：用五年前一半的码率送出同样的画面，会同时缩小系统里的每一项——峰值字节更少、填充更小、每台 appliance 能装的片更多。

## Open Connect 做不到的事

边界是结构性的。它是一个**单目录** CDN：预测、文件级库存、appliance 设计，全都假设有一个提前知道全部语料的所有者；服务任意源站的多租户 CDN 无法预置它枚举不了的东西。它为**预编码的点播文件**而建：直播活动正是那个被点名的例外，会迫使周期外填充、并带来另一类交付问题，而不是这套设计优化的情形。本地性**受合作关系约束**：ISP 没有内嵌 OCA、附近也没有 peering 的观众，拿到的就是更长的路径，再好的 steering 算法也变不出一台从没被接收的盒子里的副本。而整座大厦立在观看热度分布保持倾斜之上——如果观看在目录上是均匀的，任何"一部分大小"的 appliance 都装不下工作集，push fill 会退化成每晚把整个片库运一遍。

## 值得偷走的教训

1. **按扩展单位切分平面。** 授权与 steering 按请求扩展，视频按比特扩展。Netflix 把前者放进 AWS、后者放进 18,000 台本地盒子，两边的增长互不征对方瓶颈的税。如果系统里某个部件的扩展单位和其余部分不同，那里就是接缝——在那里切。
2. **把工作搬到低谷，并且在低谷里封顶。** Push fill 成立，是因为窗口、速率上限（1.2 Gb/s、6.5 TB）和 peer 先于 tier 的来源顺序是一起设计的：没有上限的预测照样会伤人，没有预测的上限只是慢。低谷容量只有在你拒绝让它变成峰值容量时，才是免费的。
3. **永远不要把猜测递给客户端。** Steering 只返回经持续库存汇报已知存有文件、且健康有余量的 appliance。一个在全局知道自己内容的缓存，没有需求驱动意义上的冷 miss；它有的是放置失败，而放置失败可以提前度量。把区别仪表化：内容 miss 和健康 miss 的负责人不同。
4. **数数据被触碰的次数，而不只是 CPU。** 从 200 到约 380 Gb/s 的路不是更多核，而是删拷贝——用户态到内核、内核到 CPU 加密、fabric 穿越——直到内存带宽够用。在高吞吐下，要 profile 字节*走过的路*，而不只是周期烧在哪里。
5. **先对齐邻居的激励，再送出硬件。** 内嵌缓存成立，是因为 ISP 的峰值账单降了。当你的架构需要住进别人的网络里时，部署机制就是一份附带一台服务器的经济学论证。

Open Connect 真正的教训不是"自建 CDN"——几乎没人应该这么做。而是 Netflix 找出了让租用交付变贵的那三个回路——填充与它服务的峰值争抢、steering 对库存无知、盒子内部按字节计的数据触碰——并用各自文档里明说代价的机制逐一打断：有时会失手的预测、受合作关系约束的本地性、以及生产集群并不声称的实验室峰值。视频之所以秒开，是因为几乎所有可能出错的事，都被搬到了凌晨 2 点。

## Sources

- Netflix, "Open Connect Overview," 2016, updated 2019. https://comp3331-21t3.netlify.app/files/Open-Connect-Overview.pdf （Netflix 官方概览文档，大学课程镜像）——项目始于 2011 年及其两个明示理由；主动定向缓存"比标准需求驱动 CDN 方案高效得多，把对上游网络容量的总需求降低几个数量级"；OCA 存储编码后的视频/图像文件并经 HTTP/HTTPS 提供服务，唯一职责是尽可能快地交付可播放比特；两种部署形式（IXP 集群免结算 peering；向合格 ISP 免费提供的内嵌 appliance，ISP 提供电力、空间与连接并控制哪些客户被路由至此）；OCA 不存客户数据且只做两件事（向 AWS 控制面汇报健康、学到的 BGP 路由与所存文件；在请求时提供内容）；五步播放与 steering 流程；绝大多数内容与软件更新在低谷填充窗口主动下发；OCA 之间互取更新以最小化骨干使用；热度算法在最大化 offload 的同时最小化 churn。
- Gina Haspilaire (Netflix), "Open Connect: Celebrating a Decade of Smooth and Efficient Streaming," Netflix, December 15, 2022. https://www.webwire.com/ViewPressRel.asp?aId=298045 ——175 个国家、6,000 个地点的 18,000 台服务器；估计 2021 年帮 ISP 避免 12.5 亿美元支出（Netflix 的估计）；以五年前一半的码率交付内容；在预期需求之前把热门内容预置到本地服务器。
- Netflix Open Connect Partner Help Center, "Fill patterns." https://openconnect.zendesk.com/hc/en-us/articles/360035618071-Fill-patterns ——push fill 方法；填充窗口与 ISP 网络规划团队共同设定，落在流量低谷且不扰动入站峰值；12 小时窗口、默认本地时间凌晨 2 点到下午 2 点、可平移两小时；存储型 appliance 上限 1.2 Gb/s、每窗口最多 6.5 TB（全球型 0.4 Gb/s、2.1 TB）；每台 OCA 只存地区目录的一部分；集群或同子网内 peer filling；在彼此 BGP feed 中可见的 OCA 之间 tier filling；因重新编码、当天播出片与直播活动产生的周期外填充。
- Dave Temkin / Netflix via APNIC Blog, "Netflix content distribution through Open Connect," June 20, 2018. https://blog.apnic.net/2018/06/20/netflix-content-distribution-through-open-connect/ ——Open Connect 承载 Netflix 100% 的视频流量；全球接近 95% 的流量经与住宅 ISP 的直连交付；OCA 是定向缓存 appliance，只服务经 BGP 会话通告给它的客户前缀，ISP 完全控制一台 appliance 服务哪些网络。
- Vipul Marlecha, Lara Deek, and Thiara Ortiz, "Driving Content Delivery Efficiency Through Classifying Cache Misses," Netflix Technology Blog, July 2, 2025. https://netflixtechblog.com/driving-content-delivery-efficiency-through-classifying-cache-misses-ffcf08026b6c ——每台 OCA 周期性向 Cache Control Service 汇报容量与健康、学到的 BGP 路由与所存文件清单；Playback Apps 与 Steering Service 返回排序后的 OCA URL；邻近排名由最长、最具体的匹配 BGP 前缀定义；内容 miss 与健康 miss 的分类；每台 OCA 对 CPU、磁盘等瓶颈指标的健康控制回路；经 Kafka 近实时 join steering 清单日志与 OCA 服务器日志。
- Drew Gallatin, "Serving Netflix Video at 400 Gb/s on FreeBSD," EuroBSDCon 2021. https://papers.FreeBSD.org/2021/eurobsdcon/gallatin-netflix-freebsd-400gbps.files/gallatin-netflix-freebsd-400gbps-slides.pdf ——自 2020 年起单机 200 Gb/s 的 TLS 加密视频；400 Gb/s 之问；测试硬件（AMD EPYC 7502P、32 核、256 GB DDR4-3200、约 150 GB/s 内存带宽、两块 Mellanox ConnectX-6 Dx、18 块 NVMe）；视频经 sendfile(2) 与软件 kTLS 发送；软件加密下 400 Gb/s 需要约 200 GB/s 内存带宽；软件路径实测约 240 Gb/s 且受限于内存带宽；Infinity Fabric 约每链路 47 GB/s 与让批量数据不走 fabric 的策略。
- Drew Gallatin, "Serving Netflix Video Traffic at 400 Gb/s and Beyond — 800 Gb/s," NAB Streaming Summit, April 2022 (Netflix slides). https://nabstreamingsummit.com/wp-content/uploads/2022/05/2022-Streaming-Summit-Netflix.pdf ——异步 sendfile（2014）、内核 TLS（2016）、以网络为中心的 NUMA（2019）、内联硬件 NIC kTLS（2022）与 800 Gb/s 初步结果的时间线；TLS 阻止 sendfile 并使内存带宽需求增至三倍；内核 TLS 把批量加密搬进内核、握手留在用户态，从而恢复 sendfile 数据流。
- Netflix Open Connect appliance specifications, openconnect.netflix.com ——当前生产等级：存储型 appliance 最高 120 TB、运营吞吐约 200 Gb/s；全球型 appliance 约 80 Gb/s（数字以 Netflix Open Connect 站点公布为准，并见 FreeBSD Foundation 的 Netflix 案例研究汇总，https://freebsdfoundation.org/end-user-stories/netflix-case-study/ ——数千台 FreeBSD appliance 送出每秒太比特级流量；内核 TLS 使 400 Gb/s 级服务成为可能）。
