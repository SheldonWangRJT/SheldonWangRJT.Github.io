---
title: 'Switch 2 真能跑 GTA VI 吗？传闻、参数，和那个 30 帧的问题'
description: 'Double Eleven 的一则招聘启事本周让全网陷入 GTA VI 登陆 Switch 2 的狂热——但启事从未点名任何游戏，它的姊妹岗位描述的还是一款重制版。什么是确证的（11 月 19 日发售、只上 PS5/Xbox），参数怎么说（内存比 Series S 还多、DLSS，以及一个超分救不了的 CPU 问题），以及为什么聪明钱认为这个移植故事的关键在 Rockstar，不在硬件。'
date: 2026-10-21
permalink: /life/gta-6-switch-2-port-zh/
tags:
  - Gaming
  - GTA VI
  - Nintendo Switch 2
  - Rockstar
excerpt: '整个 GTA VI 上 Switch 2 的故事，只靠招聘启事里一句通用加分项：有任天堂经验者优先。狂热之下是一个真实的技术争论——而答案系在一个没人吵的数字上：30。GTA VI 在 PS5 上已经锁死 30 帧了，这意味着移植的惯用伎俩已经被提前花掉。'
---

> [English version](/life/gta-6-switch-2-port/)

*先立传闻纪律：GTA VI 的 Switch 2 版本从未被 Rockstar、Take-Two、任天堂或任何人宣布过。下文各节标注了什么是确证、什么是报道、什么是纯粹的传闻，截至 2026 年 10 月 21 日。*

## 火星：一则招聘启事里的一行字

本周讨论度最高的游戏传闻始于 9 月 3 日：英国工作室 **Double Eleven** 发布了一个**首席底层图形程序员**岗位，为"下一代自研图形引擎"工作，涉及 GPU 驱动渲染与硬件光线追踪——要求里写着 **"有 Nintendo Switch 与 Switch 2 经验者加分"**。这则启事 10 月 21 日经 X 帖子和 GoNintendo 浮出水面，几小时内报道口径就收敛成同一个解读：Double Eleven 把《荒野大镖客》移植到了 Switch（其带 60 帧与 DLSS 的 Switch 2 版本去年 12 月刚发），Double Eleven 与 Rockstar 有合作，所以 Double Eleven 正在把 GTA VI 移植到 Switch 2。

但读读这家工作室*另一则*在招岗位，故事就晃了。它的 Lead Programmer 岗位是为 **"一款深受喜爱的作品的完整美术重制"**——这句话放在一个目录型项目上（长期传闻中的 RDR2 移植是显而易见的候选）至少和放在一款业界最保密的新作首发移植上一样贴切。两则启事都没点名 GTA VI、Rockstar 或任何游戏。Tech-Insider 的总结是最诚实的那个："一家有真实任天堂移植履历的工作室，发了个带一句通用加分项的招聘，剩下的都是游戏互联网自己补完的。"

各当事方的行为，无论移植存不存在都会是这个样子。Rockstar 与 Take-Two：无可奉告。Double Eleven：无可奉告。任天堂美国总裁 Devon Pritchard 被 Variety 问到时说："这将是 Take-Two 和 Rockstar 之间的对话。"剩下的线索链是爆料人（NateTheHate 2025 年 11 月说 Rockstar 做过内部硬件测试——那种发行商常做、并不意味着立项的测试；Nash Weedle 二手转述的"正在努力促成"）和一份法国零售商泄露的 PDF——一种错误记录很长的文件类型。

所以：传闻作为传闻是真的。它底下那个问题——Switch 2 *到底能不能*跑这款游戏——才有货真价实的技术答案，而且干净地裂成两半。

## 确证的背景：娱乐史上最大的发售

