---
layout: single
title: "The Agent Said It Was Done. The Database Counted 241."
description: "ThinkingBox grades agents on final database state over 20 runs — Opus 5.5 gained accuracy and added zero dependable tasks"
date: 2026-10-05 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - agents
  - benchmarks
  - reliability
  - evaluation
excerpt: "Pass@1 went up. Dependable tasks did not. Price the 20/20, not the demo."
---
> [中文版 Chinese version](/ai%20engineering/llms/thinkingbox-dependable-task-zh/)

Microsoft and Hugging Face released ThinkingBox on October 3, 2026. It runs 507 stateful business workflows — retail, auto insurance, travel, neobank, consulting — 20 times per model from an identical clean backend, and grades the terminal database state and side effects, not the transcript. 477 tasks are graded on state alone; 30 add response rubrics.

That design choice exposes a gap most leaderboards hide.

## The headline tie

Claude Opus 5.5 leads pass@1 at 67.16%. Claude Opus 5 is at 66.50%. A +0.66 point gain.

On observed 20/20 — tasks that passed all 20 recorded attempts, no estimator, no smoothing — both models pass exactly 241 of 507 tasks (47.53%).

Half a point of headline accuracy bought zero additional dependable tasks.

Breadth pulls the other way. Kimi-K3, the strongest open-weight model in the set at 57.37% pass@1, solves 476 of 507 tasks at least once (93.89%). Only 68 tasks (13.41%) pass all 20 times. Opus 5 solves fewer tasks at least once (79.09%) but holds 241 of them every time — 173 more consistently-passed tasks than Kimi-K3.

If you pick on pass@20, you pick the flaky model. If you pick on pass@1, you still cannot tell whether the gain survives repetition. GPT-6 Astra retains 78% of its single-attempt rate across repeats; Opus 5.5 and Opus 5 each retain 71%. GLM-5.1, Kimi-K2.6 and DeepSeek-V4-Pro each keep about 8%.

![ThinkingBox: pass@1 vs passing all 20 runs, and cost per dependable task](/assets/images/posts/2026-10-05-thinkingbox-dependable-task-chart.png)

## A clean finish is not evidence

In the common-set ablation — 121,680 valid trials across 12 models — 79,853 attempts failed the executable checks. Of those failures, 67.24% terminated cleanly, invoked a state-changing tool, and reported no final tool error.

The checks found wrong field values in 77.61% of failures, unintended extra effects in 43.30%, and missing required effects in 25.36% (findings overlap).

The diagnostic signature is more useful than the score. Tool handling accounts for 79.9% of failures (unweighted average of per-model shares). Wrong state updates are 10.3%, incomplete user resolutions 7.0%, and no state-changing action 2.9%. Agents usually attempt the workflow, then fail to recover from a tool error, an unmet precondition, or an empty lookup. That is a retry and error-recovery problem before it is a model problem.

Domain spread reinforces the point: retail averages 59.52% pass@1 across models; auto insurance averages 33.83%.

## Price dependability, not single successes

The authors price recorded token usage at undiscounted list rates (a comparative index, not an invoice) two ways.

Cost per successful attempt rewards cheap, often-right answers. GPT-5.6 Sol is lowest there at $0.127 per success.

Cost per dependable task — the full 20-run campaign cost divided by tasks passing 20/20 — reorders the field:

| Model | Tasks passing 20/20 | Cost per dependable task |
|---|---:|---:|
| GPT-5.4 | 128 | $6.80 |
| GPT-6 Astra | 231 | $7.45 |
| Claude Opus 5.5 | 241 | $7.80 |
| GPT-5.6 Sol | 82 | $9.76 |
| Claude Opus 5 | 241 | $13.30 |
| Kimi-K3 | 68 | $20.68 |

Opus 5.5 dominates Opus 5 on this measure: same 241 dependable tasks, $7.80 vs $13.30. GPT-5.6 Sol, cheapest per single success, costs $9.76 per dependable task. The cheapest way to get a right answer is not the cheapest way to get a dependable one.

## Caveats

These are the benchmark authors' own runs and list-rate estimates, not independent replication or your cloud bill. Observed 20/20 records what happened in these trials; it is not a guarantee of future runs. The authors state they have not measured the lift from their own suggested fixes — terminal-state checks, error classification, human approval on irreversible changes. Treat those as testable hypotheses, not proven gains.

## What to do Monday

1. **Score your own replay on 20/20, not pass@1.** Take 30–50 of your production workflows, run each 20 times from a clean backend, and grade final state. If observed 20/20 is below 40% on a workflow that writes irreversible state, keep human approval on that workflow until it clears 40% on two consecutive weekly replays.
2. **Add two columns to every model comparison:** tasks passing all 20 runs, and cost per dependable task (campaign cost / 20/20 tasks). If a newer model gains under 1 point of pass@1 and adds zero 20/20 tasks — the exact Opus 5 to 5.5 pattern — do not pay a migration cost for dependability you did not get.
3. **Budget the retry layer before the next model.** With 79.9% of failures in tool handling, spend the first sprint on error classification and targeted retries for recoverable tool errors, and re-measure. Only escalate the model if 20/20 is still below your threshold after that.

A trajectory is a claim. Database state is the evidence. Repetition is the trust test — and now it has a price.

Sources: Microsoft / Hugging Face, "The Agent Said It Was Done. The Database Disagreed.", October 3, 2026.
