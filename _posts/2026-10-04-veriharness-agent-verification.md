---
layout: single
title: "Stop Voting on Agent Outputs. Start Adjudicating Them."
description: "VeriHarness (arXiv:2610.00972) shows 34% of unanimous agent answers are wrong, majority voting adds ~0 points, and evidence-checked verification adds 4–6."
date: 2026-10-04 12:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - agents
  - verification
  - test-time-compute
  - evals
excerpt: "On 10-rollout agent pools, majority voting buys +0.3 to +0.8 points. Checking claims against the environment buys +4.4 to +6.4. The correct answer is usually in the minority."
---

> [中文版 Chinese version](/ai%20engineering/llms/veriharness-agent-verification-zh/)

The standard way to make an agent more reliable is to sample it several times and trust the answer the rollouts agree on. A paper posted to arXiv on October 1, 2026 — "VeriHarness: Scaling Agentic Verification for Long-Horizon Tasks" (arXiv:2610.00972), from Caiqi Zhang (University of Cambridge, work done while interning at Google Cloud AI Research), Rujun Han, Zifeng Wang, Zoey CuiZhu, Nigel Collier, Tomas Pfister, and Chen-Yu Lee — measures how badly that instinct fails on long-horizon work, and what to do instead.

## The finding: consensus is a weak signal, disagreement is the useful one

On ten-rollout pools of Claude Opus 4.8 on APEX-Agents, whose rubrics permit claim-level grading, the authors find:

- **34% of consensus values** — claims all ten rollouts agree on — **are judged incorrect.** Unanimity can hold even when every candidate is wrong.
- **74% of disputed claims contain a correct candidate**, but **the most frequent value is correct in only 47%** of those cases. Voting systematically discards the right answer.

This is the opposite of the intuition behind self-consistency. On short math problems, the mode of the sample distribution is a decent estimator. On long-horizon workspace tasks — reports, spreadsheets, multi-file deliverables — the rollouts share the same misreading of a source file, the same wrong unit, the same omitted requirement. Agreement measures correlated belief, not correctness. Disagreement, by contrast, is a map of exactly where the model is uncertain, and the correct alternative is usually sitting in the minority, waiting to be checked against evidence.

## The system: same model, two adversarial checking jobs

VeriHarness turns the generator's own model into a verifier — no stronger judge, no reference answers, no grading rubrics at test time. The verifier gets a workspace (every rollout's artifact, final state, and trace, alongside the task environment), evidence tools (read sources, recompute quantities, run code), and a library of reusable verification skills. The protocol splits checking into two jobs run in **separate contexts**:

1. A **disagreement resolver** takes each disputed claim and tests the competing values against source files, data, and task constraints.
2. A **consensus challenger** takes each agreed claim and first has to propose how it could be wrong — wrong source version, wrong currency, downstream of a correct intermediate — then test those proposals against the environment.

Adjudication in a fresh context combines the two evidence records into a selection decision and, optionally, a revision plan. Two design details matter. First, the verifier never scores rollouts by reading them; every verdict is tied to a check executed in the environment. Second, the two investigations stay in separate contexts: merging them costs 0.8 points (Appendix F ablation), which is consistent with the challenger needing to argue against what the resolver might otherwise anchor on.

## The numbers

Five benchmarks, 1,166 tasks total, ten rollouts per task, three verifier runs, both models serving as their own verifier. Averages are the unweighted mean of each benchmark's native score.

| Method | Gemini 3.5 Flash (avg) | Gain | Claude Opus 4.8 (avg) | Gain |
|---|---|---|---|---|
| Single rollout | 47.2 | — | 49.6 | — |
| Majority voting | 47.5 | +0.3 | 50.4 | +0.8 |
| Best-of-N with judge | 47.3 | +0.1 | 50.6 | +1.0 |
| Pairwise tournament | 49.1 | +1.9 | 51.3 | +1.7 |
| LLM-as-a-Verifier | 49.5 | +2.3 | 51.2 | +1.6 |
| Agentic verifier (env. access, no protocol) | 49.4 | +2.2 | 51.6 | +2.0 |
| **VeriHarness (select)** | **51.6** | **+4.4** | **53.7** | **+4.1** |
| **VeriHarness + revision** | **53.4** | **+6.2** | **56.1** | **+6.4** |

Benchmarks: APEX-Agents v1.0 (480 tasks), Workspace-Bench Lite (100), WorkBuddy Bench (200), SpreadsheetBench 2 (321), JobBench (65). The single biggest cell: APEX-Agents with Opus, 35.8 → 47.5 (**+11.7**) with revision. The selection oracle — picking the best rollout per task with the grader — sits at 62.7/63.1, so verification recovers roughly a third of the available headroom; it does not close it.

