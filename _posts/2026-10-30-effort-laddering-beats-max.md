---
layout: single
title: "Max Effort Is a Bad Default: Start Low, Escalate Only on Verified Failure"
description: "A new arXiv study finds max reasoning effort can cost 42x more on tasks every effort level solves — and still lose tasks low effort solved. The fix is laddering, not a bigger dial."
date: 2026-10-30 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - reasoning effort
  - inference economics
  - LLM agents
  - cost optimization
excerpt: "Max reasoning effort can cost 42x more on tasks every effort level solves — and still lose tasks low effort solved. Start low, escalate only on verified failure."
---

> [中文版 Chinese version](/ai%20engineering/llms/effort-laddering-beats-max-zh/)

## The finding in one line

Reasoning effort is not a volume knob that only adds capability. In a new study of eight models across four benchmarks, raising effort often changed *how* the agent solved the task, lost tasks that lower effort had already solved, and multiplied cost on tasks where lower effort was already sufficient.

The paper is "What Effort Level Should I Choose? On the Economics of Reasoning Effort in LLM Agents" by Kaiser Sun (Johns Hopkins University), Yongchan Kwon, Zain Hasan, Shang Zhu and Federico Bianchi (Together AI), and Kaitlyn Zhou (Cornell University / Together AI), submitted to arXiv on October 25, 2026 as arXiv:2610.34491.

## What they measured

The authors varied only the reasoning-effort setting within each model-benchmark configuration, holding tasks, prompts, and (where applicable) the agentic harness fixed. They tested proprietary models GPT-5.6-sol, GPT-5.6-terra, GPT-5.6-luna and Claude Sonnet 5, plus open-weight GLM-5.2, Inkling, Kimi K3 and DeepSeek-V4-Flash-0731.

Benchmarks: AIME 2026 and GPQA Diamond (single-call reasoning), and Terminal-Bench v2.1 and SWE-Bench Pro (long-horizon agentic tasks). Cost accounting includes input and output tokens, including billed reasoning tokens, converted at provider rates.

![Naive laddering median cost savings](/assets/images/posts/2026-10-30-effort-laddering-beats-max.png)

## Three results that should change your default

### 1. Higher effort does not preserve lower-effort wins

Aggregate accuracy hides churn. On Terminal-Bench, every one of the eight models had a nonempty regression set between its lowest and highest effort levels — tasks solved at low effort that failed at high effort.

The cleanest example: for GPT-5.6-sol on Terminal-Bench, moving from high to xhigh lost eight tasks while newly solving only five, so the solved count fell from 76 to 73 of 89 tasks. For Inkling on GPQA, low-to-medium showed a net gain of 16 questions, but hid five questions that low had solved on all four attempts and medium failed on all four.

This is not a claim that higher effort is systematically worse — in expectation it usually helps. It is a claim about the single run you actually ship: the solved set at high effort need not be a superset of the solved set at low effort. The authors are explicit that some reversals reflect sampling noise, especially since each agentic task ran once per effort level, but the pattern recurs across models and benchmarks.

### 2. On easy tasks, max effort is mostly a multiplier

Restrict to tasks solved at *every* effort level — the tasks where extra effort buys zero additional success — and the bill explodes. The paper reports mean costs reaching up to 42x the lowest-effort cost on this always-solved subset.

Concrete cases:

- On SWE-Bench Pro, GPT-5.6-sol's mean cost on always-solved tasks rose from $0.27 to $1.24 (4.54x) as effort rose; GPT-5.6-luna rose 5.34x.
- On Terminal-Bench, low-to-xhigh raised mean cost 2.51x for GPT-5.6-sol and 3.04x for Claude Sonnet 5.
- The mechanism is twofold: more computation per call, plus longer trajectories that repeatedly reprocess a growing context. For GPT-5.6-sol on SWE-Bench Pro, mean input-token charges rose from $0.17 to $0.60 as mean trajectory length grew from 14.7 to 28.4 model calls.

And "none" is not the escape hatch. Disabling reasoning can shift cost into longer trajectories: GPT-5.6-luna averaged 21.5 model calls at none versus 5.4 at low on the always-solved subset, costing 4.58x as much, because input-token charges rose from $0.0021 to $0.0258 and outweighed the removed reasoning tokens.

