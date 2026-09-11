---
layout: single
title: "The 37-Point Harness Gap: Why GPT-6 Astra Scores 62.7% or 99.9% on ARC-AGI-3"
description: "Same weights, two harnesses: ARC Prize's 62.7% vs 99.9% on ARC-AGI-3 — and why the harness, not the model, is now the unit of comparison."
date: 2026-09-11 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - benchmarking
  - ARC-AGI
  - agentic AI
  - OpenAI
excerpt: "Same GPT-6 Astra weights, 62.7% vs 99.9% — the 37-point gap is the harness. Stop comparing models; start comparing systems."
---

> [中文版 Chinese version](/ai%20engineering/llms/astra-arc-agi-3-harness-zh/)

On September 3, 2026, OpenAI launched GPT-6 Astra and led with a headline number: **99.9% on ARC-AGI-3** — a benchmark purpose-built to resist saturation. The same day, the independent benchmark operator, ARC Prize, published its own evaluation of the same model: **62.7%**.

Same weights. Same week. A 37.2-point gap. The difference is not the model. It is the harness.

## What the two numbers actually are

ARC Prize ran Astra through two different harnesses and published both, transparently, in a post on September 3, 2026:

- **Standard harness** — a minimal, provider-neutral interface. All the information needed to solve each game is provided, but the model itself is responsible for deciding what to preserve in its visible notes. Designed for apples-to-apples comparison across providers.
- **Provider Adapter harness** — uses the context-management features OpenAI designed for Astra: preserving the *opaque reasoning state* (which the evaluator never sees) between requests, and using compaction to manage longer conversations.

