---
title: "Design: Eval Harness for Agent Teams"
description: "System design: regression safety for 100+ engineers shipping agent changes daily — golden sets, CI integration, judge calibration, flakiness."
date: 2026-09-19
category: design
permalink: /agent-interviews/design/eval-harness/
tags:
  - Agents
  - Interview Prep
  - System Design
  - Evals
  - CI/CD
difficulty: Hard
excerpt: "100+ engineers, daily agent changes, <15 min evals: golden task sets, CI gates, LLM-judge calibration, flakiness handling, and blocking vs advisory."
---

## 🎯 Problem Statement

**100+ engineers** ship agent changes daily (prompts, tools, models, orchestration). Design the **eval harness** that keeps them from regressing production.

**Constraints:**
- **Eval suite must run in <15 minutes** (it's in the inner dev loop).
- **LLM judges are flaky** — the harness must be trustworthy despite that.
- **Cost budget**: evals run hundreds of times a day; $/run matters.
- **Ownership**: each team owns its agents; the platform team owns the harness.

## 📐 Architecture

{% mermaid %}
flowchart LR;
    Diff["Code diff"]-->Smoke["Smoke: 20 tasks, 2 min (blocking)"];
    Smoke-->|pass|Full["Full: 200 tasks, 15 min (blocks merge)"];
    Full-->|pass|Merge["Merge to main"];
    Merge-->Night["Nightly deep: 2k tasks + adversarial (advisory)"];
    Night-->Ticket["File tasks on regression"];
{% endmermaid %}

*Blocking policy is tiered: fast signal blocks fast, deep signal advises. Decided in advance, not on Friday at 5pm.*

{% mermaid %}
flowchart TD;
    Gold["Golden task set (human-verified)"]-->Judge["LLM judge scores"];
    Judge-->Agree["Judge-vs-human agreement metric"];
    Agree-->|drift|Calib["Tighten rubric, add few-shot examples"];
    Calib-->Judge;
    Agree-->|healthy|Trust["Trusted in CI gates"];
{% endmermaid %}

## 🧭 Discussion Framework

**1. What's in the harness**
- **Golden task sets per team**: curated, human-verified tasks representing real usage. Versioned alongside the agent code (eval v3 tests agent v3).
- **Tiered suites**: *smoke* (2 min, 20 tasks, runs on every diff) → *full* (15 min, 200 tasks, runs pre-merge) → *nightly deep* (2k tasks + adversarial set, not blocking).
- **Deterministic checks first**: schema validity, tool-call correctness, budget compliance — cheap and flake-free. LLM judges only where determinism can't reach.

**2. Taming judge flakiness**
- **Rubrics over vibes**: the judge scores against explicit criteria, with few-shot calibrated examples.
- **n-runs + statistics**: run contested tasks 3–5×, report pass rate with confidence intervals — not a single boolean.
- **Judge calibration pipeline**: continuously measure judge-vs-human agreement; alert when it drifts.
- **Pairwise comparison** for subjective quality (A vs B) instead of absolute scoring.

**3. CI integration**
- **Post-commit hooks** that run smoke evals automatically; results posted on the diff.
- **Blocking vs advisory**: smoke failures block; full-suite regressions block *merge to main*; nightly findings file tasks (advisory). The key judgment: which gate blocks which stage.
- **Attribution**: bisect-style — which change in the stack broke the eval? (Run evals per-diff in the stack, not just at the top.)

**4. Cost control**
- Cache deterministic results; sample (don't exhaustively run) the expensive judge evals on every diff; full runs on a schedule + pre-release.
- Track **$/eval-run** per team; budgets prevent tragedy of the commons.

**5. Dashboards & culture**
- Per-team pass-rate trends, flake rate, judge agreement — visible to everyone.
- **Eval-driven development**: the workflow is "write the eval first, then change the agent" — the harness shapes engineering culture, not just catches bugs.

## 🔍 Deep-Dive Questions

- **"An eval goes red on Friday at 5pm — block the deploy or not?"** → Depends on the tier: smoke red = block, always. Nightly-advisory red = file a task, ship if the oncall signs off. The *real* answer: this policy must be decided *before* Friday at 5pm, written down, and owned.
- **"How do you attribute a regression to one change in a 10-diff stack?"** → Per-diff eval runs (or bisection); plus keep prompt/model/tool versions pinned per run so the eval is reproducible.
- **"The team games the golden set (teaching to the test) — now what?"** → Rotate in held-out tasks the team never sees, add production-sampled tasks continuously, and track the gap between golden-set scores and production metrics. A widening gap *is* the signal.

## 💡 What Great Looks Like

The candidate designs **tiers with explicit blocking policies**, treats flakiness as a first-class engineering problem (statistics, not hope), and thinks about the *culture* the harness creates — evals as the agent team's unit tests, not a compliance checkbox.
