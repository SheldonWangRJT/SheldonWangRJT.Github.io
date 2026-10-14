---
layout: single
title: "The Model Didn't Learn. The Rulebook Did: Memento 3 and the Case for Memory Outside the Weights"
description: "Memento 3 turns a frozen Claude Opus 5 into a 100.0-RHAE ARC-AGI-3 system with an editable rulebook, compiled code, and exact-replay verification — and the honest margin over the best prior harness is +1.0 point."
date: 2026-10-14 08:15:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - agents
  - world models
  - ARC-AGI-3
  - memory
  - Memento 3
excerpt: "A frozen model scored 100.0 on ARC-AGI-3. The weights never changed — a Markdown rulebook did the learning."
---
> [中文版 Chinese version](/ai%20engineering/llms/memento-3-rulebook-zh/)

A frozen Claude Opus 5 just scored 100.0 on ARC-AGI-3 — 59.3 points above its own raw score. The weights never changed. What changed was a Markdown file the agent rewrites as it plays.

That is the headline result of Memento 3 (Haoyu Zhao, Zhengxu Yu, Zhiyuan He, Meng Fang, Rasul Tutunov, Haitham Bou-Ammar, Weilin Luo, Jun Wang — UCL, Huawei Noah's Ark Lab UK, University of Liverpool), posted to arXiv on October 8, 2026. The paper's real contribution is not the score. It is a concrete architecture for learning that lives outside the weights — and an unusually honest set of tables showing exactly how much of the win belongs to that architecture.

## What happened

On all 25 public ARC-AGI-3 games, the single-model Memento 3 agent:

- Cleared every level of every game, reaching the mean Relative Human Action Efficiency (RHAE) ceiling of **100.0**.
- Used **7,518 actions**, **44%** of the **17,135**-action human baseline (per-game ratio 0.20–0.67, median 0.42).
- Beat raw Claude Opus 5 on the ARC Prize Standard harness (**40.7** mean RHAE) by **59.3 points**.

The backbone is Claude Opus 5 running inside Claude Code at extra-high reasoning effort. Every baseline number comes from that system's official ARC Prize scorecard, so the columns are counted the same way.

![Memento 3 vs baselines on ARC-AGI-3](/assets/images/posts/2026-10-14-memento-3-rulebook-chart.png)

## How it works: Code as Model

The agent maintains two representations of what it believes about the world:

1. **A natural-language rulebook** (a Markdown file) — persistent semantic memory holding revisable hypotheses about objects, actions, dynamics, and goals. Unknown aspects stay deliberately underspecified.
2. **An executable Python module** compiled from the rulebook — used for prediction and planning.

The loop is observe → reflect → revise the rule → compile → verify. A rule-level change is written to the rulebook first, then the code is refined; an implementation-only diagnosis leaves the rulebook intact and fixes only the code.

Two verification gates decide whether an update is accepted:

- **Cell-exact replay**: the executable must reproduce every observed transition in the interaction history. This is the hard gate.
- **Rulebook fidelity**: the LLM judges whether the code is faithful to the rulebook. This is the soft gate — the same model grading its own homework, which is worth naming plainly.

Two more design choices matter as much as the loop:

- **Git memory.** The rulebook and compiled modules live in a version-controlled workspace, committed after each iteration. The agent can inspect earlier versions, diff two rulebooks, and restore an executable a later edit broke. The learning trajectory is addressable, not just the latest snapshot.
- **Population.** A generalization holds N rulebook–executable pairs in parallel against a shared interaction history. Different models guide exploration; any pair whose prediction conflicts with an observation gets repaired. This is an explicit answer to the version-space problem: finite evidence leaves many hypotheses consistent with the past but disagreeing about the future, and committing to one can steer exploration away from the evidence that would falsify it.

## The Pong case study: the same mechanism does control

ARC-AGI-3 is discrete planning. The paper asks whether the same rulebook mechanism supports feedback control, where decisions update continuously from new observations. In Atari Pong (ALE, frame-skip 4), the learned model drives a feedback controller:

- **21:0 wins in all three evaluated episodes** with different openings (3,358 / 4,014 / 5,039 actions).
- **9,504 emulator frames** of learning cost — vs ~400,000 for EfficientZero V2 (about **42×**) and 200M for model-free RL baselines (about **21,000×**).
- The same LLM with no world model, one call per frame and no persistent memory, scores **−19**. Human average is 14.6.
- During evaluation the controller is fixed and makes **zero LLM calls** — the knowledge has been fully compiled out of the model and into the rulebook + code.

## The honest read: what the rulebook actually bought

This is where the paper earns trust — and where a careless summary would oversell it.

**The +59.3 gap is vs the raw model, not vs the field.** The closest prior system, Rodionov's baseline1, already scores **99.0** RHAE and clears all 25 games in **8,347 actions**. Memento 3's margin over the best prior harness is **+1.0 RHAE and 10% fewer actions** (7,518 vs 8,347). Baseline1 also maintains a persistent, verified Python world model. The paper's related-work section says so explicitly. What Memento 3 adds on top is the natural-language rulebook layer, the population extension, Git memory, and the Pong control transfer — not the idea of a code world model itself.

**The ablation is small.** Removing the rulebook (keeping code model, verifier, harness, backbone identical) was tested on 3 games (one per difficulty band): **617 vs 677 actions (−9%)** and **678 vs 830 agent turns (−18%)**, with completion held constant. Real, but a 3-game ablation, and the paper is upfront that runs are expensive.

**The population result is one game.** N=2 on wa30 (the game with the largest human baseline): **899 → 597 actions (−34%)** at RHAE 100. One game, one comparison — promising, not established.

**Public games only.** All results are on the 25 public games of a 135-environment benchmark. There is no held-out or private-set result in the paper. ARC-AGI-3's public games are the ones every system in Table 1 is measured on, so the comparison is fair — but "solves ARC-AGI-3" means the public set, not the benchmark's full distribution.

**Cost is undisclosed.** The paper notes each Claude Code run incurs "substantial time and monetary cost" but reports no token or dollar figures. Action-efficiency is not cost-efficiency: an agent that uses fewer environment actions while burning extra-high-effort reasoning on every revision may still be the expensive option. Do not quote 44%-of-human as a cost saving.

## So what do you do differently on Monday?

**1. Give stateful agents a persistent rulebook + a replay verifier — not a longer prompt.** If your agent touches a stateful environment (a repo, infra, a data pipeline), its durable state should be a human-readable rule file plus an executable model of that environment, with a hard gate: a model update ships only if it replays every recorded transition exactly. The LLM judging its own code faithful to its own rulebook is a soft gate — keep it, but never let it be the only gate. Threshold: adopt this the moment the same agent failure recurs a second time in one week. A lesson that lives only in context will be re-learned every session, at full price.

**2. Measure re-learning cost as a line item.** Count how many agent turns your system spends re-deriving facts it derived before. Memento 3's ablation puts a number on the pattern: the rulebook saved 9% of actions and 18% of agent turns on the tested games. Run your own version: pick one recurring workflow, log turns spent on already-known facts for a week, and promote any lesson that recurs more than twice into a verified rulebook entry. If re-learning exceeds ~15% of agent turns, the memory layer is the bottleneck, not the model.

**3. When one hypothesis dominates exploration, run two world models on shared evidence.** The population trick — N=2, shared history, repair on conflict — cut actions 34% on the single tested game. Use it when a single early hypothesis is steering the whole trajectory: keep two competing models, let them disagree, and let shared evidence kill the wrong one. Do not pay for N>2 until N=2 shows a measured win on your own tasks.

## The debatable claim

If a frozen model plus an editable, versioned rulebook matches a retrained one, the model is no longer the whole product. The versioned world model — inspectable, diffable, revertible, verifiable by replay — is. Retraining moves knowledge into weights you cannot read. The rulebook moves it into text you can audit, and into code you can execute without the model at all — as the Pong controller demonstrates.

The counterargument is real: all of this rides on a frontier model doing the proposing, the revising, and the judging. The rulebook is only as good as the frozen brain writing it, and the soft self-judgment gate is a hole a bad revision can walk through. Memento 3 does not eliminate that dependence. It makes the dependence auditable.

## Caveats, collected

- Author-reported preprint, not independently replicated. All baseline numbers are from official ARC Prize scorecards.
- 25 public games only; no private/holdout evaluation.
- Ablation: 3 games. Population: 1 game. Pong: 1 game, 3 episodes, with learning stopped at the first 21:0 win.
- No token or dollar cost reported; action-efficiency ≠ cost-efficiency.
- The fidelity gate is the LLM judging its own code.

## Sources

- Memento 3: Model-Based Recursive Self-Improvement through Reflective Rulebooks — arXiv:2610.11794 (submitted Oct 8, 2026): https://arxiv.org/abs/2610.11794
- ARC-AGI-3 benchmark paper — arXiv:2603.24621: https://arxiv.org/abs/2603.24621
- All numbers in this article are from Tables 1–5 and Sections 4–5 of the Memento 3 paper unless noted.
