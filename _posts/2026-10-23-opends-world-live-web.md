---
layout: single
title: "The Best Research Agent Scores 39% on the Live Web — and Beats Humans Anyway"
description: "OpenDS-World tests 12 frontier models on 200 live-web research tasks: GPT-6 Astra leads at 39.0% vs a 21.1% human per-attempt baseline, and more browsing turns out not to be more research."
date: 2026-10-23 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Agents
  - Benchmarks
  - Deep Search
  - Evaluation
excerpt: "On the live, unmodified web, the best agent gets 39.0% — nearly double the human per-attempt score, and still wrong 61% of the time. The bottleneck is not search volume."
---

> [中文版 Chinese version](/ai%20engineering/llms/opends-world-live-web-zh/)

Most web-search benchmarks run on frozen snapshots. That makes them reproducible — and permanently open to the objection that the answers were in the training data. A paper submitted to arXiv on October 19, 2026 — *Deep Search in Real-World Web Environments* (arXiv:2610.30181), from a 25-author team led by HKUST(GZ) — removes the snapshot entirely. Its benchmark, OpenDS-World, sends agents onto the live, unmodified open web.

![OpenDS-World overall accuracy](/assets/images/posts/2026-10-23-opends-world-live-web-chart.png)

## The setup

OpenDS-World contains 200 tasks across eight domains (culture, daily life, science, economy, history, nature, society, technology). Each task starts from a video containing real-world information and requires the agent to discover evidence across multiple independent sources — spanning text, images, audio and video; HTML, PDF, XML and Parquet formats; and seven types of interactive access requirements — and converge on a unique factual answer. Independent human verification was used to check evidence validity and answer uniqueness. Twelve frontier models were evaluated under one unified tool environment and execution protocol, with a one-hour time limit and a 100-call tool-use limit per task.

## The headline numbers

- GPT-6 Astra leads at **39.0%** (78 of 200 tasks), followed by Claude Opus 5.5 at 38.0%, Gemini 3.8 Flash at 36.5% and Claude Fable 5.1 at 33.5%.
- GPT-5.6 Sol scores 28.0% and Qwen3.8-Max 25.5%; the remaining models are at 23.5% or below.
- Human participants, measured across **1,000 independent attempts**, score **21.1%** per attempt — and 42.5% of tasks were solved by none of the humans assigned to them.
- Even the best model fails 122 of 200 tasks: a 61.0% failure rate.

Credit where due: the live-web design is the right call, the unified harness removes the usual "different tools, different score" confound, and a per-attempt human baseline is more honest than the hand-picked expert baselines most benchmarks use. Beating that baseline by 17.9 points is a real result.

It is also a result that needs its caveats attached. These tasks were constructed to be hard — 42.5% defeated every human who tried them — so "agents beat humans" here means "agents beat individual humans, per attempt, on adversarially difficult research puzzles," not "agents out-research your analyst." And a live-web benchmark is non-stationary by design: pages change, links rot, and the same run next month is not measuring quite the same test. That is the price of killing the contamination objection, and it is worth paying — but the scores should be read as a dated snapshot, not a permanent ranking.

## More browsing is not more research

The paper's most useful finding is negative. Resource consumption does not buy accuracy:

- Gemini 3.8 Flash consumes roughly **5.22× the tokens** of GPT-6 Astra and scores *lower* (36.5% vs 39.0%).
- GPT-6 Astra and GPT-5.6 Sol consume nearly identical total tokens, yet their accuracies differ by **11.0 percentage points** (39.0% vs 28.0%).
- GPT-6 Astra averages 51.05 tool calls and 18.66 minutes per task; Qwen3.8-Flash averages 89.94 calls per task and reaches the tool-call limit on 80.0% of tasks, terminating naturally on only 6.5%.

Accuracy also collapses with difficulty. Averaged across the 12 models, accuracy falls from 39.66% on Low tasks to 23.50% on Medium and 16.76% on High. GPT-6 Astra drops from 59.26% (Low) to 24.71% (High).

## The hidden tax: failed tool calls

Failed calls are rare but ruinously expensive. Across models they account for only **2.83%–9.42% of recorded calls but 19.27%–61.90% of recorded tool execution time**. For GPT-6 Astra specifically: 6.34% of calls, 42.57% of tool time. The best models' most common response to a failure is to switch tools (about 83% of post-failure decisions for Claude Opus 5.5, 81% for Gemini 3.8 Flash, 79% for GPT-5.6 Sol); weaker models burn budget retrying.

Termination is its own trap. GPT-6 Astra terminates naturally on 69.0% of tasks but is correct on only 39.0% — finishing confidently and finishing correctly are different events, and any production system that treats "the agent stopped" as "the agent succeeded" is importing that 30-point gap.

## What I would do on Monday

1. **Cap the search, not the model.** On your own 20-task live-web slice, log accuracy per tool call. If a candidate setup averages more than ~50 calls per task without beating a leaner setup by at least 5 points, ship the leaner one — OpenDS-World's token data says volume past that point is spend, not signal.
2. **Budget failures explicitly.** Failed calls cost up to ~62% of tool time while being under 10% of calls. Set a hard rule: at most 2 retries with modified arguments, then switch tools or abort the trajectory and escalate. That mirrors what the top three models already do ~80% of the time.
3. **Score stopping separately.** Track "terminated naturally" and "answered correctly" as two different metrics in your eval dashboard. If the gap exceeds ~20 points, your problem is stopping and evidence integration, not retrieval — and more search budget will not fix it.

The honest summary: on the open web as it actually exists — messy formats, interactive pages, evidence scattered across sources — the best agent we have is right 39% of the time, and that is already nearly double a human working alone. The gap to close is not effort. It is judgment about where to look, when to switch, and when to stop.

## Sources

- Yu et al., *Deep Search in Real-World Web Environments*, arXiv:2610.30181, submitted October 19, 2026 — https://arxiv.org/abs/2610.30181
- Full text and Table 1 (per-model accuracy, difficulty splits, token consumption) — https://arxiv.org/html/2610.30181v1
