---
layout: single
title: "Holo4 and the $1.22 Desktop Agent: Computer Use Is Becoming a Harness Problem, Not a Model Problem"
description: "H Company's 27B open-weight computer-use model scores 61.7% on OSWorld 2.0 at $1.22 per task — 75% of Opus 5.5's score at one-seventh the cost. The lift comes from a 10,000-task factory, 127B tokens of SFT, two merged RL experts, and a rebuilt harness."
date: 2026-09-30 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - computer-use
  - open-weights
  - agents
  - OSWorld
  - H Company
excerpt: "A 27B open-weight model reaches 75% of Opus 5.5's OSWorld 2.0 score at 1/7 the per-task cost — and the recipe that did it lifted a nano base from 21% to 76%. The moat moved from the model to the harness, the task factory, and the license."
---

> [中文版 Chinese version](/ai%20engineering/llms/holo4-computer-use-zh/)

On September 28, Paris-based H Company released Holo4, a family of generalist computer-use models: a 27B dense model and a 35B-A3B mixture-of-experts. One set of weights clicks and types on screens, writes and runs its own code, and calls MCP or API tools — the same model, called the same way, on desktop, web, Android, code sandboxes, and business APIs. (Source: [H Company on Hugging Face](https://huggingface.co/blog/Hcompany/holo4))

The headline number is honest about the gap. On OSWorld 2.0, the long-workflow desktop benchmark, Holo4-27B scores 61.7% against 81.8% for Claude Opus 5.5; the 35B-A3B MoE lands at 30.9%. But per-task cost tells the other half of the story. H Company's reported figures put Holo4-27B at **$1.22 per task** against **$8.48 for Opus 5.5** and **$9.07 for GPT-6 Astra** (73.5%). That is 75% of the frontier score at roughly one-seventh the per-task price — from a 27B model that fits on a single high-end GPU.

![OSWorld 2.0 score vs reported cost per task](/assets/images/posts/2026-09-30-holo4-computer-use-score-cost.png)

## The surprising part isn't the model. It's the recipe.

Holo4-27B is fine-tuned from Qwen3.8-27B — a base that scores 48.0% on OSWorld 2.0 in H's table. The +13.7pp lift came from post-training infrastructure, not a bigger foundation:

- **Agentic Task Factory**: internal pipelines that build verifiable interactive tasks from documentation alone — about 10,000 tasks so far (4k web apps, 3k MCP servers, 3k desktop/OS), including hybrid environments exposing the same state through both GUI and MCP. A task survives only if its verifier rejects near-misses.
- **SFT on 127B tokens**, roughly three-quarters of them successful agentic trajectories across desktop, web, MCP/API, and mobile.
- **Two RL experts, one merge**: asynchronous online RL trains two LoRA experts — one for desktop and web, one for terminal, MCP, and API — then merges them with equal weight and no further training.
- **A rebuilt harness**: H re-engineered the agent loop using OSWorld 2.0 failure analysis. The two biggest changes were durable memory that tracks hundreds of steps and a shell on the desktop machine itself.

And the recipe transfers. H applied the same post-training stack to NVIDIA's Nemotron 3 Nano Omni (as Holotron4 Nano): OSWorld 21.0% → 76.3% (+55.3pp), AutomationBench 19.4% → 35.6% (+16.2pp). "Nothing in it is size-specific," they write. That is the strongest evidence in the whole release that the moat is the factory and the harness, not the weights.

Efficiency shows up in token counts too. On a build-a-Pac-Man-clone task in Godot, Holo4-27B used 68 calls and 2.4M tokens against 197 calls and 11.4M tokens for the base model — roughly **5× fewer tokens** to get the job done. Token frugality is a cost axis most bake-offs never measure.

## The license cliff

Here is the part that changes deployment math. The two variants carry different licenses:

- **Holo4-27B: CC BY-NC 4.0** — non-commercial. Commercial use runs through H's API ($0.40/$3.00 per 1M input/output tokens).
- **Holo4-35B-A3B: Apache 2.0** — full commercial self-hosting ($0.30/$2.00 per 1M tokens on the API).

The commercially self-hostable variant scores 30.9% — half the 27B's score. If you rank by benchmark first and check the license later, you pick a model you cannot ship.

## Credit where it's due — and the caveats

H published **every trajectory** behind its public scores ([trajectories.hcompany.ai](https://trajectories.hcompany.ai), plus a Hugging Face dataset) for step-by-step replay. That is the auditability standard every vendor should be held to.

But read the chart the way H tells you to:

1. Cross-vendor rows ran in different harnesses at different effort levels (Opus 5.5 at max effort in Anthropic's harness; GPT-6 Astra on an 82-task offline subset). Treat the comparison as directional, not head-to-head.
2. The 61.7% is an average partial score; the task success rate is 41.5%. Partial credit flatters multi-step agents — always ask which number a vendor quotes.
3. 480 of AutomationBench's 600 public tasks fall in the split H collected training data from. On the 120 held-out tasks, Holo4-27B scores 49.3%. Private-set results are still pending.
4. Cost-per-task figures are estimated from each run's input/output tokens at the vendor's own API rates.

## What to do differently on Monday morning

1. **Replay, don't re-benchmark.** Take 30–50 of your own real desktop tasks and run them through H's open hai-agents harness with Holo4-27B (API, or non-commercial weights for internal eval) alongside your current frontier setup. Pay the frontier's per-task price only if your completion-rate delta exceeds your error budget — say, >10pp. The published 20pp gap is vendor-measured and harness-dependent.
2. **License before score.** Add a "commercial self-host license" column to your model-intake checklist *before* the benchmark column. Here the shippable option scores half as well; discovering that after the pilot is how quarters get wasted.
3. **Price per completed task, not per token.** Add "tokens per completed task" to every agent bake-off. Holo4's 5× token savings on the game build would never show up in a per-million-token price table.

So: is the last 20 points of OSWorld 2.0 worth a 7× per-task cost — or is the harness doing most of the work? A recipe that lifts a nano base model by 55pp suggests the answer is mostly the harness. And the benchmark that matters now isn't a leaderboard — it's a license-plus-cost-plus-harness triple, measured on your own tasks.
