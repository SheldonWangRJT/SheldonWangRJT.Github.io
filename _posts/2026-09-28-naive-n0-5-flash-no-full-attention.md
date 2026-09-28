---
layout: single
title: "2,122 tok/s, Zero Full-Attention Layers: Reading Naive-N0.5-Flash Carefully"
description: "A 309B open-weight model with no full-attention layers at native 1M context is a genuine milestone — but the 2,122 tok/s headline becomes 50 tok/s in serving. Read the footnotes."
date: 2026-09-28 07:30:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - open-weights
  - inference
  - sparse-attention
  - long-context
  - AI R&D
excerpt: "A 309B model with zero full-attention layers at native 1M context — and a 2,122 tok/s headline that becomes 50 tok/s in serving."
---

> [中文版 Chinese version](/ai%20engineering/llms/naive-n0-5-flash-no-full-attention-zh/)

NaiveAI, a Beijing lab, just released Naive-N0.5-Flash: a 309B-parameter mixture-of-experts model with only 15.5B active parameters, native 1M-token context, MIT-licensed weights — and, to my knowledge, the first model at this scale with **zero full-attention layers** in the entire network. The BibTeX title is "Building Frontier AI with AI," and the launch blog leads with a 2,122 tokens/sec throughput figure.

Both halves of that pitch deserve a careful read. One is a genuine milestone. The other is a masterclass in how to read vendor numbers.

## What's genuinely new

The architecture. All 48 transformer layers are local or sparse: **39 sliding-window attention layers** (128-token window) plus **9 DeepSeek Sparse Attention layers** (a lightweight indexer scores the full history; the backbone attends to the top 2,048 tokens). The stack is organized as eight six-layer modules at roughly a 5:1 SWA–DSA ratio. They replaced the original MLA-based DSA with grouped-query attention (4 KV groups) and built a 16-query-head indexer that cut index-selection wall time by 44% relative to the original DSA implementation — while, they report, preserving agent-task performance at 1M context.

This matters because full attention has been treated as the non-negotiable part of long context. Sliding windows and sparse attention have existed for years, but they've usually been bolted onto a model that still kept some dense global layers as a safety net. Naive-N0.5-Flash deletes the safety net: at million-token context lengths, their own writeup says the global layers accounted for most of the decoding overhead, so they converted them to sparse and retrained. It's an existence proof that dense attention is optional at 1M context — at 309B scale, with ~5% of parameters active per token.

The training recipe is also unusually well documented for an industry release. Starting from Xiaomi's open-weight MiMo-V2.5 base, they ran **3.25T tokens** at native 1M context in three stages:

1. **Indexer warmup (50B tokens):** only the new DSA indexer trains, everything else frozen; the layers being converted keep full attention temporarily and provide the supervision signal via a KL-divergence loss aligning indexer and backbone attention. A clean way to bootstrap a sparse retriever from a dense teacher.
2. **Sparse-attention continued pretraining (3T tokens):** the model switches to sparse execution at fixed learning rate, focused on AI R&D and coding.
3. **LR decay / SFT (200B tokens):** supervised fine-tuning with the sparse execution path while the learning rate ramps down.

Plus genuine infrastructure detail: hybrid sequence parallelism (Ulysses for DSA layers, a halo scheme for SWA that cuts communication from O(L) to O(w)), operator-granularity activation offloading, and a training system that pushes 1T tokens in ~4 days on 512 GPUs at 1M context. They even credit the open substrate — Xiaomi's MiMo team, DeepSeek's DSA work, SGLang — in the acknowledgments.

## The 42× footnote

Now the headline number. "Up to 2,122 tokens/s" is real, measured, and disclosed — and it is a **single-stream, decode-only, best-one-second-window** measurement on 8 GPUs, thinking off, across 41 HTML/SVG generation requests at temperature 0.4, with prefill excluded. Their own "Standard mode" serving figure: **50 tokens/s per user**. That's a 42× gap between the headline and what anyone actually gets.

To be fair, NaiveAI gives the honest mechanistic argument for why single-stream speed is the right thing to optimize *for their workload*: in 1M-context RL rollouts, ingested tokens arrive at 5,000–10,000 tok/s while generated tokens arrive at 50–100 tok/s — but generated tokens are ~60–80% of wall-clock, long rollouts become stragglers, and batching can't shorten an individual stream. Per-stream decode speed is genuinely the binding constraint for RL. And the engineering is real: a full speculative-decoding round went from 12.3 ms under SGLang to 3.4 ms (a 72.4% reduction), with bitwise-deterministic sampling so rollouts don't silently train off-policy.

