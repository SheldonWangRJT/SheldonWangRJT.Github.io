---
layout: single
title: "The Open-Weights Gap Quadrupled Overnight. The Models Didn't Change — the Test Did"
description: "Artificial Analysis Intelligence Index v5 moved 60% of its score to private tests and widened the open-weights gap from 3 to 12 points. What that does and doesn't prove."
date: 2026-10-28 07:50:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - benchmarks
  - open-weights
  - artificial-analysis
  - evaluation
excerpt: "Index v5 widened the open gap from 3 to 12 points by rebuilding the test, not by any model regressing. Read the category scores, not the composite."
---

> [中文版 Chinese version](/ai%20engineering/llms/aa-index-v5-open-gap-zh/)

On October 27, 2026, Artificial Analysis released Intelligence Index v5, its biggest overhaul since v4 launched in January. The headline number traveling around is the open-weights gap: it widened from 3 points in v4.3 to 12 points in v5. Read quickly, that sounds like open models fell behind in a quarter. Read the methodology, and a different story appears: the test changed underneath every model at the same time.

## What actually changed

Three structural changes drive v5:

- **60% of the Index is now based on evaluations with private test sets or held-out answers** — the first time a majority of the score sits behind that boundary. That is a deliberate anti-contamination move, and on that goal it is the right call: public test sets leak into training data, and everyone in this field knows it.
- **Two new benchmarks and three upgrades.** FrontierCode 2.0 (Cognition's private benchmark of 132 real coding tasks, graded on whether a maintainer would merge the change) and Terminal-Bench-Science (70 agentic scientific research tasks in a terminal) enter the Index. Humanity's Last Exam is replaced by the refined 1,000-question HLE-Diamond; AA-Omniscience moves to v1.1 with saturated and public questions removed; CritPt v2 is scored on a private 40-question hard subset.
- **The tasks demand far more work.** Median output per Intelligence Index task rose by two thirds, from 35K tokens in v4.3 to 59K in v5. Agentic evaluations are 55% of the Index weight but account for a median ~90% of output tokens, with Terminal-Bench-Science alone about a third.

Alongside v5, Artificial Analysis launched a Progress Index v1 that tracks capability over time on one continuous scale — an implicit admission that the headline Index itself no longer supports clean version-to-version comparisons.

## The verified results

- Claude Opus 5.5 (max) leads at **58**, ahead of GPT-6 Astra (max, **57**) and GPT-6.1 Sol (max, **55**). Gemini 4 Argon (high) is next at **50**. Anthropic and OpenAI hold the top five spots, and no single model leads all nine evaluations.
- The top open-weights model is Kimi K3.1 Pro at **46** — with the crucial caveat that **its weights are not yet released**.
- Among models with actually released weights, DeepSeek V4.1 Flash 1017 (max) and GLM-5.3 (max) lead at **32** — 26 points behind the leader, and below Claude Haiku 5.5 (max, **36**).
- The gap is concentrated, not uniform. On HLE-Diamond, Kimi scores 37% against Opus 5.5's 68%. On Terminal-Bench-Science, Astra leads at 63%, Kimi scores 34%, the best released open model (DeepSeek V4.1 Flash) scores 13%, and most open models score under 10%.
- And the counter-signal: **Kimi K3.1 Pro leads Terminal-Bench 4.0 outright at 67%**, ahead of every closed model. On FrontierCode 2.0, Opus 5.5 leads at 46% and DeepSeek V4.1 Flash is the top open model at 28%.

![Index v5 scores: leaders, top open model, and best released open weights](/assets/images/posts/2026-10-28-aa-index-v5-open-gap-chart.png)

## The cost number matters more than the composite

The most decision-relevant line in the release is not the ranking. Cost per Intelligence Index task: Claude Opus 5.5 (max) costs **$10.04**, GPT-6 Astra (max) **$6.24**, and GPT-6.1 Sol (max) **$1.27**. Sol scores within a few points of the leader (55 vs 58) at about an eighth of the cost per task. Among the ten highest-scoring models shown, cost per task varies by more than 13x, from GPT-6.1 Terra at $0.96 to Claude Fable 5.1 at $13.04.

Effort settings widen the same point: Opus 5.5 scores 35 at low effort and 58 at max, at 10x the cost per task ($0.98 vs $10.04). A v5 score is therefore not a property of a model. It is a property of a model, an effort setting, a harness (Artificial Analysis runs FrontierCode tasks three times in its own Stirrup harness), and a mostly private test set.

## So what does the widened gap actually prove?

Two things, and they should not be conflated:

1. **On long, private, agentic tasks, the frontier labs' advantage is real and large.** A 13% score for the best released open model on Terminal-Bench-Science, against 63% for the leader, is not a rounding artifact. If your workload looks like multi-hour terminal research with hidden grading, released open weights are not yet a substitute, whatever the old composite said.
2. **The 3-to-12 headline is mostly a measurement change, not a regression.** The same Kimi model that "fell behind" by 12 points simultaneously leads a carried-over benchmark (Terminal-Bench 4.0) outright. Models did not get worse between v4.3 and v5; the ruler changed — toward private data and long agentic runs, which happen to be exactly the axes where closed labs hold structural advantages (private eval infrastructure, and the inference budget to burn 59K median tokens per task at max effort).

There is also a governance cost to name plainly: when 60% of a composite score rests on private test sets or held-out answers, outside teams cannot independently reproduce the ranking. That may be the correct trade against contamination — I think it largely is — but it changes what the Index is: less a public benchmark, more a rating agency whose methods you trust or don't.

## What to do on Monday

- **Stop re-ranking open vs closed on the composite.** Judge on the one Index category that matches your workload (knowledge work, coding, science, general). Switch away from an open model only if the gap *in your category* exceeds 10 points — a composite gap can be manufactured entirely by categories you never run.
- **Price the effort setting, not the model name.** A 23-point swing ($0.98 → $10.04 per task) sits inside a single model's effort dial. Before paying max-effort prices, check whether a mid-tier model at max effort beats your frontier model at low effort on your own tasks — on v5's own numbers, that trade is frequently available.
- **Treat private-benchmark scores as one input, with a reproducibility discount.** If 60% of a score cannot be inspected, weight the remaining public, reproducible evaluations — and your own held-out tasks — correspondingly higher in any build-vs-buy decision.

The open-weights story did not reverse this week. The measurement did — and knowing which of those two things happened is worth more than the 12 points.

*Sources: Artificial Analysis, "Announcing Artificial Analysis Intelligence Index v5" (Oct 27, 2026) — all scores, costs, token figures, and methodology details above are from that announcement.*
