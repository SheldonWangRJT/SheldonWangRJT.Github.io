---
layout: single
title: "Uber 的数据库撑不到 2014 年底：Schemaless 如何把 MySQL 变成一本只追加的行程日志"
description: "2014 年初，Uber 的行程数据住在单台 Postgres 上，增长速度意味着年底之前数据库就会被撑爆，公司基础设施将无法运转。答案是 Schemaless：一层包在分片 MySQL 外面的薄层——每次写入都是一个不可变 cell，缓冲写堵住异步复制的丢数据窗口，每个分片一个 master 让存储变成可分区的日志，触发器再把这本日志变成计费流水线。它从 2014 年支撑 Uber 走到今天——而它的局限，恰恰是后继者 Docstore 要修的东西。"
date: 2026-11-10 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Uber
  - Schemaless
  - MySQL
  - Sharding
  - 中文
excerpt: "2014 年初 Uber 的行程数据住在单台 Postgres 上，年底之前数据库就会被撑爆。Schemaless 没换掉 MySQL：不可变 cell、缓冲写、可分区日志、触发器计费——四样机制扛起了 Uber 的行程存储。"
---

> [English version](/backend%20infra/uber-schemaless-trip-datastore-mysql/)

这是 🚀 Extreme Scale 系列的第五篇。

先看那个 deadline。2014 年初，Uber 的行程数据住在单台 Postgres 上，增长快到团队得出结论：年底之前公司的基础设施将无法运转——根本存不下这么多行程数据。不是"查询会变慢"，不是"需要一台更大的机器"，是数据库会把磁盘用完，生意会停摆。随后的任务花了大半年、动用了全球各办公室的工程师——而他们建出来的系统 Schemaless，十年之后仍然是 Uber 行程流水线的 source of truth。

有意思的不是 Uber 自己造了个数据库。有意思的是*为什么现成的选项都输了*，以及胜出的设计拒绝做什么。Schemaless 在最关键的地方故意无聊：底下就是普通的 MySQL，一个团队半夜三点也知道怎么修的数据库。所有聪明的东西都在上面那层薄薄的壳里，而壳里的每一件东西，都对应它所取代的那套系统的一个具体失效模式。这篇按失效模式一个一个讲——因为机制才是教训，而局限是教训的另一半。

## 背景：五个需求、三个被拒的数据库、一个决定性因素

Uber 团队在选型之前写下了五个需求，值得全文引用，因为后面的每个机制都对应其中一条：

1. **线性扩容。** 加服务器必须同时增加磁盘、降低响应时间。Postgres 做不到。
2. **写可用性。** Uber 已经有个 Redis 缓冲：Postgres 写失败时，行程先放在 Redis 里稍后重试。但行程待在 Redis 里的时候读不到，计费就丢了。烦人，但至少行程没丢。新系统需要把同样的安全网内置进来——宁可牺牲 read-your-writes，也要保证写能落盘。
3. **下游通知。** 计费、分析等行程处理步骤当时是并行跑的；任何一步失败，全部都得重跑，哪怕有的步骤已经成功了。团队想把这些步骤拆开、由数据变化来驱动——Kafka 0.7 试过，做不到无损。
4. **二级索引。** 离开 Postgres 意味着失去 Postgres 的索引，新存储必须能用同样的方式搜行程。
5. **运维信任。** 决定一切的那条：如果半夜三点被叫醒，说这个数据存储挂了、连带着生意也挂了，团队有没有立刻修好它的运维知识？

拿着这张单子，团队评估了 Cassandra、Riak、MongoDB 等等。它们加节点都能线性扩展，但没有一个内置了通知下游系统的能力——那得在应用层自己搭——而且它们的索引在索引值一多的时候就退化成 scatter-gather，全节点查询。还有些候选者只是单个集群，从没在 Uber 承载过面向用户的在线流量，运维问题团队已经领教过。决定因素用 Uber 自己的话说，"最终归结为对系统的运维*信任*"。设计灵感来自 FriendFeed，运维上的专注来自 Pinterest——但底层的选择恰恰反潮流：留住团队会运维的数据库，在上面薄薄一层里把缺失的能力补齐。

那层东西就是 Schemaless：一个可以存任意 JSON、不做严格 schema 校验的键值存储——名字就这么来的——由只追加的分片 MySQL、支撑 master 故障的缓冲写、叫触发器的发布订阅变更通知、以及全局二级索引组成。

