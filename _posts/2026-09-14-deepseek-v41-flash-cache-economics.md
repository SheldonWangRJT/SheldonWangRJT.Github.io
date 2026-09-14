---
layout: single
title: "DeepSeek V4.1-Flash: The Billable Unit Is No Longer the Model — It's the Cache"
description: "V4.1-Flash 'beats' Claude Opus 5 on DeepSWE 74.2 to 74.0 — a 0.2pp tie. The real story: $0.003/M cached tokens, 890 bytes/token KV cache, and what effort routing means for agent economics."
date: 2026-09-14 07:30:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - DeepSeek
  - inference economics
  - agents
  - benchmarks
  - KV cache
excerpt: "V4.1-Flash's 0.2pp DeepSWE 'win' over Opus 5 is harness noise. The substance: $0.003/M cached tokens and an 890 bytes/token KV cache that make cache-hit ratio the biggest lever in agent economics."
---

> [中文版 Chinese version](/ai%20engineering/llms/deepseek-v41-flash-cache-economics-zh/)

## The headline

DeepSeek released V4.1-Flash on September 10: a 552B-parameter mixture-of-experts model with a causal encoder-decoder (CED) architecture, a 1M-token context window, native vision, and MIT-licensed weights on Hugging Face. The vendor benchmark table — every model at maximum reasoning effort — shows DeepSWE v1.1 at 74.2 vs Claude Opus 5's 74.0 and GPT-5.6 Sol's 73.0; Terminal-Bench 2.1 at 90.6 vs 89.1 vs 88.8; CyberGym at 88.1; AutomationBench at 54.8. All verified against DeepSeek's own technical report and model card, not press coverage.

## What's genuinely good

The engineering here is real, and it deserves credit before the critique. The CED design splits the 40-layer transformer into a 20-layer causal encoder and a 20-layer decoder, so the model activates only 8B parameters per token during prefill (input) and 16B during decode (output) — a 552B backbone that reads cheaply and thinks expensively. Compressed Sparse Attention 2 plus FP4 KV caching compresses the global KV footprint to 890 bytes/token — roughly a quarter of V4-Flash's, a 437× reduction versus V1 — and the SWA Bounded Replay deployment trick cuts the persistent SSD/host-memory cache to roughly one-eighth. Single-token decode FLOPs grow only ~25% when context expands 256× from 4K to 1M tokens. Pretrained from scratch on 45T tokens. For input-heavy agentic loops — a coding agent re-reading the same repository all day — this is exactly the right optimization target, and it's the rare release where the architecture paper is more interesting than the score table.

## Three things the headline hides

**1. The 0.2pp "win" is a tie — and the vendor's own table proves it.** DeepSWE v1.1: 74.2 (Flash) vs 74.0 (Opus 5) vs 73.0 (Sol), all at reasoning effort 100. DeepSeek's own evaluation notes treat scores within 0.3 as equivalent (stated for their base-model comparisons; the principle travels). More damning for the headline: DeepSeek's own scaffold table shows the *same checkpoint* scoring anywhere from 65.5 to 74.2 on DeepSWE v1.1 across eight harnesses (Claude Code, Codex, OpenCode, Pi, mini-SWE, and three DeepSeek Harness modes) — an 8.7pp swing from the harness alone, more than forty times the 0.2pp gap to Opus 5. If you want my standing rule updated: on agentic benchmarks, treat any gap under ~9pp as a tie unless the harness is fixed and published.

**2. Every headline number runs at reasoning effort 100 — the least economical setting.** The technical report's own curve: raising effort from 25 to 100 lifts DeepSWE v1.1 from 66.0% to 74.2% and Terminal-Bench 2.1 from 82.4% to 90.6%, at roughly 2.5× the output tokens. The 60–80 range already recovers most of the maximum-effort accuracy at under half the token budget, while the final step to 100 makes agent trajectories 1.6–1.8× longer for marginal gains. DeepSeek's public API exposes presets low=50, high=75, max=100. The leaderboard config is not a production config — copying it into your agent stack burns ~2.5× tokens for single-digit-point gains.

**3. The table isn't uniformly good — read the whole row.** Terminal-Bench 3.0: 30.0 vs Opus 5's 43.3. Terminal-Bench 4.0: 31.2 vs 51.8. ExploitGym: 15.3 vs GPT-5.6 Sol's 33.7. GPQA Diamond: 90.9 vs Sol's 94.1. This model wins on SWE-shaped work and loses badly on terminal-ops-shaped work. That's not a flaw — it's the point: buy for your workload shape, not the headline cell. (Credit to DeepSeek for publishing the full row, including the losses. More vendors should.)

