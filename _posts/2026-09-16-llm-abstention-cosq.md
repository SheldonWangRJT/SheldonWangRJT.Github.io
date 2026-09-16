---
layout: single
title: "Your LLM should answer fewer questions: a prompt-only abstention gate cut wrong answers 32%"
description: "A new arXiv paper (CoSQ, arXiv:2609.17516) shows a prompt-only answer-or-abstain gate cutting wrong-commitment rate from 13.1% to 8.9% across 11 model families — and argues your benchmarks are paying models to guess."
date: 2026-09-16 07:50:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - abstention
  - selective prediction
  - prompt engineering
  - evals
  - reliability
excerpt: "CoSQ's prompt-only abstention gate cut wrong-commitment rate 32% with 87.6% coverage — the cheapest reliability upgrade most LLM products are refusing to ship."
---

> [中文版 Chinese version](/ai%20engineering/llms/llm-abstention-cosq-zh/)

Your model is lying to you, and your benchmark paid it to.

A paper that landed on arXiv yesterday — "When Should LLMs Abstain? Chain-of-Self-Questioning for Selective Risk Control" (Ali Şenol, Tarsus University, [arXiv:2609.17516](https://arxiv.org/abs/2609.17516)) — makes an argument I find genuinely uncomfortable: most question-answering benchmarks implicitly reward commitment. A model that guesses on every item can post a respectable accuracy number even when it cannot tell which questions it actually knows the answer to. That is not a benchmark measuring knowledge. It is a benchmark measuring the willingness to bullshit.

## The mechanism: CoSQ in three stages

Chain-of-Self-Questioning is deliberately prompt-only — no training, no second model, works on black-box hosted models. Given a question, the model:

1. **Decomposes** it into required information units I(q) = {i₁, …, iₘ} — the facts that must be true for an answer to be supportable.
2. **Scores** the support for each unit (0–100).
3. **Gates**: in the primary variant (Grounded-CoSQ), it commits only if the mean score ≥ τ, otherwise abstains. The final answer is generated *only from the accepted units*, so it cannot be built on a premise the model itself rejected.

Two siblings provide neighboring operating points: Critical-CoSQ gates only on the units labeled "critical" (without which a correct answer is impossible), and Adaptive-CoSQ applies three simultaneous checks (mean ≥ τ, mean-critical ≥ 0.65, min-critical ≥ 0.40).

## The numbers

Evaluated on the 817-item TruthfulQA multiple-choice set across **eleven open-weight and hosted model families**, with the primary operating point prespecified at τ = 0.90 (swept over {0.50, 0.60, 0.70, 0.80, 0.90} first — the paper publishes the full sweep rather than cherry-picking one):

| Metric | CoT baseline (forced choice) | Grounded-CoSQ (τ = 0.90) |
|---|---|---|
| Wrong-commitment rate | 13.1% | **8.9%** (−32.1% relative) |
| Answered accuracy | 86.9% | **89.7%** |
| Coverage | 100% | 87.6% |

![Risk–coverage tradeoff of the CoSQ abstention gate](/assets/images/posts/2026-09-16-llm-abstention-cosq-risk-coverage.png)

Both improvements hold for all eleven models and at every evaluated threshold. Critical-CoSQ and Adaptive-CoSQ land at 88.6% and 86.5% coverage respectively, both still more reliable than baseline. A secondary Natural Questions Short-Answer evaluation gives convergent open-form evidence.

What I respect about this paper: it treats τ as an *empirical operating parameter*, not a calibrated probability — no false claims about the model "knowing its uncertainty." And the prespecified-threshold-plus-full-sweep discipline is exactly how you avoid the post-hoc threshold shopping that plagues this literature.

## Why this matters more than the paper

The real target of this paper isn't TruthfulQA. It's the incentive structure. As the author puts it, optimizing ordinary accuracy encourages models to guess rather than abstain. Every factual-QA surface you ship inherits that incentive: one accuracy number, and the model learns that "I don't know" scores zero while a confident wrong answer scores the same as abstention on the items it gets wrong.

In production, the economics are inverted. A confident wrong answer in support, legal, medical, or finance costs orders of magnitude more than a referral. Abstention looks like failure in a demo and like reliability in an incident postmortem — and the demo is what gets the budget.

## The caveats (generous but sharp)

Single-author paper, and TruthfulQA multiple-choice is a narrow bed: 817 items, and multiple-choice abstention is a cleaner decision than open-form abstention, where there's always *something* to say and just nothing true. The referral-cost model is assumed, not measured — in real products, "I don't know" carries UX cost and the paper doesn't quantify it. And there's no latency or token-cost accounting for the extra self-questioning stages, which matter when you're paying per token. Treat this as strong pilot evidence, not a settled engineering practice.

## What to do Monday morning

1. **Split your metrics today.** On any factual QA surface, report three numbers — answered accuracy, coverage, and wrong-commitment rate — not one. If you're only reporting accuracy, you are paying your model to guess. Zero cost, threshold-free.
2. **Prototype the gate this week: 1–2 days of prompt work, zero retraining.** (a) Ask the model to list the information units needed to answer. (b) Score each unit's support 0–100. (c) Commit only if the mean ≥ τ, else abstain or refer. Set τ by *your* error economics: the paper's 0.90 traded 12.4pp of coverage for a 32% relative cut in wrong commits. If a wrong answer in your domain costs more than a referral, 0.90 or higher is the right starting point; if it's low-stakes chat, don't gate at all.
3. **Run your own threshold sweep** (the paper swept 0.50–0.90; do the same on your eval set) and publish the full sweep — prespecified beats post-hoc. If the wrong-commitment reduction disappears outside TruthfulQA, you've learned the gate doesn't transfer, which is worth knowing *before* you ship it.

Prediction, for the record: by 2028, every serious enterprise QA eval will report a risk–coverage triplet, and single-number accuracy on factual QA will look as quaint as reporting perplexity alone.

**The debate:** abstention looks like failure in a demo and reliability in production — inside your org, whose metric wins: the demo's, or the incident postmortem's?

*Source: Ali Şenol, "When Should LLMs Abstain? Chain-of-Self-Questioning for Selective Risk Control," arXiv:2609.17516, published September 15, 2026.*