![Gain over single rollout by verification method](/assets/images/posts/2026-10-04-veriharness-agent-verification-gains.png)

Three more results sharpen the picture:

- **The gain lives where pools disagree.** On APEX-Agents with Opus, selection scores +6.1 points over the pool mean on disputed pools and only +0.6 on the 154 consensus pools. Verification compute spent on unanimous tasks is nearly wasted; spent on disputed tasks, it pays.
- **Environment access alone is not the trick.** A free-form agentic verifier with the same workspace and tools but no protocol or skills recovers only about half the gain (+2.2/+2.0 vs +4.4/+4.1). The structure — resolver vs challenger, separate contexts, adjudication — is doing the work.
- **The protocol is portable.** Running the same instructions and skills inside Gemini CLI, Claude Code, and Codex recovers most of the selection gain, at 2–3× the cost of the authors' runtime.

## The cost

Verification is cheap relative to generation because the harness makes incremental calls over one workspace: 86–91% of input tokens are served from cache. Selection costs **$1.44 per task with Flash** and **$3.92 with Opus** at list price (cached input at the cache-read rate); revision costs about 3× selection and yields the largest gain. For calibration, the authors report selection with Flash at a tenth of the cost of LLM-as-a-Verifier at twice the gain, and with Opus at about half the cost of majority voting, best-of-N, and LLM-as-a-Verifier — because those baselines re-read all ten rollouts in every call and get no cache benefit. If you charge cached tokens at full input price, selection becomes $5.40 (Flash) / $13.06 (Opus) and the harness stays on the cost–gain frontier. The authors also release the full pool of ~26,000 rollouts, produced at a cost of over $100,000, so pool-only methods can be reproduced without running a model.

One more idea worth stealing: the skill library **evolves**. Starting from an empty library and learning verification skills from development-task failures beats the human-authored library on held-out tasks (+11.0 on APEX-Agents, +5.7 on SpreadsheetBench 2 over the empty-library baseline); evolving from the human-authored library adds a further +6.8 and +3.7 over that library. Of the 95 checks in the evolved libraries, only 5 restate a human check — 48 make a human check concrete (a script, a constant, a document type) and 42 are new, including checks aimed at the verifier's own consensus blind spot.

## Caveats, stated plainly

- The pool is not free. All results use ten rollouts per task; the comparison is equal-generation-cost across methods, but your generation bill is 10× a single run before verification starts.
- The verifier is the same model as the generator by design. A stronger verifier might score higher, but then you could not attribute the gain to the harness — the paper deliberately does not run that arm.
- There is no calibrated per-rollout score; the harness judges claim by claim. Using its records as a reward signal is future work, by the authors' own statement.
- The challenger's blind spot is real: in ~70% of the shared errors it left standing, it checked an intermediate quantity that was correct while the error sat downstream. It stops where the rollouts stopped unless a skill tells it where else to look.
- Verification is a multi-turn investigation and adds wall-clock latency. The authors target professional deliverables where quality beats response time; chat-latency products should read this differently.

## What I would do with this on Monday

1. **Kill majority voting as the tie-breaker on long-horizon tasks.** It bought +0.3/+0.8 points here — inside the noise of what a single rollout already gives you. If your rollouts disagree on a claim, that disagreement is the work order: route it to an evidence check, not a vote.
2. **Budget verification at roughly 30% of generation spend, and spend it on disputed pools first.** In this setup, ten rollouts plus ~$1.44–$3.92/task of selection (3× that if you also revise) bought +4 to +6 points. If your pool is unanimous, the expected return on verification rounds to +0.6 — skip it and bank the compute.
3. **Make the verifier touch the environment, in two separate contexts.** Reading-and-scoring rollouts (best-of-N, generic judging) captured at most +2.3. The resolver/challenger split with executed checks captured +4.4 and up. If you merge the two roles into one prompt to save engineering time, expect to give back ~0.8 points.
4. **Keep verifier calls incremental over a single workspace.** 86–91% cache hit rate is the difference between $3.92 and $13.06 per task at Opus prices. A harness that re-reads the whole pool per call quietly triples your verification bill.

The deeper claim here is not that one harness won a benchmark. It is that for long-horizon agents, **agreement is not evidence**. The field has spent two years scaling sampling and then voting. This paper suggests the sampling was fine — the correct answers were already in the pool, in the minority — and the voting was the bug.

## Source

Zhang, C., Han, R., Wang, Z., CuiZhu, Z., Collier, N., Pfister, T., & Lee, C.-Y. (2026). *VeriHarness: Scaling Agentic Verification for Long-Horizon Tasks.* arXiv:2610.00972. Submitted October 1, 2026. All numbers above are from the paper's Table 2, Sections 2, 5, and 6, and Appendix K, checked against the arXiv HTML on October 4, 2026.
