---
layout: single
title: "A 4B Open Model Tied GPT-5.4 on a Real Agent Task — and PEFT Stopped Helping at 27B"
description: "MetroLLM-Bench: a 2.6 GB Qwen 3.5 4B PEFT student matches GPT-5.4 at maximum reasoning effort on held-out Tier 1, while fine-tuning gains decay from +7.03 to −0.91 points across student sizes."
date: 2026-09-18 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - agents
  - fine-tuning
  - PEFT
  - open-weights
  - benchmarks
  - inference-economics
excerpt: "On bounded tool-use tasks, a 4B open model with PEFT matches frontier APIs — and fine-tuning bigger students buys you nothing."
---

> [中文版 Chinese version](/ai%20engineering/llms/metrollm-peft-ceiling-zh/)

A 2.6 GB open-weight model just tied GPT-5.4 at maximum reasoning effort on a real tool-use benchmark. The frontier API premium bought exactly 0.05 Tier-1 points — a difference the paper's own bootstrap interval calls noise.

The result comes from [MetroLLM-Bench](https://arxiv.org/abs/2609.10016) (Remco Hendriks, Continker, arXiv:2609.10016, submitted Sep 9 2026), a 955-case benchmark that puts language models behind a transit kiosk: six real metro systems (MARTA, Doha, BART, Taipei MRT, CTA Chicago, Beijing — 37 to 414 stations), eleven categories (routing, fares, disruptions, accessibility, policy, multi-turn, adversarial, temporal, tool-hallucination, compound stress), six structured tools, a ReAct loop capped at 20 rounds, and a machine-renderable terminal state the kiosk hardware must act on. Scoring splits into Tier 1 (14 deterministic components — route/fare correctness, tool-call accuracy, render validity) and Tier 2 (8 semantic-quality components, 6 judged by Claude Haiku 4.5). The headline comparisons all use Tier 1, which is fully deterministic — no judge in the loop.

## The deployment result

On the 238-case held-out partition (a system-stratified 75/25 split fixed before any training):

| Model | Tier 1 |
|---|---|
| Qwen3.6-27B (best Tier 1) | 93.63 |
| GPT-5.4 full (xhigh reasoning) | 91.37 |
| **Qwen3.5-4B + PEFT (2.6 GB Q4_K_M)** | **91.32** |
| GPT-5.6 luna (medium) | 90.63 |
| GPT-5.6 sol (xhigh) | 90.00 |
| Rule-based script | 84.60 |

The 4B student was trained with QLoRA (rank 16, 3 epochs) on 600 teacher traces drawn only from the 717-case training partition — traces where a 27B or 35B teacher scored ≥90% Tier 1 (mean 99.0%). Total training: 9.4 GPU-hours on a single RTX 5090. It gained +2.00 points over its 4B base, beat both GPT-5.6 tiers, and landed within 0.05 points of GPT-5.4 full at xhigh effort. The held-out bootstrap for that 0.05-point gap is [−1.80, +1.70]; on the full 955-case matrix the student and GPT-5.4 xhigh are tied at +0.01 [−0.93, +0.94]. The author's own framing: "frontier-level Tier 1 performance does not require a proprietary frontier API."

Two more leaderboard facts worth knowing: the composite rank #1 is Muse Glimmer 30B (Meta Superintelligence Labs, Apache 2.0) at 92.03 — and among the six highest-ranked rows, only the two OpenAI rows are proprietary. The top eleven rows span just 3.18 composite points, roughly the single-run noise floor, so don't over-read exact ranks.

![MetroLLM-Bench results: 4B PEFT student vs frontier APIs, and the PEFT capacity-ceiling curve](/assets/images/posts/2026-09-18-metrollm-peft-ceiling.png)

## The capacity-ceiling curve

Section 4 is the paper's real contribution: the same QLoRA recipe applied to 2B, 4B, 9B, and 27B students, two to three independent seeds each:

| Student | Base Tier 1 | PEFT Tier 1 | Δ vs base | Seed spread |
|---|---|---|---|---|
| 2B | 74.17 | 81.20 | **+7.03** | ±3.97 |
| 4B | 89.32 | 91.32 | **+2.00** | ±0.49 |
| 9B | 89.38 | 91.03 | **+1.65** | ±0.50 |
| 27B | 92.32 | 91.41 | **−0.91** | ±0.53 |

The PEFT gain decays monotonically and changes sign at 27B — and every seed agrees on the direction at every size. On the full matrix (higher statistical power), the 4B gain is +1.72 [+0.72, +2.74] and the 27B regression is −1.07 [−1.82, −0.38]: both intervals exclude zero. Above 4B, measured quality is flat (91.32 / 91.03 / 91.41 — a 0.38-point range); what separates the students is footprint: 2.6 GB vs 16 GB.

The interpretation the author offers, and I buy it: a weaker base leaves more room for an adapter to change behavior, so both the average benefit and the run-to-run variance contract as the base approaches the task ceiling. Note the 2B seed lottery — ±3.97 points across three seeds — versus ±0.5 from 4B up.

## The serving-config trap

Section 3.4 is a warning every leaderboard reader should internalize. Under the uniform serving config (greedy decoding, 4096-token budget), Qwen3.8-27B appeared to regress 3.60 Tier-1 points against Qwen3.5-27B (89.48 vs 93.08). Decomposing it: Qwen3.8 emits much longer reasoning traces, so the 4096 budget truncated cases inside the reasoning block (+1.72 points recovered with a 16384 budget), and its model card recommends sampling at temperature 1.0 rather than greedy (+1.00 more). At vendor-recommended settings the gap collapses to 0.07; at each model's own best config it's 0.88. Roughly **2.7 of the 3.6-point "regression" was configuration, not capability**. The author's line: "swapping the model name while keeping the serving configuration would have cost 2.7 points."

## The free baseline nobody builds first

A deterministic scripted agent — fixed tool-call order, structured field reads, no LLM — scores 84.6 Tier 1 (77.1 composite). It does well on Routing (93.5) and Fare (91.7), then falls off a cliff on Temporal (52.1), Compound Stress (68.9), Accessibility (69.7), and Policy (73.3). Every category requiring a per-scenario decision gains 10+ points from the LLM. That split is the actual engineering lesson: the script tells you where the LLM's money goes.

## Caveats, stated plainly

- **Judge monoculture.** Six of eight Tier-2 components use Claude Haiku 4.5. The author calibrates against two human annotators (author–judge κw = 0.53, moderate) and — correctly — bases no headline claim on Tier 2 alone. Cross-vendor judge calibration is listed as future work.
- **The 27B −0.91 may be partly hardware.** The 27B student trained at 2048 max sequence length vs 4096 for the others (32 GB VRAM limit). The author discloses this and doesn't test whether removing it changes the sign. The monotonic decay across all four sizes survives regardless.
- **Held-out n=238 is small.** Every individual held-out pairwise bootstrap includes zero; only the full 955-case matrix (which includes training cases) reaches significance. The capacity-ceiling claim rests on the trend across sizes × seeds × partitions, not one comparison.
- **Temporal reasoning is still frontier territory.** GPT-5.4 full at xhigh scores 87.2 composite on Temporal vs 73.5 for Qwen 27B base and 68.6 for GPT-5.6 sol at the same effort (n=22). "The advantage belongs to one frontier configuration rather than to reasoning effort as such." Bounded tasks ≠ all tasks.
- **The 2B→4B +15.15-point jump is within-family**, not a general parameter threshold; Qwen 35B-A3B (3B active) ranks 7th composite despite its size.

## The Monday-morning playbook

1. **Bounded tool-use agent? Distill before you rent.** If your agent has a handful of tools, ≤20 steps, and a constrained output schema: spend ~2 weeks and one consumer GPU distilling ~600 high-quality teacher traces (≥90% on your deterministic metric) into a 4B open model. Decision rule: ship the student if its held-out gap to the frontier API sits inside the bootstrap interval — here, −0.05 [−1.80, +1.70] meant "statistically tied, ship the 2.6 GB model."
2. **Build the deterministic baseline first.** It scored 84.6 for zero inference cost. Sprint 1: script the deterministic paths (routing/fare equivalents in your domain). Spend LLM budget only on the categories where this paper measured >10pp LM advantage: temporal reasoning, compound scenarios, accessibility-style edge cases, policy adaptation. If your whole task is deterministic paths, you may not need an LLM at all.
3. **Re-tune serving config per model generation — or misattribute the loss.** The paper measured 2.7 points of phantom "regression" from a frozen config (output budget truncation + wrong decoding mode). When you A/B a new generation, re-tune output budget and decoding per model before reading any delta.
4. **Size your PEFT expectations by base capability.** Expect ~+7pp at 2B-scale weak bases (but train ≥3 seeds — the ±3.97 seed spread is a lottery), ~+2pp at 4B, and ~zero or negative once the base is near the task ceiling. If your base already clears 90 on your metric, skip PEFT and spend the budget on data and harness instead.

Thesis in one line: on bounded tool-use tasks, the "just call the frontier API" reflex is now a budget mistake — but the frontier still owns the categories where judgment, not procedure, is the work.

## Sources

- Hendriks, R. (Continker). "MetroLLM-Bench: Evaluating Language Models as Transit Kiosk Runtimes." arXiv:2609.10016 [cs.LG], submitted Sep 9 2026. https://arxiv.org/abs/2609.10016
- Benchmark, harness, reproduction guide, fine-tuned students: https://github.com/continker/metrollm-bench
- Coverage: PAPERCUT explainer video, Sep 14 2026 (via social discussion).
