---
layout: single
title: "Your AI Research Agent Can't Predict Which Experiments Will Work — But It Can Remember"
description: "Frontier LLMs explain at most half the variance in ML experiment outcomes zero-shot (R² = 0.49) — but feeding them logs of past experiments cuts selection regret 78%."
date: 2026-10-19 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - LLM
  - AI Research
  - Autoresearch
  - Evaluation
  - Experiment Prediction
excerpt: "Frontier LLMs explain at most half the variance in ML experiment outcomes zero-shot (R² = 0.49) — but feeding them logs of past experiments cuts selection regret 78%."
---

> [中文版 Chinese version](/ai%20engineering/llms/llm-experiment-prediction-zh/)

AI research agents can now propose ideas, write the code, run the training, and evaluate the result. The loop is closed — except for one step nobody had measured properly: can the model tell, *before* running an experiment, whether the idea is worth running?

Two October papers answer that question from opposite sides, and together they draw a clean line. Zero-shot intuition is weak and systematically shrunk. Logged experimental history is the upgrade that beats swapping models or cranking up reasoning.

## What the first paper did

Bansal et al. (Autolab AI, Institute of Foundation Models, MIT) built a dataset of 288 LLM-proposed ideas across eight MLE-bench Lite tasks — three scored by log loss (spooky author identification, dog breed identification, leaf classification), three by ROC AUC (tabular playground series May 2022, toxic comment classification, random acts of pizza), and two by RMSE (New York City taxi fares, denoising dirty documents). Baselines sat near the middle of each task's public leaderboard, leaving room for ideas to help or hurt.

Each idea was proposed *and* implemented by the same model, starting from a baseline: 4 ideas for the baseline, then 2 follow-ups for each of the 4 resulting solutions — 12 ideas per tree, 8 tasks × 3 proposer models (GPT-6 Astra, Claude Fable 5.1, Kimi K3) × 12 = 288 ideas. Nineteen were excluded (failed runs or no usable prediction), leaving 269 for analysis. Half the ideas were prompted to improve the score, half to worsen it — good-faith proposals, not deliberately broken changes — so outcomes sample both directions.

Five frontier models then predicted the outcome of every idea, at maximum reasoning, given the task, the current code with its score, the idea, and the code diff. Outcomes were normalized per task into standard deviations (σ) of actual changes, with sign flipped so positive always means improvement.

## The headline numbers

| Predictor | R² | Slope | Direction accuracy |
|---|---:|---:|---:|
| Claude Opus 5.5 | 0.49 | 0.61 | 82% |
| Claude Fable 5.1 | 0.41 | 0.57 | 78% |
| GPT-6 Astra | 0.38 | 0.56 | 76% |
| GLM-5.3 | 0.18 | 0.25 | 72% |
| Kimi K3 | 0.13 | 0.21 | 69% |

![R² of predicted vs actual ML experiment outcomes, by model](/assets/images/posts/2026-10-19-llm-experiment-prediction-r2.png)

Three things stand out.

**First, even the best model explains only half the variance.** Under the paper's Gaussian model, the idea Opus 5.5 ranks highest captures on average about 70% of the best idea's gain; Fable 5.1 captures 64%, GPT-6 Astra 62%, GLM-5.3 42%, Kimi K3 36%. Useful for triage — far from a replacement for running the experiment. The open-weight predictors (GLM-5.3, Kimi K3) are barely above noise.

**Second, every model shrinks reality.** All five slopes sit below 1.0, so all models underestimate the magnitude of large changes. An actual +2σ improvement shows up as roughly +1.2σ in Opus 5.5's prediction and +0.5σ in Kimi K3's. If you size plans, budgets, or roadmaps off a model's raw point estimate, you will systematically undersell the big wins — and the big losses.

**Third, direction is far more reliable than magnitude.** Opus 5.5 gets the sign right 82% of the time; excluding tiny changes (within ±0.25σ, where the sign may be training noise rather than idea quality) raises every model's accuracy further. Trust the sign; distrust the size.

## Prediction quality is task-dependent — wildly

Pooling hides the spread. Opus 5.5 reaches R² = 0.94 on toxic comment classification but only 0.39 on dog breed identification. GPT-6 Astra ranges from 0.81 on the tabular playground task to 0.02 on leaf classification. The two image tasks — dog breed identification and denoising dirty documents — are the hardest: even the best model reaches only R² = 0.39 and 0.43 there.

This is the number that should kill any "one predictor score" framing. A model that looks competent on text/tabular tasks can be near-useless on vision tasks, and vice versa. Any team deploying an LLM as an experiment gatekeeper needs per-task-family calibration, not a single headline R².

## What helps, what doesn't

**More reasoning helps — only the strong models.** From lowest to maximum reasoning, Opus 5.5 goes 0.35 → 0.49, Fable 5.1 0.31 → 0.41, GPT-6 Astra 0.28 → 0.38. Kimi K3 and GLM-5.3 barely move. Paying for max reasoning on a weak predictor buys nothing.

