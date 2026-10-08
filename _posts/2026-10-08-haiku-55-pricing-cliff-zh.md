---
layout: single
title: "Haiku 5.5：0.10 美元的模型，和一道 5 倍价格悬崖"
description: "Claude Haiku 5.5 在 OSWorld 上跳到 72.4%，100K tokens 以内牌价降 90%——但超过 100K，整单按 5 倍重定价。"
date: 2026-10-08 07:15:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Claude
  - LLM Economics
  - Computer Use
  - 中文
excerpt: "Haiku 5.5 在 100K tokens 以内是真实的能力跃升，价格只有旧款十分之一；超过这条线，定价是悬崖，不是曲线。"
---

> [English version](/ai%20engineering/llms/haiku-55-pricing-cliff/)

![Claude Haiku 5.5 输入价格与 OSWorld 2.1 分数](/assets/images/posts/2026-10-09-haiku-55-pricing-cliff-chart.png)

*以下价格为 2026 年 10 月 8 日查询的牌价快照（snapshot），后续可能变动（subject to change）。*

先给肯定：这不是给同一个模型打折。

## 跃升是真的

Anthropic 于 2026 年 10 月 7 日发布 Claude Haiku 5.5（模型名 `claude-haiku-5-5`），在 Claude Platform、AWS、Google Cloud 与 Microsoft Azure / Foundry 上线。官方报告的 benchmark：

- OSWorld 2.1（offline 子集，computer use）：**72.4%**，Haiku 4.5 只有 15.7%，也高于 GPT-6 Luna 的 48.9%。
- Humanity's Last Exam：无工具 45.9%、有工具 57.4%，Haiku 4.5 为 10.2% / 18.7%。
- Terminal-Bench 4.0（agentic coding）：39.2%，Haiku 4.5 是 0.0%。

它还是第一个带 effort 档位的 Haiku，定位是配合 Sonnet 5.5 / Opus 5.5 做编程 subagent，外加摘要、抽取、分类和实时客服。这些是厂商数字、harness 各不相同，但 OSWorld 4.6 倍的跳升不是噪声级别的波动。

一个弱项点到为止：Artificial Analysis 报告它在 AutomationBench-AA 上只有 35%，GPT-6 Luna、Gemini 3.8 Flash、GLM-5.3 Flash 约 53–60%；部分原因被归于发布前的过度拒绝（over-refusal），Anthropic 称正在修复。自动化重度场景，先等复测。

## 机制：是悬崖，不是曲线

Prompt 在 100,000 tokens 以内时，Haiku 5.5 牌价为每百万 tokens 输入 $0.10 / 输出 $0.50，cache read $0.01；Haiku 4.5 是 $1.00 / $5.00。这是牌价直降 90%。

超过 100,000 tokens，所有费率变 5 倍：$0.50 / $2.50，cache read $0.05。

这不是累进档位。档位按单次请求判定，并适用于整单——包括 output。99,999 tokens 和 100,001 tokens 的 prompt 工作量几乎一样，价格差 5 倍。Anthropic 称 Haiku 4.5 约 90% 的请求落在便宜档内，这也是为什么 headline 平均降幅“只有”约 75%。

Headline 下面还藏着两个乘数：

- 新 tokenizer（与 Sonnet 5.5 / Opus 5.5 同款）对同一段文本约多算 30% tokens。Prompt 没变，token 数先变了。
- Effort 现在是成本旋钮。Artificial Analysis 测到 Max effort 下 Haiku 5.5 每个 Intelligence Index 任务约用 162,000 个 output tokens，约为 GPT-6 Luna（约 50,000）的 3 倍。与 Luna 同为每 token 同价，effort 拉满时每任务账单完全不同。

这些不否定这次发布，只改变你该量的东西：在固定 effort 下量每个完成任务的成本，并盯 p95 prompt 大小——而不是只看每 token 牌价。

## 同场两个容易被低估的更新

- Sonnet 5.5 cache read 砍半：$0.20 → $0.10 / MTok。Anthropic 估计大多数 agentic 工作因此约便宜 20%，因为这类负载里缓存上下文占大头。
- 付费计划的每月 API credits 本周开始发放：Max 5x $100/月、Max 20x $200/月、Team 最高 $500 团队共享。

迁移注意（来自 Anthropic 官方邮件）：Xhigh 与 Max effort 下 thinking 关不掉、不支持手动 thinking budget；2026 年 8 月 31 日及之后创建的 API 账号，必须在同一对话内原样回传 thinking blocks。换模型名只是第一步，还要过一遍 prompt 与设置。

## 周一怎么做

审计你量最大的 3 个调用：

1. p95 prompt 小于 90K tokens：在真实负载上以 low effort 试跑 Haiku 5.5，记录每个完成任务的成本。
2. p95 接近 100K：先拆分或压缩上下文——跨过悬崖一次，那单的节省就没了。
3. 与现用模型比的是同等任务成功率下的成本，不是同等 token 数。

## 留给大家的问题

小模型的定价到底应不应该有悬崖——还是说 5 倍跳档只是对上下文写得潦草的一种税？

我的倾向：悬崖可以接受，前提是像这次一样足够清晰。100K 是个整数、可审计的阈值，而且 90% 的真实流量本来就在它以内。我不能接受的是在账单上才发现它。

## 来源

- Anthropic 发布邮件，2026 年 10 月 7 日：定价、effort 档位、thinking 与 preserved thinking 迁移说明、Sonnet 5.5 cache 降价、Max / Team API credits。
- Reuters，2026 年 10 月 7 日，Haiku 5.5 发布与定价档位：https://www.reuters.com/business/anthropic-launches-third-claude-55-model-expanding-ai-lineup-before-planned-ipo-2026-10-07/
- Unite.AI，2026 年 10 月 7 日，定价表、cache 费率、与 Sonnet 5.5 对比、benchmark 表：https://www.unite.ai/anthropic-releases-claude-haiku-5-5-cutting-small-model-api-prices/
- Dev.to（importstatic），2026 年 10 月 8 日，100,001 tokens 起整单 5 倍重定价：http://dev.to/importstatic/claude-haiku-55-pricing-jumps-fivefold-at-100001-prompt-tokens-53ok
- Implicator.AI，2026 年 10 月 8 日，Artificial Analysis 的 token 用量（约 162K vs 50K）与 AutomationBench-AA（35%）：https://www.implicator.ai/claude-haiku-5-5-matches-gpt-6-luna-pricing/
- AI Weekly，2026 年 10 月 8 日，发布摘要：https://aiweekly.co/alerts/anthropic-cuts-claude-haiku-55-price-75-below-haiku-45
