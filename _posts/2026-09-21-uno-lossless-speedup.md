---
layout: single
title: "Uno: the diffusion adapter that makes the draft model obsolete"
description: "IFM's Uno freezes a Qwen3-8B, adds 0.35B diffusion LoRA weights, and beats EAGLE-3 and DFlash at every batch size — lossless, no separate draft model, one shared KV cache."
date: 2026-09-21 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - inference
  - speculative-decoding
  - diffusion
  - open-weights
excerpt: "The draft model is dead weight: Uno's 0.35B diffusion adapter beats purpose-built draft models at every batch size — lossless, with a shared KV cache and 122 vs 130 GiB peak memory."
---

> [中文版 Chinese version](/ai%20engineering/llms/uno-lossless-speedup-zh/)

The paper is from September 3. I'm writing about it now because the release went production-shaped this week: open weights, open code, and third-party coverage reporting serving-stack support. That timing matters — an inference paper you can actually deploy is a different object than an inference paper you can only admire.

[Paper: arXiv:2609.04010](https://arxiv.org/abs/2609.04010) · [Code and checkpoints](https://s-sahoo.github.io/uno/) · from the Institute of Foundation Models (the K2 Horizon lab)

## The setup: why the sequential tax still matters

Autoregressive decoding generates one token per step — a hard sequential bottleneck. The field's two answers have both been compromises:

- **Speculative decoding** (EAGLE-3 and friends) is lossless, but it needs a *separate draft model*: train it, align it, version it, keep it in sync with the target, and serve two KV caches. The math is clean; the ops are not.
- **Diffusion LLMs** generate tokens in parallel natively, but they're lossy relative to a good AR model — and, crucially, their speedups vanish at large batch sizes (the Uno paper cites Wu et al. 2025, Fu et al. 2026, and the DiffusionGemma team on this). As the authors put it: *"Batch-size-one latency captures a narrow operating regime and may overstate speedups that diminish under concurrency."* Agentic workloads batch hard. A speedup that dies at batch 64 is a demo, not infrastructure.

Uno's bet: keep the AR distribution exactly, and learn to draw multiple tokens from it in parallel.

## What Uno actually does

Decouple the parameters into two sets: AR weights trained with the standard next-token objective (frozen), plus lightweight diffusion weights trained to generate token blocks in parallel. The diffusion weights are learned in a "Diffusion Distillation" phase the authors describe as negligible overhead on the training pipeline. A sampler family called **Ψ-Spec** then draws parallel tokens with AR-verified acceptance — the same rejection-sampling guarantee that makes speculative decoding lossless.

The concrete recipe for the open-weight experiment (**UnoQwen**, §5.2):

- Base: open Qwen3-8B checkpoint, AR weights frozen
- Per weight matrix: rank-128 LoRA adapter, α=256 → **0.35B trainable parameters** (~4.4% of the base)
- 3 epochs / 14.7B tokens on OpenThoughts3-1.2M, block-size curriculum B ∈ {2,4,6,8,12,16}, ~**32 hours on 32 H200s**

No separate draft model. One architecture, one shared KV cache.

## The numbers (paper's Table 2, Qwen3-8B)

![Uno vs speculative decoding on Qwen3-8B: system and per-request throughput](/assets/images/posts/2026-09-21-uno-lossless-speedup.png)

| | UnoQwen | EAGLE-3 | DFlash |
|---|---|---|---|
| System throughput, tok/s (max batch) | **5,733** | 4,944 | 5,351 |
| Per-request throughput, tok/s (batch 1) | **445** | 284 | 370 |
| Speedup vs base AR | 1.6× / 2.5× | — | — |
| Added parameters | **0.35B** | 0.40B | 1.05B |
| Peak memory, GiB | **122.2** | 130.0 | 130.1 |

The paper's headline numbers for the from-scratch 8B model: **up to 3× over the base AR model**, and up to 2× at the largest batch size the device supports. And on quality, the 8B from-scratch Uno beats the 26B DiffusionGemma and the proprietary Mercury 2 across agentic tool use, coding, and long-context reasoning benchmarks. A model one-third the size winning outright is the kind of result that makes you re-read the methods section.

Also worth noting: DFlash's drafter is 1.05B parameters — 3× Uno's adapter — and its training needs context length B·L versus Uno's constant 2·L. The draft model isn't just an ops burden; it's a training-cost burden too.

## What's genuinely good here

Credit where it's due, because the execution is senior:

1. **Open paper, open weights, open code.** The claim is checkable. That's the bar from the K2 Horizon release applied to their own follow-up work.
2. **Evaluated at realistic batch sizes** — the paper's own framing, and Uno holds its lead at the largest batch, where d-LLM speedups die. This is the evaluation discipline the field keeps asking for, practiced by the authors themselves.
3. **The training story is cheap enough to be real.** 0.35B adapter params, 32 H200s for 32 hours, per base model. That's a rounding error next to a pretraining run — it means a team could plausibly do this to *their* fine-tuned 8B without a research budget.

## The honest caveats

- **"Lossless" is the same guarantee speculative decoding already offered.** AR-verified rejection sampling preserves the target distribution in both. The paper itself doesn't even report accuracy for the lossless methods — "any differences arise from sampling randomness and numerical nondeterminism." The novelty is the *mechanism* (in-architecture adapter, no draft model), not the guarantee. Anyone selling this as "the first lossless speedup" is misreading it.
- **The 2.5×/3× headlines are vs the un-accelerated base AR model.** Against the best draft model (DFlash), UnoQwen is +7% on system throughput and +20% per request. That's a real win, not a regime change. If your team already runs speculative decoding well, this is an upgrade candidate, not an emergency.
- **One model class, one scale.** Everything above is 8B. The adapter is trained per base model — 14.7B tokens and a thousand H200-hours is cheap *for a lab*, but it's not zero, and generalization across model families is unproven.
- **No independent reproduction yet** at time of writing. These are IFM's numbers on IFM's harness. Treat them as the upper bound for your own capacity planning, not the planning number.

## What to do Monday morning

1. **If you run speculative decoding in production on an 8B-class model:** spend one sprint benchmarking the Uno adapter recipe against your current draft-model setup — on your traffic mix, at your p50 batch size. Switch only if you clear **≥15% sustained throughput at equal quality**. Below that, the retraining and rollout churn isn't worth a single-digit gain.
2. **If you're choosing an acceleration strategy for a new deployment:** price the draft model's *total* cost first — train, align, version, keep in sync with the target, serve a second KV cache. Uno's real edge isn't the 1.6×; it's deleting that entire line item. Any draft-model-based proposal now has to beat an in-architecture adapter by a wide enough margin to justify its ops surface.
3. **Capacity-planning rule:** haircut any vendor's max-batch throughput claim by **~25%** until you've reproduced it on your hardware with your traffic. The paper's numbers are honest, but they're still the author's hardware, the author's harness, the author's best config.

## The debate

If a 0.35B in-architecture adapter is lossless, shares the KV cache, and beats purpose-built draft models at every batch size — is there any reason left to train a separate draft model, or is speculative decoding's two-model era just… over?