不是猜测的部分：**GTA VI 于 2026 年 11 月 19 日发售，只登陆 PS5 与 Xbox Series X|S**，标准版 **79.99 美元**（终极版 99.99 美元），从最初的 2025 年目标两度延期。Take-Two 的 FY2027 指引——净预订额 80–82 亿美元——建立在这款游戏约四个半月的销量上，而且只在两个平台。DFC Intelligence 预测**首年约 4,000 万份、约 32 亿美元**。预告片 2 在 24 小时内拿下 **4.75 亿次播放**。它的前作 GTA V 已卖出 **2.3 亿份**，上市十三年后每个季度还在卖约 500 万份。Zelnick 称预购"非同寻常"。这就是让第三个平台值得幻想的语境——也值得认真分析，因为装机量已经摆在那里：Switch 2 首个财年出货 **1,986 万台**（任天堂史上最快的首年），到 2026 年 6 月 30 日累计 **2,368 万台**。

## 参数：比你以为的接近，除了在最要命的地方

| | Switch 2 | Xbox Series S | PS5 |
| --- | --- | --- | --- |
| CPU | 8 核 ARM Cortex-A78C @ 约 1.0 GHz | 8 核 Zen 2 @ 3.6 GHz | 8 核 Zen 2 @ 3.5 GHz |
| GPU | 3.07 TFLOPS（底座）/ 1.71（掌机） | 4.0 TFLOPS | 10.28 TFLOPS |
| 内存 | **12 GB** | 10 GB | 16 GB |
| 超分 | **DLSS（硬件）** | FSR 类软件方案 | 软件方案 / PSSR（Pro） |
| 存储 | 256 GB；游戏卡最大 **64 GB**且比 SSD 慢 | 512 GB NVMe | 825 GB NVMe |

**支持方**的论证从一个真实锚点出发：Series S 是确证的 GTA VI 平台，而在移植通常死掉的两条轴上，Switch 2 与它持平或更好。它的**内存比 Series S 多**。它的 GPU 差距"很小"——这是 Virtuos 技术总监 Eoin O'Grady 的原话（他们家做了多款旗舰 Switch 2 移植），因为 Series S 没有能对位 **DLSS** 的东西："这让两台机器的 GPU 能力总体上相当。"而且首年阵容已经把打法跑通了：《星球大战：亡命之徒》（SSD 时代、带光追的开放世界）和《赛博朋克 2077》都交出了可信的 Switch 2 版本。如果你心里的模型是"本世代游戏砍一刀就能移植到 Switch 2"，证据在你这边。

**反对方**说 GTA VI 不是一款普通的本世代游戏，具体在一个点上：**它已经是 30 帧了**。Digital Foundry 数完了 Rockstar"加长版实机"素材的全部 48,242 帧，结论是内部约 1440p 渲染、在 PS5 级硬件上**按设计锁死 30 帧**（目标"早期就已定死"），带光线追踪全局光照和这个媒介产出过的最密集的人群与世界模拟。你记忆中的每一次 Switch"奇迹移植"，都是靠花帧率预算实现的：把一款 60 帧游戏砍到 30 帧，把差额装进口袋。这个预算已经被花掉了。而定义 GTA VI 的工作负载——NPC 日常、交通、一座活城市的模拟——跑在 CPU 上，Switch 2 那几颗约 1 GHz 的 ARM 核心在那里不是"略逊"于 Series S，而是*代差级*落后，DLSS 是 GPU 技术，对此无能为力。ResetEra 上一句被传成怀疑派口号的话是这么说的：以它现在的状态，这款游戏"在任何分辨率、任何帧率下"都跑不起来——因为分辨率和帧率根本不是约束所在。存储再补一刀：安装体积估计 120–200 GB，而 Switch 2 游戏卡上限 64 GB，且按育碧自家《亡命之徒》音频架构师的话，卡带速度连开放世界串流都不够。