## 数据模型：一个 cell、三个坐标、没有 schema

Schemaless 是一个只追加的、稀疏的、三维持久哈希表，跟 Google 的 Bigtable 很像。最小的数据实体叫 **cell**：一个不可变的 JSON blob，由**行键**（一个 UUID）、**列名**（一个字符串）和 **ref key**（一个整数）定位。写进去之后就不能覆盖、不能删除——特殊情况下可以删旧记录，但那是例外。所谓"更新"一个 cell，就是用相同的行键和列名、更高的 ref key 再写一个新 cell；最新的 cell 就是 ref key 最大的那个。ref key 也可以当列表条目用，但典型用法是做版本。

没有预定义、没有强制执行的 schema。列名完全由应用定义，不同行不需要共享列名。应用通常把相关数据放进同一列，该列里所有 cell 的应用层 schema 大致相同——这样应用可以快速改 schema，数据库侧不需要任何停机。

Uber 的行程存储服务 **Mezzanine** 说明了列切分为什么重要。一趟行程不是一次写完的一条记录：它的各个部分异步到达——上车下车、费用计算、计费尝试、费用调整、行程结束几天后才到的乘客或司机反馈。Mezzanine 把一趟行程建模成四列：

- **BASE**——基础行程信息（司机 UUID、时间），行程结束时写一次。
- **STATUS**——每次计费尝试一个 cell，因为扣款可能因卡过期或被拒而失败、需要重试。
- **NOTES**——乘客或司机的反馈。
- **FARE ADJUSTMENT**——只有费用变化时才有 cell，比如走了低效路线。

这样切分有两个具体好处：避免数据竞争，因为 BASE、STATUS、NOTES 由不同进程在不同时间写，永远不会争同一个 cell；以及减少每次更新要写的数据量，因为一次计费重试只需要写一个小的 STATUS cell，而不是重写整趟行程。Schema 住在应用里，数据库只负责存 JSON。

## 架构：worker 节点、存储节点、4,096 个分片

Schemaless 有两种节点：worker 节点和存储节点，可以在同一台机器上，也可以分开——分开是为了让两边各自独立扩展。客户端通过 HTTP 跟 worker 节点说话；worker 把请求路由到存储节点、汇总结果、跑后台任务。客户端库在 worker 变慢或故障时透明地重试其他主机，这所以安全，是因为 Schemaless 的写是幂等的。

数据集被切成**固定数量的分片——通常配置为 4,096 个**，映射到存储节点。一个 cell 按行键落到某个分片。每个分片复制到可配置数量的存储节点，组成一个存储集群：**一个 master 加两个 minion**，minion 分布在多个数据中心，这样灾难性的数据中心故障也不会把数据带走。

{% mermaid %}
graph TD;
    A["客户端 - Mezzanine 行程服务"] -->|"HTTP 请求"| B["Worker 节点 - 路由与分发"];
    B -->|"按行键 UUID 映射 cell"| C["分片映射 - 4096 个固定分片"];
    C -->|"写去 master"| D["存储集群 - 1 个 master 加 2 个 minion"];
    D -->|"异步 MySQL 复制"| E["另一个数据中心的 minion"];
    D -->|"异步 MySQL 复制"| F["另一个数据中心的 minion"];
    B -->|"从集群任意节点读"| D;
    B -->|"缓冲写 - 先写 secondary"| G["随机 secondary master - 缓冲表"];
    G -->|"后台任务回放到 primary"| D;
{% endmermaid %}

读可以走集群里的任意节点；默认是 master，这样客户端一定能读到自己刚写的东西。写必须去 master，master 再异步复制给 minion。master 在的时候，读永远拿到最新数据。master 不在的时候，minion 可能会返回略微过期的数据——生产环境里复制延迟通常不到一秒，所以 minion 的数据一般是新鲜的——worker 节点在存储连接上用断路器模式，读会自动 failover 到健康节点。minion 挂了完全不影响写。

拓扑就是这么简单。下面是机制——每一个都打断一条具体的失效回路，每一个也都有团队自己坦白的边界。

## 机制一：不可变——用"永不更新"删掉更新竞争