Full results, ARC-AGI-3 Semi-Private (all numbers from ARC Prize's post):

| Reasoning effort | Standard harness | Provider Adapter |
|---|---|---|
| max | 62.7%, $26,098 | 98.6%, $17,332 |
| xhigh | 59.3%, $37,317 | 98.4%, $18,147 |
| high | 54.8%, $40,705 | 99.9%, $18,817 |
| medium | 38.6%, $48,090 | 98.4%, $19,285 |
| low | 17.5%, $38,166 | 98.0%, $21,298 |
| none | 35.2%, $49,791 | 96.7%, $23,457 |

![GPT-6 Astra ARC-AGI-3 scores by reasoning effort: Standard harness vs Provider Adapter](/assets/images/posts/2026-09-11-astra-arc-agi-3-harness-harness.png)

Three things stand out beyond the gap itself:

1. **The better run was also cheaper and faster.** Across the 167 game-reasoning pairs that both harnesses solved, the Provider Adapter runs were approximately **3.66x faster** by aggregate elapsed time and used **49% fewer total tokens**. The best adapter run cost $18,817 against $26,098 for the best standard run. The harness didn't trade quality for cost — it bought both.
2. **The gap widens as reasoning effort drops.** At `none` (no explicit reasoning), the standard harness collapses to 35.2% while the adapter still holds 96.7%. Memory handling, not raw reasoning, is doing most of the heavy lifting.
3. **This is not a one-off.** The harness effect shows up everywhere once you look. On Terminal-Bench 2.0, the same GPT-5.5 model scores **84.7%** under the NexAU-AHE harness, **83.1%** under Capy, and **82.2%** under Codex CLI — 2.5 points of pure scaffolding inside the top five of one leaderboard (per o-mega's September 2026 evals guide). ARC-AGI-3 is just the extreme version of the same distortion.

## Credit where it is due

Two things about this story are genuinely good, and both deserve to be said before the criticism:

- **ARC Prize handled it exactly right.** It published both numbers, explained the difference in plain language, and committed to reporting both harnesses going forward, each clearly labeled. It called Astra's result "a noticeable step-function change in frontier model capabilities" and a milestone worth celebrating — while declining to call it AGI. That is what independent evaluation is supposed to look like.
- **The 62.7% is itself extraordinary.** And under the Provider Adapter harness, Astra at max effort used **fewer actions than the human baseline on 96.0% of levels**, with **51.7% fewer actions per level on average** — crossing human parity on ARC-AGI-3's action-efficiency measure. Whatever you think of the headline, this is real progress in how efficiently a model turns unfamiliar environments into working models.

## The uncomfortable part

The number that traveled was **99.9%** — OpenAI's launch materials led with it, and the launch-day table put it next to competitors' standard-harness scores. The 62.7% lived in ARC Prize's blog post. When a vendor's own figure beats the independent replication by 37 points, the vendor figure is a claim, not a measurement. AlphaCorp AI's September 2026 model ranking put it well: they weight independent scoreboards over vendor-run numbers and treat unreproducible figures as marketing.

Here is the thesis: **the harness is part of the product.** On agentic benchmarks, you are not comparing weights — you are comparing weights plus context management plus scaffolding plus tooling. A well-engineered agent platform wrapped around a second-tier model will routinely outperform a frontier model running in a naive loop. Any agentic benchmark comparison that does not name the harness is incomplete to the point of meaninglessness.

The honest framing cuts both ways: OpenAI's context management is *real engineering*. Preserving reasoning state and compacting long conversations is a legitimate product surface, and buyers of the OpenAI API get the 99.9% system, not the 62.7% one. The dispute is not about whether the adapter "counts" — it is about whether a leaderboard number can be quoted without saying which system produced it.

## What to do differently on Monday morning

1. **Apply a discount rule to vendor agentic-benchmark numbers.** My working rule: when a vendor's number beats the independent replication by more than ~5 points, run your build-vs-buy math on the independent number. Astra: 99.9% vendor vs 62.7% independent. Ask the question at 62.7% — does the migration still pay for itself? If the ROI case collapses at the independent score, it was never real. Tighten the threshold for expensive migrations, loosen it for cheap experiments.
2. **Timebox two engineer-weeks on the harness before paying for the next model.** Astra's adapter bought +37 points, 3.66x speed, and roughly half the tokens. Generation-to-generation gains on agentic benchmarks typically run ~5–15 points — the harness delta here is bigger than most weights deltas. So before you upgrade tiers: give one engineer two weeks to improve context management and compaction around your current model, and measure pass rate and $/task before and after. If the harness delta beats the expected weights delta, you just saved a migration.
3. **Make vendors answer three questions, in writing, before you sign.** Any agent-vendor score you evaluate must come with: (a) the neutral-harness score, (b) the cost per task at that score, (c) tokens per task. If a vendor will only quote their own harness number, treat it as marketing, not a measurement — and say so in the procurement doc.

A falsifiable prediction: within a year, serious leaderboards split into "weights" and "systems" tracks — or the provider-adapter game becomes the actual battleground and pure model comparisons die. Either way, the people buying the 99.9% system should know they're buying a platform, not a checkpoint. The question worth arguing about: **should a 99.9% earned with the provider's private context management count as the model's score, or as the score of model-plus-vendor-platform?**

## Sources

- ARC Prize, "OpenAI's GPT-6 Astra on ARC-AGI-3" (published Sep 3, 2026) — the primary source for all scores, costs, and token/latency figures: https://arcprize.org/blog/astra
- AlphaCorp AI, "Top 5 LLMs for September 2026: Benchmarks, Pricing, Picks" (Sep 6, 2026) — the independent-vs-vendor-number framing: https://alphacorp.ai/blog/top-llms-benchmarks-pricing-picks
- o-mega.ai, "AI Model Evals 2026: The 50-Benchmark Dead-or-Alive Ledger" (Sep 2026) — Terminal-Bench 2.0 harness figures: https://o-mega.ai/articles/top-50-ai-model-evals-full-list-of-benchmarks-october-2025
- BetaNews, "OpenAI launches GPT-6 Astra, claims AGI era has begun" (Sep 3, 2026) — launch framing and the 62.7% standard-harness figure: https://betanews.com/article/openai-gpt-6-astra-agi-era/
