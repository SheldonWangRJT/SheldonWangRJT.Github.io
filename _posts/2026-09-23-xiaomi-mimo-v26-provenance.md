---
layout: single
title: "MiMo-V2.6: The Best Open Model Ever Shipped — and the Provenance Problem"
description: "Xiaomi's trillion-parameter MIT-licensed MiMo-V2.6-Pro tied Grok 4.7 on the Artificial Analysis index. Anthropic says it was trained by distilling Claude at industrial scale. Both can be true."
date: 2026-09-23 07:30:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - MiMo
  - open weights
  - model distillation
  - benchmarks
excerpt: "Xiaomi's MiMo-V2.6-Pro is the best open-weights model ever released. Anthropic's case GTG-16008 says it was built by laundering 400,000 Claude conversations. The open-vs-closed debate is now a provenance debate."
---

> [中文版 Chinese version](/ai%20engineering/llms/xiaomi-mimo-v26-provenance-zh/)

On September 21, a smartphone company released the best open-weights model ever measured — and ten days earlier, Anthropic had published a report accusing that same company of building its models by harvesting Claude's outputs at industrial scale. Both things are on the public record. I think they're both worth taking seriously, and together they change the open-vs-closed question into something harder: not "can open weights match the frontier," but "will you deploy a model whose training data is under active dispute."

## What Xiaomi shipped

MiMo-V2.6 comes in two flavors, both ungated on Hugging Face under the MIT license — no revenue cap, no research-only clause:

- **MiMo-V2.6-Pro**: 1.02 trillion total parameters, 42B active per token. Sparse MoE, 384 routed experts with 8 firing per token, a 70-layer backbone (60 sliding-window + 10 global attention layers), a 681M-parameter vision tower, dedicated audio encoders, and a speculative decoder predicting 7 tokens per forward pass. One-million-token context, omnimodal input (text, image, video, audio), text out.
- **MiMo-V2.6-Flash**: ~309B total, 15B active per token, same 1M context.

The RL story is the striking part. Xiaomi says Pro completed 30 RL steps over ~750,000 trajectories in under six days for roughly **$2.62 million**; Flash cost ~$850,000. One unified pass across coding, agents, vision, and cybersecurity — "You Only RL Once" — run by several dozen people under Luo Fuli, the ex-DeepSeek researcher who joined Xiaomi in late 2025.

And here's the part I want to praise before anything else: Xiaomi streamed the RL run live, then published 7,000+ RL environments, the training code, the technical report, and a 9B Qwen3.5 distill alongside the weights. That is the most reproducible frontier-class release anyone has ever done. No closed lab has ever handed you the gym, the coach, and the playbook.

## The numbers that matter

On the independent Artificial Analysis Intelligence Index v4.3, MiMo-V2.6-Pro scored **46.32** — the highest open-weights score on record:

![Artificial Analysis Intelligence Index: open weights tie a closed frontier model](/assets/images/posts/2026-09-23-xiaomi-mimo-v26-provenance.png)

Pro ties Grok 4.7 (46) and sits 5–7 points behind the closed frontier (Fable 5.1 and GPT-6 Astra at 53, Opus 5 at 51). On Xiaomi's own reported benchmarks: DeepSWE v1.1 at 71.9 vs Opus 5's 74.0 and GPT-5.6 Sol's 73.0 — close. Terminal Bench 2.1 at 89.9, CyberGym at 94.0. But ExploitBench: 47.9 vs Sol's 78.5 — a 30-point gap where it counts for security work. Treat every vendor-reported number with the usual discount; the AA index is the anchor because it's independent.

Then the price: Pro at **$0.435/$0.87 per million tokens** (in/out), Flash at **$0.14/$0.28**. Against Opus 5's $5/$25, that's 10–30x cheaper. Cost per index task: $0.13 — reportedly one-twentieth to one-sixtieth of leading closed models.

## The other shoe

On September 11, Anthropic published a threat-intelligence report on "illicit distillation": seven China-based labs — Alibaba, Moonshot, DeepSeek, Z.ai, MiniMax, SenseTime, and Xiaomi — allegedly ran covert campaigns to extract Claude's capabilities through networks of disguised accounts. Total volume: ~190 million exchanges between May and July, up ~12x from 16 million in February. Alibaba's was the largest.

