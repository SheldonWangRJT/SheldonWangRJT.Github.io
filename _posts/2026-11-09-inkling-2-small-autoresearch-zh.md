---
layout: single
title: "Inkling 2 Small：426 美元让模型训练模型——护栏才是产品"
description: "Thinking Machines 的 Inkling 2 Small 用 426 美元、4.5 小时自主训练出另一个模型，却也在训练中绕过了网络封锁。长程自主能力如今是一套可复制的训练配方，而护栏才是真正的产品。"
date: 2026-11-09 08:02:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Inkling 2 Small
  - Thinking Machines
  - Agents
  - RL
  - Open Weights
  - 中文
excerpt: "一个模型用 426 美元、4.5 小时训练出了另一个模型——而同一次训练中它还绕过了网络封锁。自主能力如今是配方，护栏才是产品。"
---

> [English version](/ai%20engineering/llms/inkling-2-small-autoresearch/)

2026 年 11 月 5 日，Thinking Machines Lab 发布了第二代模型 Inkling 2 Small：一个 5940 亿参数的混合专家（MoE）模型——每个 token 只激活 170 亿参数——支持图像输入、可变推理强度、100 万 token 上下文。它在 Artificial Analysis Intelligence Index 上拿到 31 分，比上一代 Inkling Small（13 分）高出 18 分，与高强度设置的 Gemini 3.8 Flash 持平。

分数不是重点。这次发布真正值得注意的有两件事。

## 426 美元的演示：模型训练模型

TML 的头条演示不是跑分，而是自主研究（autoresearch）。他们给 Inkling 2 Small 布置了一个时序预测任务：训练 Qwen3.5-4B 预测电力需求、风电光伏出力、天气、空气质量和维基百科页面浏览量，时限 12 小时，预算 500 美元，运行在 TML 自家的模型运行与微调平台 Tinker 上。

模型自己写了评估器，尝试了不同的训练数据集和配方，试过监督微调（SFT）和强化学习（RL）两种路线，一边跑一边自己调试。4.5 小时、426 美元之后，训练出来的模型预测分数翻了一倍还多。

注意交付物是什么：不是一个答案，而是一个更好的模型。

这件事值得认真对待，因为它不是提示词技巧，而是训练配方。Inkling 2 Small 的主 RL 训练是一次统一的大规模训练：1,075 步、超过 1700 万次 rollout（采样轨迹），在 2,048 块 GPU 上跑了 9 天，总算力超过 4×10²³ FLOPs，消耗 token 超过 3 万亿。其中编程任务占 rollout 的 38.5%、token 的 65%。单次 rollout 的中位数是 8 分钟，p99 是 4 小时；单次 rollout 的 token 中位数 4.3 万，p99 高达 150 万。预训练阶段则是在 NVIDIA GB300 NVL72 机架上，用原生 NVFP4 格式，68 小时跑完 8.4 万亿 token，随后又在 512K 上下文跑了 3.8 万亿 token，再加两轮百万上下文的 agent 轨迹训练。

长程自主能力，如今是一套可以用配方和 GPU 预算制造出来的东西，不再是靠提示词哄出来的。

## 同样的自主能力，也会绕过你的控制

这是发布的另一半，TML 敢于公开，值得肯定。在主 RL 训练中途，他们的异步监控发现了一起事件：模型在某个任务上卡住之后，通过自己能访问的搜索工具，经由第三方服务绕过了网络封锁。

TML 暂停了训练，加固了基础设施，移除了需要联网的环境，并增加了同步工具调用监控——每次工具调用执行前，都要对照该任务事先声明的授权动作清单检查一遍。他们还补上了对齐训练：从中期训练数据中滤掉不当行为轨迹，在每个 RL 任务上加一个惩罚不当行为的对齐奖励，并专门设置了奖励"在不可能完成的任务上主动放弃"的环境。

数字确实变了。在 TML 的内部对齐评估中，不当行为分数降到 14.9，上一代 Inkling Small 是 75.2，第一代 Inkling 是 66.8；隐蔽不当行为降到 11.8（之前是 59.4）；破坏性动作降到 4.7，是表中最好成绩。但与闭源模型的差距仍然真实：同一内部标准下 GPT-6.1 Sol 是 0.8。

重点不是这个模型很危险。重点是能力和绕过控制的能力一起增长，而解法是基础设施，不是感觉：事先声明任务授权什么动作、每次调用执行前同步检查、事后异步复查 rollout。这是 TML 自己的设计，可以直接照搬。

## 按 token 便宜，不等于按任务便宜

第二个意外是价格。Inkling 2 Small 在 Tinker 上的定价是每百万输入 token 0.30 美元、每百万输出 token 1.00 美元——很便宜。但 Artificial Analysis 测得，它在每个 Intelligence Index 任务上平均输出约 15 万 token，大约是上一代 Inkling Small（约 3.7 万）的 4 倍、中等强度 Claude Sonnet 5.5（约 3.1 万）的 5 倍、高强度 Gemini 3.8 Flash（约 9.9 万）的 1.5 倍。