第一个失效模式是数据库工程里最老的一个：两个进程更新同一行。在关系型存储里，更新是一次加锁的读-改-写。计费重试、费用调整、司机反馈同时碰同一趟行程时，它们在同一行锁上排队；慢写者占着锁、其他人等着；中途崩溃会留下一个半应用的状态，下一个写者还得先想明白它。竞争回路是：同一趟行程上的并发越多，锁等待越久，事务越长，锁等待就越久。

不可变不是调优这条回路，而是把它删了。cell 写进去就永远不改。计费重试不去更新 STATUS cell，而是用更高的 ref key 追加一个新的 STATUS cell。费用调整不去重写行程，而是追加一个 FARE ADJUSTMENT cell。没有行会被锁，因为没有任何一次写会碰另一写碰过的行。两个进程写同一趟行程的不同列，完全不会互相阻塞；两个进程写同一列，也只是产生两个版本，ref key 最大的那个确定性地获胜。读者永远看不到撕裂的写，因为一个 cell 要么完整存在，要么不存在。

存储布局让追加在机械层面也很便宜。每个分片是一个独立的 MySQL 数据库，每个 cell 是分片实体表里的一行：

| 列 | 类型 |
| --- | --- |
| added_id | 自增整数 |
| row_key | UUID |
| column_name | 字符串 |
| ref_key | 整数 |
| body | 压缩 blob |
| created_at | 时间戳 |

`added_id` 是 MySQL 主键。因为自增，MySQL 把 cell 线性地写到磁盘上——新行追加在聚簇索引末尾，而不是随机插入页面，写 I/O 保持顺序。`(row_key, column_name, ref_key)` 上的复合索引让查找一趟行程的 cell 很快，body 里是 JSON，用 MessagePack 加 ZLib 压缩——实验后选的组合，看中的是压缩速度和压缩率。`created_at` 时间戳让触发器能找到某个时间之后写入的 cell。

不可变**修不了什么**：存储永远只增不减，因为没有任何东西会被覆盖。每一次计费重试、每一个版本、每一个被取代的 cell 都留在磁盘上，直到特殊删除。几年后这成了实实在在的成本问题——Uber 的 Jellyfish 项目存在的理由正是 Schemaless 已经"攒下了 Uber 的数据"，用的是又快又贵的存储，不得不批量打包 cell、用 ZSTD 重新压缩（每批 100 个 cell，level 7，最高省 40%）来把账单降下来。不可变还意味着纠错只能是新版本、不是原地修复，"最新"永远是一次查找、而不是直接读行本身。这个机制用磁盘换了竞争的消失——在 Uber 的规模上是笔好买卖，但账单是附带的。

## 机制二：缓冲写——用第二份拷贝堵住异步复制的丢数据窗口

第二个失效模式来自复制本身的选择。Schemaless 用 MySQL 的**异步**复制：master 先落盘，再复制给 minion。如果 master 收到写请求、落了盘、然后在复制发生之前挂了——比如硬盘故障——这次写就丢了。它短暂地只存在于一台主机上，然后哪儿都不存在了。窗口很小，后果是一趟行程丢了，对计费系统来说不可接受。

缓冲写的做法是拒绝让一次写只存在于一台主机上。worker 收到写请求时，会把它写到**两个**集群：先写 *secondary*，再写 *primary*。只有两个都成功，才告诉客户端写成功了。primary master 是后续读期望找到数据的地方。secondary master 是随机选的，写进它上面一张特殊的缓冲表。后台任务盯着 primary 的 minion；cell 一旦出现在那里，就从缓冲表里把它删掉。有了 secondary，所有数据至少写在两台主机上。

同样的机制覆盖 primary master 干脆挂了的情况。master 不可用时，Schemaless 仍然接受写——它们被持久化到另一台随机选的 master 的磁盘上，跟 Dynamo 或 Cassandra 里的 hinted handoff 一模一样。客户端会被告知写成功了，同时也被告知 master 挂了，所以它知道这个 cell 暂时读不到。master 回来之后，缓冲的 cell 会被回放到 primary 集群。

这一切离开**幂等性**都玩不转。写是幂等的，因为一个 cell 由（行键、列名、ref key）三元组标识：写一个已经存在的 cell 会被拒绝。所以后台回放可以安全地重发缓冲的 cell——同一份写的两个拷贝都被缓冲了，primary 回来时只有一个能成功，剩下的被拒绝。客户端库也可以安全地对超时的写换一个 worker 重试，因为如果第一次尝试其实已经落盘了，重试就是个 no-op。