**More context helps — mostly the strongest model.** Removing the code diff degrades the three strongest models. Adding a data card plus the first 20 rows of data helps only Opus 5.5; only Opus 5.5's overall gain from idea-only to full prompt is clearly above noise. Context is not a free upgrade — it is a capability-gated one.

**The implementer barely matters.** On a separate set of 66 ideas implemented by both Fable 5.1 and Kimi K3, 58 landed within 0.25σ of each other and 25 gave the exact same score. Precise ideas reproduce regardless of who implements them; the exceptions are open-ended ideas that leave choices (e.g., which extra data to use) to the implementer, or runs that fail in one implementation. Prediction is well-defined because implementation is mostly not the bottleneck.

**No self-preference.** A model's residual on its own ideas exceeds other models' residuals on the same ideas by only +0.01σ on average (95% interval −0.06σ to +0.08σ). Models do not systematically favor their own proposals — a reassuring null in a literature full of judge self-preference findings.

## The fix: give the predictor a memory

The same week, Wang et al. (Amazon, UC Santa Cruz, Emory, Penn State, UC Santa Barbara) tested the other side of the coin: what happens when the predictor gets *records of past experiments* instead of just the current task? Their evaluation draws on over 2,600 experimental records from nine research environments spanning pretraining, post-training, and inference — more than 171,000 H100 GPU-hours of experimentation.

The results are the mirror image of the first paper:

- Research knowledge from real experimental experience improves predictions of unseen interventions in the same environment (Spearman +0.27).
- It transfers across environments: using only pretraining experience from OLMo3, Marin, and Nanochat, a research world model cut selection regret in the Qwen3 environment by 78% versus the zero-experience setting.
- In multi-round autoresearch under a fixed selection budget, in-environment and cross-environment research knowledge increased the best gain achieved by 15.8% and 11.6%, respectively.
- Across 13 language models, adding research knowledge improved intervention ranking *more* than changing models or increasing reasoning effort alone.

Read the two papers together and the architecture falls out: the predictor is not the product. The experiment log is. Zero-shot intuition caps at R² = 0.49; a predictor grounded in your own run history beats a model swap and beats more reasoning tokens. This also reframes the first paper's own framing — its authors note that prior work found models fine-tuned on past outcomes predict best, and that Wang et al. concurrently show past records improve predictions. The "intuition" the first paper measures is the cold-start case. Nobody who runs experiments for a living should stay in the cold-start case.

## What to do Monday morning

**1. Never let a zero-shot score kill or promote an idea alone.** Every auto-proposed idea entering your queue must carry two things: the model's predicted change, and at least 3 nearest past runs from your own log (same task family or same intervention type, with their actual outcomes). No past runs on file → the idea goes to a cheap pilot lane, not the main queue, and not the trash.

**2. Log every run — including failures — as structured records.** One append-only ledger: idea, code diff, config, outcome in σ units against the baseline, seed, cost. Re-rank the backlog against that ledger weekly. The second paper's lesson is that this ledger is not bookkeeping overhead; it is the highest-leverage input to your predictor. After ~20 logged runs in a task family, stop evaluating the predictor cold — evaluate it with the ledger in context.

**3. Use direction, not magnitude, for go/no-go — and correct for shrinkage.** Treat the model's sign as a weak signal (best case ~82%) and its point estimate as a shrunk one: if you must plan off it, inflate predicted magnitudes by roughly 1/0.61 ≈ 1.6× for the best model, and widen the error bars. Never size a training budget off an uncorrected point estimate.

## Caveats

The first paper's limits are stated plainly and they matter. Each idea ran once, so part of every measured change is training noise and the ceiling for a perfect predictor is unknown. The eight tasks are small ML problems, not LLM training runs — whether R² = 0.49 generalizes to pretraining or large-scale RL is untested. And the study predicts single ideas, not sequences; a model that is mediocre at one-step prediction might still steer a multi-step search well (or badly). The second paper's environments are LLM-research settings, which is closer to the frontier use case but still not a proof that any team's internal log will transfer at 78% regret reduction — that number is one cross-environment demonstration, not a guarantee.

Still, the joint message survives the caveats: prediction without memory is a coin flip with extra steps on the hard tasks, and memory is the cheapest capability upgrade in the stack. If you are building autoresearch, build the ledger first and the predictor second.

## Sources

- Bansal, Pareja, Klein, Didenko, Lukoianov, "Can LLMs predict the outcomes of machine learning experiments?", arXiv:2610.22599, submitted Oct 15, 2026 — https://arxiv.org/abs/2610.22599
- Wang et al., "Language Models as AI Research World Models", arXiv:2610.12235, submitted Oct 8, 2026 — https://arxiv.org/abs/2610.12235
- Dataset released with the first paper: https://github.com/autolab-ai/EV-estimation
