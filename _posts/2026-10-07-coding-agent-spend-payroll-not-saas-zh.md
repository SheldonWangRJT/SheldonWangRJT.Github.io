---
layout: single
title: "编程 Agent 的账，要按人力成本算，而不是 SaaS"
description: "据报道 Meta 的 Claude Code 用户减半、微软将 Anthropic 预期支出削减三分之一——这是成本经济学，不是质量判决。"
date: 2026-10-07 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Coding Agents
  - Enterprise AI
  - LLM Economics
  - 中文
excerpt: "在超大规模下，编程 Agent 的支出更像人力成本而不是 SaaS——内部替代是控成本，不是质量判决。"
---

> [English version](/ai%20engineering/llms/coding-agent-spend-payroll-not-saas/)

![据报道的 Meta Claude Code 用户数与 Ramp 2026 年 7 月付费采用率](/assets/images/posts/2026-10-07-coding-agent-spend-payroll-not-saas-chart.png)

先说结论的前提：Anthropic 仍然领先企业付费采用率。

Ramp AI Index 的 2026 年 7 月数据（8 月 12 日发布）显示，Ramp 追踪的美国企业中，43.5% 付费使用 Anthropic，OpenAI 为 39.7%。Ramp 只对应这个数字，而且这是 7 月数据，不是实时份额。

在这个领先背景下，本周两个据报道的动作看起来很戏剧化，但更合理的读法是经济学。

## 据报道发生了什么

PYMNTS 于 2026 年 10 月 5 日转述 The Information 的报道称：

- 据报道，Meta 使用 Claude Code 的员工从今年早些时候的约 60,000 人降至约 30,000 人，原因是 Meta 推动自研的 Muse Code 与 MetaCode。Meta 未在 The Information 的报道中置评，也未立即回复 PYMNTS。
- 据报道，微软今年内部使用 Anthropic 技术的支出原本有望达到约 10 亿美元，现已将该预期削减三分之一。微软发言人确认正引导员工使用 GitHub Copilot，同时表示工程师仍可选择其他模型。

两个提醒很重要。第一，这是报道而非审计数据——The Information 原文有付费墙，这里采用的是 PYMNTS 转述层级。第二，对该报道的二手汇总指出，Meta 用户下降的一部分据报道来自春季约 10% 的裁员，并非纯粹的工具替代；该汇总还称 MetaCode 内部用户超过 30,000、Muse Code 超过 6,000。这些数字属于二手信息。即便加上这个提醒，方向仍然清楚：部分是替代，部分是人数变化，部分是控成本。

聚合网站流传的两个数字——28 天 1.05 亿美元支出、每人每月上限从 10 万美元降到 1 万美元——本文不采用，因为它们没有出现在 PYMNTS 原文中。

## 为什么这是人力成本经济学

工程师只有几百人时，编程 Agent 是一笔 SaaS 支出；到了几万人规模，它的行为更像人力成本：

- 成本随人数和使用强度放大，不只是席位费。
- 用量很难预测。《华尔街日报》报道的一项约 400 家企业研究发现，只有 11% 能准确预测 AI 支出。这个 11% 来自该研究，不是 Ramp。
- 每 token 更便宜，不等于每个任务更便宜。WSJ 同篇报道（经 PYMNTS 转述）提到，斯坦福、CMU、UC Berkeley 与 Microsoft Research 在 6,800 多个任务上的测试发现，在 32% 的场景里，便宜模型因为多走步骤，最终反而比贵模型更贵。

最后一点是双向的：它既说明贵的旗舰工具不必然是浪费，也说明财务不能只按 token 单价批预算。

因此，当超大厂做出一个对大多数 PR 已足够好的内部工具时，替代首先是控成本动作，本身不是对被替代外部工具的质量判决。

## 周一怎么做

如果外部编程 Agent 的账单超过每位工程师每月 200 美元，在下次续约前，用内部（或更便宜的）工具在 20 个真实 PR 上做 A/B。量的是每个合并 PR 的成本——token、重试和评审时间——而不是每 token 价格。难任务保留旗舰工具，尤其是便宜工具会失败或打转的那些 PR。

这个阈值对某些团队会不准，但纪律本身才是重点：一个工作负载、一次正面对比、一个由自家 PR 数据支撑的续约决定。

## 留给大家的问题

当内部工具达到最佳外部工具 80% 的水平时，你会强制使用它，还是继续为最后 20% 付费？

我的倾向：默认强制，保留付费逃生通道管难任务。默认项控成本，逃生通道在真正影响合并代码质量的地方保质量。

## 来源

- PYMNTS，2026 年 10 月 5 日，微软与 Meta 引导员工转向自研工具：https://www.pymnts.com/news/artificial-intelligence/2026/microsoft-meta-steer-staff-from-anthropic-claude-in-house-ai/
- PYMNTS，2026 年 10 月 5 日，转述 WSJ 的预测难度与 6,800+ 任务研究：https://www.pymnts.com/news/artificial-intelligence/2026/businesses-finding-it-harder-to-predict-ai-spending/
- WSJ，2026 年 10 月 5 日，AI 支出预测（近 400 家企业中 11%；6,800+ 任务中 32%）：https://www.wsj.com/tech/personal-tech/ai-token-spending-businesses-431ee94a
- Ramp AI Index 2026 年 7 月数据（Anthropic 43.5%、OpenAI 39.7%），8 月 12 日发布：https://www.unite.ai/openai-closes-on-anthropic-in-ramps-business-spending-data/