注意两方论证的共同点：它们其实都在争 GTA VI 的身份有多少是可以商量的。把人群密度、模拟深度和串流速度砍够，*某种*叫 GTA VI 的东西能在 Switch 2 上跑起来——问题是 Rockstar，那家因为"规模"和完美主义把这款游戏延期了两次的工作室（彭博的制作特辑记了发行主管 Jennifer Kolbe 两次打给 Zelnick 的那种电话），是否会让自己的名字印在那个"某种东西"上。

## 商业论证站在移植的对面——而且来自 Rockstar 自己人

最有意思的怀疑者不是参数表。**Jérémy Hartvick**，前 Rockstar 开放世界设计师、亲自参与过 GTA VI（2017–2020），上个月对 Kiwi Talkz 说移植"说不通"——而他的论证几乎与硬件无关。他的说法是：GTA 粉丝会去买 GTA 登陆的那台主机；Switch 的受众不是 GTA 边际买家所在的地方；为一点增量覆盖去冒品牌受损的风险不值得。这与历史押韵：**GTA V，史上销量第三的游戏，从未登陆过 Switch 1**——Rockstar 送去的是三部曲和 RDR；而就在今年，Take-Two 选择把《无主之地 4》（Gearbox）移植到 Switch 2，却没给 GTA VI 同等待遇。Zelnick 的公开口径仍是 2025 年 2 月那句通用版：Take-Two 会在"合情理时"支持 Switch 2。

反击是算术：2,368 万台且在增长的 Switch 2 是业界增长最快的装机量，便携游玩是一个与客厅主机真正不同的使用场景（没人会同时买 PS5 和 Xbox 来双持，但掌机是增量），而一家已经在 RDR 的 Switch 2 版上证明过自己的工作室存在着、且正在招图形程序员。如果移植终有一天发生，先例的时间线说了它会以 Rockstar 的方式发生：晚好几年、全价、按 Rockstar 的日程——就像 RDR 在首发十五年后才来到 Switch 那样。

## 裁决

- **确证：** GTA VI，11 月 19 日，PS5 与 Xbox Series X|S，79.99 美元。其余皆无。
- **传闻：** 关于 Switch 2 的一切，靠的是一则套在 RDR2 重制版上和套在 GTA VI 上一样合身的招聘启事。
- **可行性，诚实地讲：** GPU——靠 DLSS 和削减，大概行。CPU 与模拟——那堵墙在这儿，目前没有任何人公布过可信的翻墙路线。存储——第二堵墙。
- **可能性：** 首发窗口移植近乎不可想象；世代晚期的"不可能移植"倒是这个行业真会产出的东西——但前提是 Rockstar 认定那个被削过的版本仍是*它的*游戏。

Double Eleven 那则启事大概率是关于一款重制版的。但它点燃的争论，才是 Switch 2 第一年的真正故事：这台机器已经跑通过足够多的"不可能"游戏，问题不再是任天堂的硬件配不配进入本世代的对话。它配。GTA VI 只是那款被刻意——以每秒 30 帧的方式——造成例外的游戏。

---

**来源：** [Tech-Insider — Double Eleven 启事与传闻解剖](https://tech-insider.org/gta-6-switch-2-port-rumors-job-listing-2026/) · [Digital Foundry — 加长版素材逐帧分析（经 GameSpot/WikiGTA VI 报道）](https://www.gamespot.com) · [Wccftech — Virtuos 的 Eoin O'Grady 谈 Switch 2 对 Series S](https://wccftech.com) · [Notebookcheck — 参数对比与 Cdiscount 列表](https://www.notebookcheck.net) · [GameSpot — GTA VI 延期史与彭博制作特辑摘要](https://www.gamespot.com) · [Take-Two FY2027 指引（SEC 文件，2026 年 5 月 21 日）](https://www.take2games.com) · [Variety — Devon Pritchard 访谈（2026 年 10 月）](https://variety.com) · [Kiwi Talkz — Jérémy Hartvick 访谈（2026 年 9 月）](https://www.youtube.com/@KiwiTalkz)