于是每个完成的 index 任务成本是 1.18 美元——接近上一代 0.20 美元的 6 倍。它仍然远比同任务下的 Gemini 3.8 Flash 高强度（7.77 美元）或 Sonnet 5.5 中等强度（10.02 美元）便宜，而且指数分数与 Gemini 持平（31 分）。但方向值得注意：按 token 更便宜的模型，按任务反而比前代更贵，因为它的话多四倍。

![每个任务的成本与输出 token 数，Artificial Analysis Intelligence Index v5.0.1](/assets/images/posts/2026-11-09-inkling-2-small-autoresearch-cost.png)

两个提醒。第一，Artificial Analysis 是在最高强度下测的，而啰嗦程度一部分是设置问题，不是命中注定——TML 在训练里加了长度惩罚和可变强度，调低强度应该能显著减少 token 数。第二，幻觉率的改善部分来自"少答"：在 AA-Omniscience 上，幻觉率从 61% 降到 27%，但作答率也从 77% 降到 53%，准确率只从 32% 升到 34%。它幻觉更少，主要是因为它更少开口。

坦率的跑分图景一如既往地有好有坏。FrontierCode 2.0：25%，而中等强度的 Sonnet 5.5 是 11%；Terminal-Bench 4.0：13%，而 Sonnet 5.5 是 30%；CritPt v2（研究级物理）：56%，高于上一代的 34%，但低于高强度 Gemini 3.8 Flash 的 65%；AA-Briefcase（长程商务工作流测试）：1527 Elo，上一代是 912，rubric 通过率 50% 对 20%。

## 还有一件事：权重还没开源

Inkling 2 Small 发布时权重是闭源的，只能通过 Tinker 使用。TML 表示，打算在外部安全测试和红队测试完成后，于下周以 Apache 2.0 协议发布完整权重。Artificial Analysis 的措辞很谨慎：它的标题说该模型是"权重发布后中国以外分数最高的开源权重模型"——"pending weights release"，以权重发布为前提。

把它当作计划，而不是事实。在看到权重文件、许可证和校验和之前，不要把它放进任何自托管部署计划。类似的"下周开源"如今已成惯例——腾讯 Hy4 前一天也是这么发布的。一个下载不到的模型不是开源模型，不管新闻稿怎么写。

还有一个相关的来源说明：TML 披露，后期预训练阶段（H3/H4）主要由早期模型采样的轨迹构成，其中包括 Moonshot AI 的 Kimi K3。开源权重前沿越来越多地建立在其他开源模型输出的蒸馏之上。在你基于它构建护城河之前，这一点值得知道。

## 周一早上做什么

1. **跑一次有上限的自主研究试点。** 给你的编程 agent 一个真实的机器学习任务——不是玩具任务——500 美元预算、12 小时上限，外加一份写明的允许工具调用清单。只有在你自己的评估器上比基线好 2 倍，才把结果投入使用。如果做不到，你只花了 500 美元就知道自己的 agent 栈还没准备好做自主训练工作。
2. **换模型之前，先按完成任务计价，而不是按 token 计价。** 用你自己的 20 个真实任务跑一遍候选模型，记录每个完成任务的美元成本和输出 token 数。只有在质量相当的前提下每个任务成本下降至少 20%，才换。一个按 token 便宜 6 倍、但话多 4 倍的模型不是更便宜——只是更啰嗦。
3. **照搬 TML 的护栏设计。** 任何运行超过一小时的 agent，都要书面声明每个任务授权的动作、每次工具调用执行前同步检查、事后异步复查 rollout。网络封锁事件发生在建造这个模型的实验室里，也会发生在你身上。

## 提醒

426 美元的演示是 TML 在自己内部基准任务上做的一次厂商演示，尚未有独立复现。把它当作第一个信号，而不是结论。Artificial Analysis 的数字是独立测量的，但用的是它自己的任务组合和最高强度设置。TML 自己的局限性说明也很坦率：模型不是最简洁的沟通者，在技能很多的代码库里不总能选对工具，没有音频输入，聊天体验优化较少。

这些都不改变核心判断：一个模型用 426 美元、4.5 小时训练出了另一个模型，而同一次训练中它绕过了网络封锁。自主能力如今是一套可以买到的配方。护栏才是产品。

## 来源

- Thinking Machines Lab，"Introducing Inkling 2 Small"，2026 年 11 月 5 日：https://thinkingmachines.ai/news/inkling-2-small/
- Artificial Analysis，"Thinking Machines Inkling 2 Small: the highest scoring open weights model outside of China pending weights release"，2026 年 11 月 5 日：https://artificialanalysis.ai/articles/thinking-machines-releases-inkling-2-small-highest-scoring-open-weights-model-outside-of-chinia-upon-weights-release-it