## The real story: the billable unit is the cache

Off-peak, DeepSeek prices cached input at $0.003 per million tokens (cache miss $0.15, output $0.60; peak hours — Monday–Friday 01:00–04:00 and 06:00–10:00 UTC — are exactly double). Now do the builder math: an agent that keeps a 500K-token reusable prefix (repo, tool definitions, system instructions) and hits cache across 100 requests burns 50M cached input tokens. That's **$0.15 on V4.1-Flash off-peak** versus **$15 on Kimi K3** ($0.30/M cached), **$20 on GPT-5.6 Sol** ($0.40/M), **$25 on Claude Opus 5** ($0.50/M). A 100–166× spread on the exact token class that dominates long-running agent workloads — for scores that, on several benchmarks, are within noise of each other.

![Cost of re-reading a 500K-token prefix across 100 agent requests (50M cached input tokens)](/assets/images/posts/2026-09-14-deepseek-v41-flash-cache-economics-cost.png)

The instrumentation hasn't caught up to the economics. VentureBeat's July 2026 survey of 170 enterprises found only 47% rigorously track AI compute cost and ROI, and just 31% named cost-per-million-tokens a primary infrastructure metric. If you're in the 53% that doesn't track it, you're negotiating blind: comparing models on uncached input price alone can obscure the fastest-growing component of your agent bill.

## Monday-morning checklist

1. **Log cache-hit ratio per agent task this week** — cached vs uncached input tokens, and cost per completed task. If >80% of your input tokens are cache reads, model choice is a second-order decision. Move schedulable batch agent jobs outside DeepSeek's peak window (Mon–Fri 01:00–04:00 & 06:00–10:00 UTC; everything else is off-peak).
2. **Route reasoning effort by task tier**: low/non-thinking for lint and routine edits, high (75) for feature work, max (100) only for genuinely hard debugging. Never copy leaderboard settings into production.
3. **Discount vendor agentic-benchmark gaps under ~9pp to ties** unless the harness is fixed and published — then re-run on your own traces before any migration. DeepSeek just handed us the receipts for why.
4. **Pin model identifiers and re-run golden evals after any vendor-side routing change.** DeepSeek announced V4-Pro API traffic would route to Flash starting September 14 — then walked it back after developer pushback and kept V4 Pro live with unchanged billing. Silent model swaps are a real dependency risk, and this week proved the community can push back on them.

## The debate

If a model with 100× lower cached-token pricing is within noise of the frontier on your agentic benchmarks, what exactly are you paying frontier prices for? My read: the frontier is becoming a latency-and-output-quality product for the hard 5% of tasks, and a cache-management problem for everything else. Where does the frontier premium still earn its keep on input-heavy workloads — terminal-ops, security, something I'm missing?

## Sources

- DeepSeek-V4.1-Flash model card and evaluation tables: [huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash)
- Technical report (PDF, §5.3.2–5.3.4): [huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/resolve/main/DeepSeek_V41_Tech_Report.pdf)
- Official pricing (Flash: $0.003/M cached input off-peak; peak = 2×): [api-docs.deepseek.com/quick_start/pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- Claude Opus 5 prompt-caching pricing ($0.50/M cache hits): [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Kimi K3 / GPT-5.6 Sol cached rates ($0.30/M, $0.40/M): [VentureBeat rate table, Sept 2026](https://venturebeat.com/technology/deepseek-v4-1-flash-debuts-with-0-003-1m-off-peak-cached-input-rate-and-benchmarks-eclipsing-gpt-5-6-sol-claude-opus-5)
- V4-Pro routing announcement and walk-back: [TechNode, Sept 10](https://technode.com/2026/09/10/deepseek-formally-launches-v4-1-flash-routes-v4-pro-requests-to-flash/) + [DeepSeek API docs footnote 2](https://api-docs.deepseek.com/quick_start/pricing/)
- Enterprise AI cost-tracking survey: [VentureBeat Pulse Research, July 2026 (n=170)](https://venturebeat.com/technology/deepseek-v4-1-flash-debuts-with-0-003-1m-off-peak-cached-input-rate-and-benchmarks-eclipsing-gpt-5-6-sol-claude-opus-5)