But nobody buying API tokens is running single-stream RL rollouts on 8 GPUs. For everyone else, the number that matters is 50. The lesson generalizes: **price on the serving number, not the benchmark number.**

## "Built by AI" — with a human kill switch

The "AI-centered R&D" framing is the part of the launch that will get quoted, and it deserves both credit and a discount.

Credit: the process is unusually transparent. AI models explored the hybrid architecture and ran ablations; the NaiveRT runtime was built in **6 days across 151 documented optimization trials** — 63 adopted, 71 failed validation or rolled back, 17 exploratory. The AutoWM case study is the strongest evidence: a researcher set the objective, compute budget, and eval protocol for a world model (a domain outside the lab's expertise), and the model ran 400 hours over 15 major experimental rounds, including *changing the research setup itself* — rewriting captions, expanding the dataset 2.5K → 22.5K clips, reframing frame selection as a knapsack problem solved with dynamic programming. Final score: **77.43** on WorldArena-1 Track 1 vs. the previous published best of 73.64. That's not autocomplete; that's an experimental loop.

The discount: humans set the direction, constraints, and acceptance criteria at every step, and the most instructive datapoint is the one they killed. A proposed MoE kernel fusion went through **seven rounds** of implementation — every version numerically correct — and every version regressed end-to-end performance, so human researchers stopped the direction. The AI also proposed a short-context bypass that saved 3 μs at 200 tokens and cost 3 μs at 2,200; rejected. Their own summary line is the best sentence in the launch: **"A faster microbenchmark is not a faster model."** The AI was a very fast junior engineer with excellent instrumentation, working under tight human review. That's genuinely impressive and genuinely not autonomous research.

## The numbers I'd act on

**Price:** hosted API at $0.10/$0.40/$0.01 per million input/output/cache-read tokens — aggressive for a 1M-context coding model, and the MIT license means the weights are enterprise-usable without gating. (Self-hosting needs FP8-capable NVIDIA GPUs; the checkpoint is ~315 GB.)

**Eval hygiene, praised:** they disclose the harness for their own scores (Claude Code 2.1.207, 1M context, temp 1.0/top-p 0.95, basic file I/O + Bash) and name the source of every competitor score per benchmark — vendor blogs, model cards, leaderboards. Their AI-R&D benchmark scores come from their own in-house harness, which they say outright. This is how you publish vendor numbers: sourced, reproducible, caveats attached.

**Eval hygiene, demanded of everyone else:** within hours of release, aggregator sites were already publishing hallucinated specs — one claimed Apache 2.0 licensing, $0.15/$0.60 pricing, 12T training tokens, and benchmark numbers that appear in no primary source. Every one of those contradicts the model card. If you're citing a number that isn't from naive.ai or the Hugging Face card, you're citing fiction.

## Monday morning

1. **Throughput hygiene (do this before your next vendor pricing call):** for any "tok/s" claim, demand three numbers — single-stream vs. multi-user, decode-only vs. end-to-end including prefill, and GPU count. If the vendor can't produce all three, budget on their Standard/serving figure, not the headline. Here that's a 42× haircut (2,122 → 50).
2. **Long-context bake-off rule:** for any workload above 128K context, add one no-full-attention candidate to your next eval. This release is an existence proof at 309B/1M that the quality floor holds without dense attention — and sparse attention is what makes the KV-cache economics work. If the sparse model lands within 2pp of your dense incumbent on *your* task eval, take the cheaper one.
3. **Audit "AI did the research" claims the way they did:** demand the trial log. 151 trials, 63 adopted, 71 rolled back — and note who killed the bad directions (humans, after 7 rounds). Any lab claiming autonomous R&D without an adoption/rollback ratio and a human-intervention count is selling a press release, not a result.

## The debate

Naive-N0.5-Flash settles one question — dense attention is optional at 1M context — and sharpens another: if a sparse-attention model at $0.10/$0.40 with MIT weights is competitive on coding and agentic work, what exactly is the remaining premium for dense-attention frontier models buying you? My answer: the evals that only frontier labs run, and the tasks where the indexer picks the wrong 2,048 tokens. What's yours?

![NaiveRT throughput and latency: peak claim vs serving reality](/assets/images/posts/2026-09-28-naive-n0-5-flash-throughput.png)

*All figures verified against the primary sources: [NaiveAI technical blog](https://naive.ai/en/research/) and the [Naive-N0.5-Flash Hugging Face model card](https://huggingface.co/NaiveAI/Naive-N0.5-Flash) (accessed Sep 28, 2026).*
