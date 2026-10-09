---
layout: single
title: "Agent in a Bottle: 48 of 60 Agent Runs Lost to Their Own Zero-Shot Score"
description: "The BOTTLED benchmark (arXiv:2610.08775) asked 10 models to compile themselves into cheap artifacts for repetitive workloads. Most failed — but the best case kept 82% of quality at roughly 657x lower cost."
date: 2026-10-09 07:58:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - agents
  - inference-economics
  - distillation
  - benchmarks
excerpt: "Strong zero-shot models are mostly bad at bottling themselves: 48 of 60 runs scored below their own zero-shot confidence bound, and 31 of 60 lost to a plain distillation baseline on the same budget."
---

> [中文版 Chinese version](/ai%20engineering/llms/agent-in-a-bottle-bottled-zh/)

Every production team running an LLM over millions of similar items — relevance labels, ticket tags, extraction fields — eventually asks the same question: why are we paying frontier prices per call for a task this repetitive? The obvious fix is to let a strong agent build the cheap replacement itself: train a small model, or write a reusable program, once, and then run that artifact at scale.

A new benchmark, BOTTLED, from Sonthalia, Puerto, Rubinstein, Gubri and Oh (arXiv:2610.08775, submitted October 6, 2026), tests exactly that ability. The authors call it "bottling": turning a general capability into a task-specific solution that balances quality against amortised cost.

## How the test works

Agents receive an entire unlabelled workload, plus fixed budgets for time, compute and LLM API calls. They choose their own strategy — distil a small model, write a program, or something else — and are then scored on the full workload. The study runs 10 models across 3 tasks, for 60 bottling runs in total, and compares each run against two reference points: the same model's zero-shot performance, and two small-model distillation baselines given the same token budget.

## The headline result is a failure rate

- 48 of 60 runs (80%) scored below the lower bound of the 95% confidence interval of their own model's zero-shot performance. In plain terms: in four out of five attempts, the "optimised" artifact was measurably worse than just calling the model directly.
- 31 of 60 runs (about 52%) underperformed the stronger of the two plain distillation baselines on the same token budget. The agents were not just losing to zero-shot — half the time they lost to the boring baseline they were supposed to beat.
- Models with similar zero-shot scores diverged sharply after bottling. Zero-shot leaderboards do not predict bottling skill; it is a separate capability, and today it is mostly absent.

![BOTTLED results: failure shares and the Opus 5 best case](/assets/images/posts/2026-10-09-agent-in-a-bottle-bottled-chart.png)

## The upside, when it works, is enormous

On query–product relevance classification, the paper reports that Opus 5's bottled artifact retained about 82% of its zero-shot macro-F1 at roughly 657 times lower reported cost. Against Jev — a purpose-built "system one" model designed specifically for cheap, repetitive inference — the same artifact recovered about 94% of Jev's macro-F1 at a quarter of Jev's projected full-workload cost.

That is the real story: the expected value of bottling is high, but the hit rate is low. This is a portfolio bet, not a default optimisation.

## What to do on Monday

1. Gate the project on volume. Bottling only amortises above roughly 1M similar calls per quarter. Below that, prompt the frontier model and spend the engineering time elsewhere.
2. Run the boring baseline first. Before any agent touches the workload, train the plain small-model distillation baseline on the same token budget. In BOTTLED it beat the agent 31 times out of 60 — if your agent cannot clear it, ship the baseline.
3. Set a kill rule in advance: keep the artifact only if it retains at least 90% of zero-shot quality on a held-out slice at at most 1/50th of the per-call cost. Otherwise revert to direct calls and log the attempt as a cheap experiment.

## The open question

If bottling is a distinct skill — investing a fixed budget into a reusable asset rather than answering the next prompt — should we be benchmarking and training for it directly, instead of assuming it emerges from general capability? BOTTLED suggests it does not emerge. The labs that train for it explicitly may own the economics of high-volume inference.

Source: Sonthalia et al., "Agent in a Bottle: Can LLM Agents Turn Their Capabilities Into Cheap, Scalable Artifacts?", arXiv:2610.08775 (October 6, 2026). All figures above are from the paper's abstract and are the authors' reported results.
