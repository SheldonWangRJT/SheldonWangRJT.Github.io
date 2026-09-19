---
title: "Design: Multi-Agent UI Verification Pipeline"
description: "System design: verify mobile UI reimplementations against specs across device configurations — spec compiler, navigator, comparator with schematized handoffs."
date: 2026-09-19
category: design
permalink: /agent-interviews/design/ui-verification/
tags:
  - Agents
  - Interview Prep
  - System Design
  - Multi-Agent
  - Testing
difficulty: Hard
excerpt: "3-layer subagent pipeline for UI verification across dark mode/RTL/locales: typed handoffs, deterministic verdicts, flakiness control, CI integration."
---

## 🎯 Problem Statement

Design a **multi-agent pipeline that verifies mobile UI reimplementations against design specs** across a combinatorial matrix: device sizes × dark mode × RTL × locales.

**Constraints:**
- **Combinatorial explosion**: you cannot screenshot-test every combination naively.
- **Deterministic verdicts needed**: CI must get pass/fail, not "looks okay-ish."
- **Flakiness kills trust**: one flaky failure and teams ignore the whole system.
- **Must integrate into CI** with bounded runtime.

## 🧭 Discussion Framework

**1. The 3-layer architecture**
- **Layer 1 — Spec compiler**: parses the design spec (Figma, written spec) into a **typed assertion list**: `{screen_id, elements[], assertions[]}` (e.g., "button X is 16pt below header, uses primary color").
- **Layer 2 — Navigator**: drives the app (real device/farm or emulator), performs the action trace to reach each screen, captures screenshots across configurations. Handles *known and unknown UI node states* autonomously — this is where the agent earns its keep.
- **Layer 3 — Comparator**: takes screenshots + assertions, produces a **structured verdict**: `{verdict: pass/fail, diffs[]}` with annotated regions.
- **Schematized handoffs between layers**: each layer's output is validated against a schema. Layers are independently testable and replaceable.

**2. Deterministic control flow, autonomous details**
- The *orchestration* is deterministic (which screens, which configs, in what order, retry policy). The *autonomy* lives inside bounded tasks (navigating an unexpected dialog, recovering from a missed tap).
- This separation is the key design decision: **determinism where you need trust, autonomy where you need adaptability**.

**3. Taming the combinatorial matrix**
- **Pairwise / sampled coverage**: not every combination — cover each *pair* of dimensions, plus risk-weighted full combos for critical screens.
- **Configuration diffing**: render once per unique *rendering-relevant* config; many combos are visually identical.
- **Prioritization**: critical user journeys get full matrix; secondary screens get sampled.

**4. Flakiness control (the make-or-break)**
- **Deterministic environment**: pinned OS versions, fixed test data, disabled animations, mocked clocks/network.
- **Tolerance bands**: 1px rounding diffs, anti-aliasing variance, font rendering differences — the comparator must distinguish *rendering noise* from *real regressions*. Calibrate tolerances on known-good runs.
- **Quarantine**: flaky assertions get quarantined automatically (tracked, not silently dropped) instead of failing the build.
- **Alert fatigue math**: if the false-positive rate exceeds ~1%, engineers stop looking. Design to that number explicitly.

**5. CI integration & cost**
- **Bounded runtime**: parallelize across screens/configs; nightly full matrix, per-PR critical-path subset.
- **Cost per screen** as the tracked metric; optimize the expensive layer (usually navigation time on device farms).

## 🔍 Deep-Dive Questions

- **"Comparator says 'different' but it's a 1px rounding diff — how do you avoid alert fatigue?"** → Tolerance bands calibrated from known-good runs + perceptual diffing (not pixel diffing) + quarantine with tracking. The verdict schema should include a *confidence* and *diff class* (noise vs real), not just pass/fail.
- **"How do you scale to 10k screens nightly?"** → Parallelism across a device farm, sampled (not exhaustive) configs for non-critical screens, incremental verification (only re-verify changed screens + dependents), and aggressive caching of unchanged renders.
- **"The navigator gets stuck on an unexpected system dialog — design the recovery."** → Bounded recovery budget: dismiss-and-retry with a dialog classifier, then escalate to a structured "blocked" verdict (with screenshot) rather than hanging. A clean blocked verdict is a feature, not a failure.

## 💡 What Great Looks Like

The candidate **separates deterministic orchestration from bounded autonomy**, makes handoffs typed and testable, treats flakiness as a quantified design constraint (not bad luck), and can say exactly what they'd *stop* testing when the budget runs out — because in production, the budget always runs out.
