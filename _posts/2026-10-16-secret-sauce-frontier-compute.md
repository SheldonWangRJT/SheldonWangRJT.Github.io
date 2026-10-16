---
layout: single
title: "No Secret Sauce at the Frontier — Just 5,000x More Compute"
description: "MIT's 809-model decomposition, peer-reviewed Oct 14 2026: scale drove the frontier, efficiency drives everything below it."
date: 2026-10-16 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - scaling laws
  - LLM training
  - compute
  - MIT
excerpt: "At the frontier, scaling's share of performance rose from 77% to 88%. Below it, the secret sauce is real — and worth 50x."
---

> [中文版 Chinese version](/ai%20engineering/llms/secret-sauce-frontier-compute-zh/)

## The question

Every lab claims a proprietary edge. MIT's FutureTech group asked whether that edge actually shows up in the data — or whether frontier progress is mostly just bigger training runs. Their answer, peer-reviewed in *npj Artificial Intelligence* on October 14, 2026: both, but at different tiers. Scale owns the frontier. Efficiency owns everything below it.

## What they did

The study covers 809 models released between October 2022 and March 2025, scored on normalized MMLU-Pro. Training compute is computed the standard way (6 × parameters × tokens). A regression then splits each model's performance into four parts: scaling (log training compute), shared algorithmic progress (release-period effects), developer-specific efficiency (developer effects — the "secret sauce"), and model-specific residuals (everything left over: fine-tuning, specialization, training luck).

The sample includes 10 named major developers — DeepSeek, Qwen, Meta, Google, Microsoft, OpenAI, Anthropic, xAI, 01.AI, and Nvidia — plus groups of smaller developers. A MATH Level 5 replication serves as the robustness check.

## What they found at the frontier

![Four verified factors from the MIT decomposition](/assets/images/posts/2026-10-16-secret-sauce-frontier-compute-chart.png)

- **Scaling's share of frontier performance rose from 77% to 88%** between the first period (best model: Llama 70B) and the last (best model: GPT-4.5). In a counterfactual decomposition, scaling alone accounts for the *entire* frontier performance increase.
- **Top-model training compute grew by roughly 5,000x** across the sample window — dwarfing every efficiency factor the authors estimate.
- A **10x increase in compute raises the log-odds of performance by 0.79**, controlling for period and developer.
- Across all 809 models, scaling explains 32% of performance variation (45% among major developers). Company effects explain 14–18% in the headline accounting, and 14–34% across sample splits. Shared algorithmic progress explains only 3–10% of *cross-model* variation — small as a variance share, but large as a level shift (see below). Model-specific residuals carry 32–47%.

## What they found below the frontier

This is where the paper gets interesting — and where most buyers and builders actually live:

- **Shared algorithmic progress raised effective compute 7.5x** over the window: matching late-2024 performance with early-2023 techniques would have taken 7.5x more compute. On MATH Level 5, the gain is 11x.
- **Developer efficiency spreads reach 61x.** The most efficient developers convert a unit of compute into far more benchmark performance than the least efficient ones, after controlling for time and scale.
- **The same firm can differ from itself by more than 40x.** Model-level residuals — same developer, same era — span 41x between the 90th and 10th percentiles on MMLU-Pro, and 186x on MATH Level 5. Recipe, data, and fine-tuning choices vary enormously even inside one lab.
- **The compute needed to reach a fixed capability collapsed.** To hit a 15% normalized MMLU-Pro score, required compute fell 50x among major developers (8,000x including small developers) — while the score at that threshold actually ticked up from 16.6% to 18.0%.

In short: proprietary technique and shared progress barely move the frontier leaderboard, but they are the entire story for compressing a given capability into a smaller, cheaper model. That compression is presumably a large part of why inference prices have fallen.

## Why the split makes sense

At the frontier, everyone has access to roughly the same public algorithmic ideas, and the binding constraint is who can afford the biggest run. Below the frontier, the constraint flips: the capability target is fixed, so the winner is whoever reaches it with the least compute. Efficiency compounds — better data, better recipes, better fine-tuning — and it shows up as a 50x cost gap, not a 2-point benchmark gap.

## Caveats — read before you cite this

- **The data ends in March 2025.** This is a peer-reviewed publication of a February 2026 preprint, not new measurements. The news is the peer review, not fresh data.
- **Non-reasoning models only.** Ten reasoning models were excluded because the data do not capture inference-time compute. The frontier conclusion is about the pre-reasoning training-scaling era. Whether it survives the reasoning era — where inference compute is a second scaling axis — is the open question, and the paper does not answer it.
- **One main benchmark.** MMLU-Pro carries the headline results, with MATH Level 5 as a robustness check. Neither is an agentic, coding, or labor-market-relevant eval.
- **Frontier compute for closed models is estimated.** Parameter and token counts for large proprietary models come from third-party estimates with substantial uncertainty. The authors re-ran the analysis excluding those observations and report the qualitative patterns hold.
- **Developer effects are averages, not destinies.** A 61x spread across developers and a 41x spread within a developer mean the label on the model card predicts far less than the recipe behind the specific model.

## What to do Monday

1. **Split your AI budget into two lines with different buying rules.** Frontier bets are priced on compute access. Product-tier models are priced on compute-per-capability: FLOPs (or dollars) to clear *your* quality bar on *your* eval. If a vendor cannot state the second number, do not renew a product-tier contract above your current spend — shop it against the cheapest model that clears your bar.
2. **Audit your own 90–10 spread before buying more compute.** Run your best and worst configs/recipes on the same task and measure the efficiency gap. If best-vs-worst exceeds 10x, fix recipe variance — data mix, fine-tuning, decoding, retrieval — before paying for a bigger run. The paper says the spread inside a single lab can reach 41x; your team is not exempt.

## Sources

- Mertens, Fischl-Lanzoni & Thompson, "Is there 'Secret Sauce' in large language model development?", *npj Artificial Intelligence* (2026), published Oct 14, 2026: https://www.nature.com/articles/s44387-026-00159-2
- Preprint with full results (arXiv:2602.07238v2): https://arxiv.org/html/2602.07238v2