缓冲写**修不了什么**：它把丢数据的窗口从"一台主机在错误时刻挂了"缩小到"特定的两台主机在错误时刻同时挂了"——没有消除，因为底下的复制仍然是异步的。而且它制造了一种应用必须理解的新状态：一次写可以**持久但不可读**。分片 master 挂掉期间接受的行程已经落在磁盘上，但在 master 回来或 minion 被提升之前，任何读都找不到它。客户端会被明确告知这一点，设计对此也是诚实的：写可用性是第二条需求，read-your-writes 是明确为它牺牲掉的。双写还要付出实实在在的代价——每次写都要写两遍，而回放任务本身是一台必须永远不丢缓冲 cell 的永久机器。

## 机制三：一个 master、一个顺序、一本日志——存储如何变成事件总线

第三个机制是把 Schemaless 从一个存储变成 Uber 行程处理骨架的关键，而它来自一个看起来像局限的设计选择：**每个分片只有一个节点接收写**。一个分片一个 master，意味着该分片的写有一个**全序**——单一序列，在每个副本上都一样。自增的 `added_id` 就是这个顺序的物理形态：它在分片的所有副本上都相同，标示插入顺序。所以每个分片实际上就是一本自己的日志：一本按 cell 修订分区的日志，分区键是分片，位置是 `added_id`。

这正是**触发器**不需要单独的事件总线的原因。Uber 曾经为行程事件试过 Kafka 0.7，做不到无损运行；需求是一套无损的通知机制。Schemaless 的答案是 tail 自己的日志。API 在随机访问之外还暴露日志式访问：`get_cells_for_shard(shard_no, location, limit)` 返回某个位置——时间戳或 `added_id`——之后的 cell，外加下一个位置偏移，客户端可以像 `tail -f` 一样往前 poll。触发器框架就是这样 tail 日志、记录偏移、在被监听的列里出现新 cell 时调用注册的函数。

计费流程是标准例子。处理函数用装饰器注册在 BASE 列上；一趟行程结束、BASE cell 写进来时，框架用行程 UUID 调用 `bill_rider`。处理函数先查最新的 STATUS cell——如果 `is_completed` 不存在，说明还没计过费——再从 BASE 取行程信息、扣信用卡、把结果作为新的 STATUS cell 写回去。计费跟行程创建解耦了：行程服务只写一个 cell，计费服务对它做出反应。同一本日志还喂给分析仓库和跨数据中心复制。

{% mermaid %}
graph TD;
    A["分片 1 - cell 分区日志"] -->|"按 added_id 偏移 tail"| B["触发器 worker 1 - 负责分片 1"];
    C["分片 2 - cell 分区日志"] -->|"按 added_id 偏移 tail"| D["触发器 worker 2 - 负责分片 2 和 5"];
    B -->|"至少一次调用"| E["bill_rider - 监听 BASE 列"];
    D -->|"至少一次调用"| E;
    E -->|"扣款"| F["支付服务商"];
    E -->|"把结果写回去"| G["STATUS 列 - 新 cell"];
    H["Leader worker - 分配分片"] -->|"故障时重分配"| B;
    H -->|"故障时重分配"| D;
    I["ZooKeeper - 偏移量与 leader 选举"] -->|"持久化进度"| B;
    I -->|"持久化进度"| D;
{% endmermaid %}

框架用三件机器让这套东西可扩展、容错。第一，**分片归属**：框架把分片分给 worker 进程，一个分片只由一个 worker 处理——4,096 个分片的实例最多可以有 4,096 个 worker，在线增减。第二，**leader**：一个 worker 被指定为 leader、负责分配分片；某个 worker 挂了，leader 把它的分片重分配给健康进程。第三，**持久化的偏移量**：框架把每个分片最新成功触发的 cell 的 `added_id` 存进 ZooKeeper（或 Schemaless 实例自身）这样的共享存储，重启时从存下的偏移量继续，而不是从头开始。共享存储还负责 leader 选举和 worker 发现。

故障处理是分层设计的。worker 进程挂了，leader 重新分配它的分片。leader 挂了，选出新的 leader——选举期间 cell 照常处理，只是不能重新分配工作、不能增减 worker。ZooKeeper 挂了，cell 照常处理，限制相同。数据库节点挂了，触发器从任意副本读。而因为投递是**至少一次**——每个 cell 的处理函数至少被调用一次，处理函数或外部出错时可能被调用多次——每个触发器函数都必须是幂等的；计费例子里就是靠先检查这个 cell 是否已处理过、处理过就直接返回。