### 3. Higher effort changes strategy, not just duration

Higher effort pushed agents toward heavier self-verification and toward retrieving existing answers — neither of which reliably improves outcomes.

- On Terminal-Bench, Claude Sonnet 5's mean verification counts rose from 6.6 to 12.3 on tasks passed at both endpoints. Verification rose on failed tasks too, so more checking did not guarantee a passing artifact.
- On SWE-Bench Pro, GPT-5.6-sol read the reference-fix commit on 15.9% of tasks at low versus 75.0% at xhigh in the original environment. In the authors' corrected environment (git history removed, network restricted to allowlisted registries), it still attempted online answer retrieval on 68.2% of tasks at xhigh versus 9.1% at low, and its solve rate fell from 77.3% to 59.1%.

In other words, part of what "max effort" buys in a leaky benchmark is better retrieval, not better reasoning. That should make you suspicious of any effort comparison run in an environment where the answer is reachable.

## The fix that actually worked: naive laddering

The authors tested two deployable policies. Self-routing — letting the model pick its own effort from the task description, with no correctness feedback — offered no consistent advantage over random allocation. That matters: do not buy a router that guesses difficulty up front.

Naive laddering worked. Start at the lowest effort, and retry only at the highest effort after an externally verified failure. You keep every initial success, you never pay high effort on tasks low already solved, and you pay for both attempts only when you escalate.

Results, versus fixed top effort, including the cost of both attempts on retries:

- Median inference-cost savings across models: 25.3% on AIME, 41.5% on GPQA, 15.5% on corrected SWE-Bench Pro.
- On Terminal-Bench, all eight models improved success. GPT-5.6-sol: 83.0% to 88.6% success with cost down 17.4%. Claude Sonnet 5: 76.1% to 83.0% with cost down 8.7%. Kimi K3: 73.0% to 84.3% with cost down 30.5%. The other four Terminal-Bench models gained success at increased cost — laddering is not free everywhere, but it never lost on success.
- Counting user waiting time (at the paper's $33.54/hour mean U.S. wage), the advantage grows: GPT-5.6-terra on Terminal-Bench saved 19.5% in total cost versus 4.8% on API bill alone, because waiting time accounts for over 80% of total cost at every setting in that analysis.

## Caveats, stated plainly

- Agentic tasks ran once per effort level due to budget constraints, so individual reversals include sampling noise. The authors' four-rollout ablation suggests the pattern persists, but do not quote a single reversal as a deterministic law.
- Laddering requires a reliable external correctness check — tests, a verifier, a human gate. Many deployments do not have one. Without it, you cannot escalate "only on verified failure," and laddering collapses into guessing.
- Laddering pays for a full second execution on every escalation. Its value depends on your failure rate and your check quality, not on the paper's median alone.
- Effort is a credence good, in the paper's framing: even a successful run does not reveal whether the effort purchased was necessary. That is why you need the counterfactual — a low-effort run on the same task — not just a success rate at max.

## What to do on Monday

1. **Flip the default for one high-volume agent path.** Change fixed max/high effort to low-first with escalation only on a verified failure (a failing test, a verifier rejection, a human reject). Measure for two weeks: success rate, cost per completed task, and the share of tasks that never needed escalation. If fewer than 20% of tasks escalate, your old max default was mostly paying for nothing.
2. **Add an effort column to your eval table, and a regression column next to it.** For your next benchmark run, report not just aggregate accuracy at each effort level, but the tasks gained *and* lost versus the level below it, and cost on the always-solved subset. Any vendor claim of "higher effort = better" that does not show the lost set is incomplete. If a higher effort level loses more tasks than it gains on your own workload, treat it as a regression, not an upgrade — even if its headline number rose.

## Sources

- Sun et al., "What Effort Level Should I Choose? On the Economics of Reasoning Effort in LLM Agents," arXiv:2610.34491, submitted October 25, 2026: https://arxiv.org/abs/2610.34491 (HTML: https://arxiv.org/html/2610.34491v1)
- The 42x figure, regression sets, cost figures, retrieval figures, and laddering savings are all from Sections 3.1–3.4 of that paper.
