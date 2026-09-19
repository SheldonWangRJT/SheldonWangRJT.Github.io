---
title: "Design: Large-Scale Code Migration Agent"
description: "System design: an agent system to migrate 2M LOC from Objective-C to Swift across 50 modules while 200 engineers keep shipping."
date: 2026-09-19
category: design
permalink: /agent-interviews/design/code-migration/
tags:
  - Agents
  - Interview Prep
  - System Design
  - Code Migration
  - Codemod
difficulty: Hard
excerpt: "Migrate 2M LOC ObjC→Swift with 200 engineers landing features in parallel: phased rollout, verification gates, human checkpoints, and progress metrics."
---

## 🎯 Problem Statement

Design an **agent system to migrate 2M lines of Objective-C to Swift** across 50 modules, while **200 engineers continue landing features** on the same codebase. Timeline: 6 months.

**Constraints:**
- **Correctness**: the build can never stay red; every migrated module must pass existing tests *and* behave identically.
- **Incremental**: big-bang rewrites are banned — migrate module by module, shippable at every step.
- **Human review required**: no machine-generated code lands without human sign-off.
- **Parallel development**: humans keep merging; the migration must not constantly conflict.
- **Measurable**: leadership wants a dashboard, not vibes.

## 🧭 Discussion Framework

A strong answer walks through these areas in order:

**1. Phased rollout, not a flag day**
- *Pilot*: 2–3 representative modules (one easy, one gnarly, one high-churn). Learn the failure modes small.
- *Scale*: module-by-module with a priority queue (leaf modules first, or highest-churn first — argue the tradeoff).
- *Sustain*: the system keeps running as new ObjC lands; migration is a standing process, not a project.

**2. The agent architecture**
- **Per-module converter agent**: reads module, plans file-by-file conversion, emits diffs. Bounded scope per run (one module, not the world).
- **Verification layer** (deterministic, not LLM): build → unit tests → **behavioral diff** (run old vs new against recorded traffic / snapshot tests). The verifier is the real product; the converter is interchangeable.
- **Review agent / human checkpoint**: summarizes the diff for the human reviewer (what changed semantically, risk areas) — humans review *judgment*, not syntax.
- **Coordinator**: schedules modules, tracks state per module (pending → converting → verifying → in review → done), handles retries.

**3. Living with parallel human development**
- Migrate at **module boundaries** with clear ownership; coordinate via the module's owning team.
- **Rebase strategy**: converter works on fresh checkouts; if a human lands mid-conversion, re-run (cheap if verification is automated) or diff-and-patch.
- **Generated-code hygiene**: mark migrated regions, prevent the agent from "re-migrating" converted code (state tracking per file).

**4. Token efficiency & cost**
- Internal research angle: Swift's token efficiency vs ObjC affects agent coding cost — batch related files, share context across files in one module, cache repo maps.
- Measure **$/merged module**, optimize the expensive parts (usually verification + review cycles, not generation).

**5. Metrics dashboard**
- Conversion rate (modules/week), build health, test pass rate on migrated code, human review burden (comments per diff, revert rate), and *defect escape rate* on migrated modules vs baseline.

## 🔍 Deep-Dive Questions

- **"How do you prove behavioral equivalence?"** → Layered: compiles + existing tests + snapshot/behavioral diffs + staged rollout with production monitoring. No single layer suffices; argue which catches what.
- **"The agent produces correct but unidiomatic Swift — accept?"** → Define a style bar (linters as deterministic gates); unidiomatic-but-correct ships, with a follow-up modernization pass. Don't let perfect block the migration.
- **"A module has 80% test coverage and the rest is untestable legacy — migrate?"** → Risk-tier the modules; low-coverage modules get *more* human scrutiny and smaller batches, or characterization tests written first (by an agent, verified by humans).

## 💡 What Great Looks Like

The candidate separates the **non-deterministic converter** from the **deterministic verifier**, treats human review as a designed bottleneck to optimize (summarization, risk ranking), plans for parallel development conflicts explicitly, and defines success in metrics — not "we migrated everything."