这本日志**修不了什么**：顺序**只在分片内**成立。跨分片没有全局顺序，两个分片里的 cell 没有定义好的先后——需要跨行程顺序的消费者得自己建。一个毒 cell 会卡住它所在的分片：分片内 cell 按写入顺序触发，所以某个 cell 的处理函数如果总是失败，它后面的所有 cell 都会被堵住，直到框架把反复失败的 cell 隔离到单独的队列——而隔离的 cell 超过阈值，触发就整个停下来，Uber 把这当作"系统性错误、需要人工处理"的信号。至少一次是跟处理函数的约定，不是存储的属性：计费处理函数如果不幂等，重试时就会对乘客收两次钱。日志给你无损投递，正确的处理给不了你。

## 机制四：分片索引——用 shard field 绕开 scatter-gather 陷阱

第四条需求——二级索引——藏着整个设计里最阴险的扩展陷阱。分片存储上的朴素索引是一次 **scatter-gather** 查询：要找某个司机的行程，你得问每一个分片、等所有分片回答、再合并。4,096 个分片，一次查找就是 4,096 次子查询，最慢的分片决定延迟。索引的字段越多，每次查询都要付这个扇出代价。Uber 早就点名了这一点：现成选项正是在索引需求上不合格的。

Schemaless 的绕法是把索引本身也分片。每个索引必须指定其中一个字段作为 **shard field**，索引按这个字段分区——于是带 shard field 的索引查询只去一个分片。Mezzanine 的 `driver_partner_index` 定义在 BASE 列上，shard field 是 `driver_partner_uuid`，城市和行程创建时间被反规范化进索引。找某个司机在某城市某段时间内的全部行程，就成了一次单分片查询。

反规范化是这招的另一半。Schemaless 允许索引里直接带一份它所索引的 cell 数据的拷贝，这样索引查询只查索引就能回答，不需要再去实体表取一次。团队明确建议把可能用到的东西都反规范化进索引。代价在原文里说得很直白："我们用存储换快速查找。"一个分片、一次查找、不用合并——用每个索引字段上重复的字节买来的。

分片索引**修不了什么**：它们是**最终一致**的——Uber 自己的概述就称之为"高效的、最终一致的二级索引"，索引查询可能滞后于它所描述的实体写。每个索引还带来写放大和存储：每个新 cell 都得更新定义在它列上的每个索引，所以一个很少被查的索引仍然要对每次写征税。不带 shard field 的查询会回到 scatter-gather，完整的 4,096 路扇出——索引对它一点忙都帮不上。而一个热门的 shard field 会像其他任何地方的热门键一样集中负载：一个行程量极大的司机伙伴会在一个分片的索引里占不成比例的份额，再怎么设计索引也 spread 不开。索引解决的是带 shard field 的查询的扇出问题，除此之外什么都不解决。

## Schemaless 做不到什么——以及取代它的东西

Schemaless 诚实的边界，是它从没想做的事的清单。它没有事务：cell 一次写一个，没有原子的多 cell 或多分片更新。它没有跨分片查询——除了单分片索引查找，任何需要跨分片 join 的事都是应用的工作。它没有 schema 强制：数据库只存 JSON、信任应用，所以有 bug 的写者可以持久化格式错误的数据，然后每个读者都得容忍它。 它的一致性约定也是刻意收窄的：只有从 master 读才能 read-your-writes，索引最终一致，master 故障期间写可以持久但不可读。

Uber 后来的历史，就是这些账单逐一到期的记录。**Docstore** 是 Schemaless 系列之后 Uber 公布的演进：引擎还是 MySQL，但补上了 Schemaless 拒绝的东西——事务、物化视图、关联、变更数据捕获，并且在*分区内*提供严格可串行化——仍然不是跨分区，因为那个边界就是分片本地设计的代价。而 **Jellyfish** 存在的原因，是只追加存储在昂贵磁盘上变贵了：Schemaless 在 Uber 把新用例合并到 Docstore 的同时，仍然是既有流水线的 source of truth，tiering 项目不得不批量打包、重新压缩 cell 来追回最高 40% 的存储成本。这两个项目都没有废除 Schemaless，两者都是它原始 tradeoff 的定价。

## 值得偷走的教训