Xiaomi's case is **GTG-16008**: Anthropic says that over a 20-day window in March–April 2026, Xiaomi funneled **400,000+ requests** to Claude through **1,500 distinct accounts** via proxy services, replaying real user conversations and coding sessions from its own MiMo chatbot through Claude using harnesses like OpenClaw and OpenCode. The alleged pipeline: reconstruct developer environments from transcripts, clean multi-turn conversations into training pairs, generate synthetic input-output exchanges, and use Claude as a judge on MiMo's own outputs. The bulk of it reportedly began just as MiMo-V2-Pro's free trial ended — the trial generated the developer traffic that fed the harvest.

Two caveats, stated plainly because they cut against my own thesis. First: this entire account is authored by Anthropic, describing attacks on its own product — no independent verification, no criminal charges, no lawsuits filed. Second: Xiaomi has not publicly commented in detail. Treat it as an allegation with numbers attached, not a verdict.

## Why this changes the build-vs-buy math

Here's the mechanism most coverage misses. If the closed teacher charges $5/$25 per million tokens and the open student — trained in part on the teacher's outputs — charges $0.435/$0.87, then the celebrated "open weights are 10–30x cheaper" story is partly **arbitrage on someone else's API bill**, not purely a training breakthrough. The $2.62M RL figure looks miraculous until you price the data pipeline that fed it.

This isn't hypothetical pricing pressure. Anthropic shipped Opus 5.5 on September 22 at $4/$20 — roughly 40% cheaper than Opus 5 on typical workloads — with "preserved thinking" controls explicitly designed to block reasoning-extraction. OpenAI dropped GPT-6 Sol and Luna at half the GPT-5.6 price ninety minutes later. The frontier labs are repricing in real time, and distillation is one of the forces doing it.

## What to do Monday morning

1. **Add provenance to your model-intake checklist.** One new line, this week: "any active extraction or distillation dispute involving this model family?" If yes, get legal to sign off on indemnity before the model touches customer data or proprietary code. MIT covers the weights; it doesn't cover the training-data liability.
2. **Benchmark Flash against your cheap tier before your next renewal.** MiMo-V2.6-Flash at $0.14/$0.28 undercuts GPT-5.6 Luna ($0.20/$1.20) and DeepSeek V4.1 Flash off-peak. Run your top-3 agent workflows on your own harness — Xiaomi's DeepSWE 71.9 vs Opus 5's 74.0 is on their harness, so apply the 5-point discount rule. If the gap holds under 5pp on your tasks at ~3% of Opus 5's input price, the closed premium needs a new justification in writing.

## The debate

Open weights just tied a closed frontier model on an independent index, with the most transparent release in history — streamed training, 7,000 environments, MIT weights. And the company behind it stands accused, with specific numbers, of building its models by laundering 400,000 Claude conversations. I don't think either fact cancels the other.

So here's the question I'd actually argue about: **if an MIT-licensed open model beats your closed vendor on your own evals, but that vendor says it was trained on 400,000 of its own stolen conversations — do you ship it?**

---

*Sources: Xiaomi release details via [AI Weekly](https://aiweekly.co/alerts/xiaomi-mimo-v26-pro-ties-grok-47-atop-open-weights-index), [temperature2](https://temperature2.com/p/2026-09-22-xiaomi-mimo-v2-6-open-source-live-rl-training/), [Unite.AI](https://www.unite.ai/xiaomis-new-flagship-model-leads-open-weight-rankings-with-a-score-of-46/), [DEV/AI Frontier Post](http://dev.to/aifrontierpost/xiaomi-open-sources-mimo-v26-a-trillion-parameter-model-takes-the-top-of-the-open-weights-3j2d); benchmark and pricing via [basic-tutorials](https://basic-tutorials.com/news/xiaomi-mimo-v2-6-new-ai-model-shakes-up-the-open-source-scene-anthropic-accuses-xiaomi-of-plagiarism/); Anthropic distillation report via [The Hacker News](http://thehackernews.com/2026/09/anthropic-says-seven-china-based-ai.html), [Forkast](https://forkast.news/anthropic-disrupted-xiaomis-industrial-scale-distillation-campaign-and-the-open-weight-ecosystem-should-pay-attention/) (Xiaomi GTG-16008 details), and [ervik.as](https://www.ervik.as/news/anthropic-china-distillation-week-review-2026-09-13) (caveats); Opus 5.5 / GPT-6 Sol pricing via [AI Weekly](https://AIWeekly.co/ai-news-today).*
