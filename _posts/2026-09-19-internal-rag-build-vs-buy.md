---
layout: single
title: "When should you stop renting tokens? The build-vs-buy crossover for internal RAG"
description: "Frontier APIs, managed open-model APIs, or self-hosted GPUs: a priced crossover model for internal RAG, with the breakeven points and the team tax nobody puts in the spreadsheet."
date: 2026-09-19 12:45:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - inference-economics
  - RAG
  - build-vs-buy
  - open-weights
  - agents
excerpt: "The GPU is cheap; the engineers aren't. Raw infra breaks even against frontier APIs at ~365M tokens/month — but the platform team moves the real crossover to ~23B."
---

> [中文版 Chinese version](/ai%20engineering/llms/internal-rag-build-vs-buy-zh/)

Every company onboards Anthropic or OpenAI the same way: an engineer wires up the API in an afternoon, the demo sings, and six months later finance forwards a token bill nobody budgeted for. It's the AWS story replayed — rent for elasticity, then discover at scale that you're renting what you should own.

The question is where "scale" actually starts. I priced it.

## The three tiers, with current numbers

All prices verified September 2026. Blended rates assume a 4:1 input-to-output ratio, typical for input-heavy RAG and agent workloads — and note the trap the field guide crowd keeps flagging: output tokens cost 5–8x input, so comparing input prices alone picks the wrong model.

| Tier | Reference price | Blended $/M tokens |
|---|---|---|
| Frontier API (Claude Sonnet 5: $3 in / $15 out) | [Anthropic pricing](https://www.worthview.com/claude-sonnet-5-is-here-anthropics-most-agentic-sonnet-model-closes-the-gap-with-opus-4-8/) | **$5.40** |
| Frontier API (OpenAI GPT-5: $1.25 in / $10 out) | [pricepertoken.com](https://pricepertoken.com/pricing-page/model/openai-gpt-5) | **$3.00** |
| Managed open 70B (Together AI Llama 3.3 70B: $1.04 / $1.04) | [together.ai/pricing](https://www.together.ai/pricing?ref=blogs.novita.ai) | **$1.04** |
| Self-host 32B-class on 1×H100 ($2.70/hr on-demand) | [RunPod/Lambda pricing](https://getdeploying.com/lambda-labs-vs-runpod) | **~$0.50 marginal** |

Side note: OpenAI cut GPT-5.6 Sol to $4/$20 for three months starting August 21 ([Reuters via quasa.io](https://quasa.io/insights/gpt-5-6-sol-output-falls-to-20-per-million-tokens-for-three-months)). The price war is real, and it only moves the crossover points — it doesn't remove them.

![Build-vs-buy crossover: monthly cost vs token volume, and annual cost at 10B tokens/month](/assets/images/posts/2026-09-19-internal-rag-build-vs-buy.png)

## The crossover points

Assumptions, stated plainly: one H100 at $2.70/hr costs $1,972/month and sustains ~1,500 tokens/sec on a 32B-class model (conservative — short-context serving benchmarks run 2–4x higher), i.e. ~3.9B tokens/month per GPU. A platform team of 2–3 engineers runs ~$1.5M/year fully loaded at Staff-level comp.

- **Raw infra vs frontier API: ~365M tokens/month.** That's roughly $2K/month in API spend. At 100M tokens per employee per month — normal once agents are in the loop — that's about **4 employees**. At 10M (heavy chat), ~37 employees. The raw crossover is shockingly small, and it's the number vendors hope you never compute.
- **Managed open APIs vs self-host: ~1.9B tokens/month.** The managed tier ($1.04/M, zero ops) captures most of the savings. Self-hosting only beats it once you're filling GPUs.
- **With a dedicated platform team: ~23.5B tokens/month vs API, ~122B vs managed open.** This is the crossover that matters, and it's two orders of magnitude higher than the raw-infra one. The GPU is cheap; the engineers aren't.

Panel B makes it visceral at 10B tokens/month: $648K/yr (Sonnet 5) vs $360K (GPT-5) vs $125K (managed open) vs $71K (self-host marginal) vs **$1.57M** (self-host + team). The team tax dominates everything.

## What to do Monday morning

1. **Compute your blended $/M, not your input $/M.** Pull last month's in/out split. If you're comparing $3 vs $1.25 input prices while your workload is output-heavy, you're doing the arithmetic wrong.
2. **If you're past ~350M tokens/month, price the managed open tier this week.** Together/Fireworks-class 70B serving at ~$1/M is 3–5x cheaper than frontier APIs with zero operational burden. For most companies, this is where the journey should stop.
3. **Self-host only with sustained volume *and* an existing platform team.** Past ~2B tokens/month with engineers already on payroll, self-hosting wins. Hiring a dedicated team for it needs ~20B+/month sustained to pencil out.
4. **Build the showback dashboard regardless.** When internal tokens cost $0, nobody effort-routes, caches, or distills — the cost converts into capacity contention everyone pays. A monthly "your team burned $X at API rates" number, with no actual charge, recovers the incentive to be efficient.

## Caveats, stated plainly

- **Quality parity is assumed and it's false at the top end.** A 70B open model is not Sonnet 5 on hard reasoning — that's exactly what the frontier premium buys. The answer is routing: frontier for the hard tasks, cheap tiers for the bulk. The gateway from Monday's post, again.
- **Self-host lines assume filled GPUs.** At 50% utilization your effective $/M doubles; internal tools spike 9-to-5 and idle at night. The API premium is elasticity insurance — the same reason most companies never leave AWS.
- **Throughput is the sensitive variable.** If your workload sustains 3,000 tok/s per GPU instead of 1,500, every self-host breakeven halves. Recompute with your own serving numbers before committing.
- **Compliance and data residency** can force self-hosting regardless of cost. Regulated data doesn't care about your crossover chart.

Thesis in one line: stop asking "API or GPUs" — the real build-vs-buy question is the team, not the hardware, and for most companies the answer is the managed open tier in the middle.

## Sources

- Anthropic Sonnet 5 pricing ($3/$15 per 1M, standard from Sep 1 2026): [worthview.com](https://www.worthview.com/claude-sonnet-5-is-here-anthropics-most-agentic-sonnet-model-closes-the-gap-with-opus-4-8/)
- OpenAI GPT-5 pricing ($1.25/$10 per 1M): [pricepertoken.com](https://pricepertoken.com/pricing-page/model/openai-gpt-5)
- GPT-5.6 Sol promotional cut ($4/$20 through Nov 21 2026): [quasa.io](https://quasa.io/insights/gpt-5-6-sol-output-falls-to-20-per-million-tokens-for-three-months)
- Together AI serverless pricing (Llama 3.3 70B $1.04/$1.04 per 1M): [together.ai/pricing](https://www.together.ai/pricing?ref=blogs.novita.ai)
- H100 on-demand rental ($2.59–$3.29/hr RunPod/Lambda, Sep 2026): [getdeploying.com](https://getdeploying.com/lambda-labs-vs-runpod)
- Output-token cost trap and caching multipliers: [dev.to field guide](https://dev.to/ninebox/the-real-cost-of-llm-apis-in-2026-a-developers-field-guide-4974)