1. **运维信任是一条需求，不是感觉。** Uber 拒绝了技术上能用的数据库，因为团队半夜三点修不好它们。胜出的设计留住了团队已经会用的底层——MySQL——在一层薄到能在压力下讲清楚的壳里补齐缺失的能力。选数据存储时，先问谁会被叫醒、他能不能修好。
2. **不可变是删掉整类 bug，而不是缓解它们。** 没有更新就没有行锁、没有撕裂写、没有读-改-写竞争——还免费得到一本只追加的日志。代价是存储增长和版本查找，那是一笔可以算出来的账，不像竞争条件那样算不出来。
3. **用第二份拷贝堵住异步复制的丢数据窗口，而不是用同步复制。** 缓冲写接受了写两遍的代价和一个回放任务的复杂度，换来 master 故障期间写仍然可用——附带诚实的提醒：持久但不可读是一种真实状态，客户端必须处理它。
4. **每个分片一个全序，胜过一个你负担不起的全局顺序。** 每个分片一个 master 是个局限，但它买来了分区日志，分区日志买来了无损触发器——一个不用单独运维的事件总线。顺序保证应该限定在能交付功能的最小单元上。
5. **索引必须分片，否则就是伪装成索引的 scatter-gather。** 一个要扇出到每个分片的索引在规模上不是索引，是带额外步骤的全表扫描。指定 shard field、把数据反规范化进索引、审计每条查询是否带了这个字段——因为没带的那条会花掉 4,096 次子查询。

Schemaless 真正的教训不是"自己造数据库"。而是数据存储是一捆承诺——线性容量、写可用性、无损通知、索引查找、可运维性——艺术在于决定每个机制守住哪条承诺、打断哪条失效回路、为这份工作收多少钱。Uber 留住了 MySQL，用四个机制和十年的运维买下了其余部分。收据——存储账单和后继系统——是设计的一部分。

## Sources

- Uber Engineering, "Designing Schemaless, Uber Engineering's Scalable Datastore Using MySQL"（三部曲之一）。https://www.uber.com/ng/en/blog/schemaless-part-one-mysql-datastore/ ——2014 年初 Postgres 容量危机；五条需求；Cassandra、Riak、MongoDB 的评估与拒绝；运维信任是决定因素；FriendFeed 启发的设计与 Pinterest 启发的运维专注；cell 数据模型（行键 UUID、列名、ref key）、不可变性，以及 Mezzanine 行程的 BASE、STATUS、NOTES、FARE ADJUSTMENT 四列；触发器与分片式、反规范化的二级索引。
- Uber Engineering, "The Architecture of Schemaless, Uber Engineering's Trip Datastore Using MySQL"（之二）。https://www.uber.com/mx/en/blog/schemaless-part-two-architecture/ ——worker 与存储节点；4,096 个分片；每集群一个 master 加两个 minion、跨数据中心；任意节点可读、master 写、亚秒级复制；断路器；缓冲写（先 secondary 后 primary、两者都成功才算成功、后台回放、幂等性）；实体表自增 added_id、复合索引、MessagePack 加 ZLib 压缩的 body。
- Uber Engineering, "Using Triggers On Schemaless, Uber Engineering's Datastore Using MySQL"（之三）。https://www.uber.com/kr/en/blog/schemaless-part-three-datastore-triggers/ ——触发器是行程处理引擎；bill_rider 例子与至少一次、幂等的处理函数；Schemaless 作为分区日志；get_cells_for_shard 与 added_id 偏移；分片归属、leader 分配、ZooKeeper 持久化偏移；毒 cell 隔离与停止阈值；最多 4,096 个触发器 worker。
- Uber Engineering, "Evolving Schemaless into a Distributed SQL Database." https://www.uber.com/us/en/blog/schemaless-sql-database/?uclick_id=37e0581b-5432-40df-b0a8-4b055bb80aa7 ——Docstore 作为事务型后继者：分区内严格可串行化、事务、物化视图、关联与变更数据捕获，引擎仍是 MySQL。
- Uber Engineering, "Jellyfish: Cost-Effective Data Tiering for Uber's Largest Storage System." https://www.uber.com/au/en/blog/jellyfish-cost-effective-data-tiering/ ——新用例合并到 Docstore 的同时，Schemaless 仍是既有流水线的 source of truth；每批 100 个 cell、ZSTD level 7，最高省 40% 存储。
