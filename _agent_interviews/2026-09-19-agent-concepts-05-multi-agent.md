---
title: "Agent Concepts 05 — Multi-Agent Orchestration"
description: "Orchestration patterns, what breaks in multi-agent systems, schema-constrained handoffs, self-improving loops, and when single-agent wins."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/multi-agent/
tags:
  - Agents
  - Interview Prep
  - Multi-Agent
  - Orchestration
difficulty: Medium-Hard
excerpt: "Supervisor vs pipeline vs handoffs, failure modes unique to multi-agent, typed handoffs, self-improving loops — and when to stay single-agent."
---

## Q1: What are the main multi-agent orchestration patterns?

**Difficulty:** Medium · **Frequency:** ★★★★★

**Key points:**
- **Sequential pipeline**: A → B → C, each specialized (e.g., spec compiler → navigator → comparator). Simple, debuggable, each stage independently testable.
- **Supervisor / router**: a central agent decomposes the task and delegates to workers, then synthesizes. Good for heterogeneous subtasks.
- **Hierarchical teams**: supervisors with sub-supervisors; scales to complex organizations of agents.
- **Handoff networks**: agents pass control to each other dynamically (like a relay) — flexible, harder to trace.
- **Debate / ensemble**: multiple agents propose, then critique/vote — quality via redundancy, at 3× cost.
- **Blackboard**: shared state all agents read/write — powerful, coordination-heavy.
- Communication substrate matters as much as topology: direct messages vs shared state vs **schematized handoffs**.

**Follow-ups:**
- "Code review vs open-ended research — which pattern and why?" → Code review: pipeline (lint → test → review → summarize — verifiable stages). Research: supervisor + workers (parallel exploration, synthesis at the end).

## Q2: What goes wrong in multi-agent systems that doesn't in single-agent ones?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points — failure modes unique to multi-agent:**
1. **Error amplification across hops**: a 95%-accurate stage × 4 stages ≈ 81% end-to-end. Every handoff multiplies error.
2. **Context duplication cost**: each agent re-reads shared context — token cost scales with agent count.
3. **Responsibility diffusion**: "someone else will verify" — nobody does. (The fix: explicit verification ownership per stage.)
4. **Schema drift**: upstream changes its output format, downstream silently misparses.
5. **Deadlock / livelock**: agents waiting on each other, or ping-ponging a task back and forth.
6. **Coordination overhead** exceeding the parallelism benefit.

**Follow-ups:**
- "How do you debug a 5-agent pipeline failure?" → Per-layer tracing with structured inputs/outputs logged; find the first layer whose *output* diverged from its contract (not where the symptom appeared). This is why typed handoffs matter.

## Q3: Schema-constrained handoffs — what are they and why do they matter?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points:**
- Agents pass **typed, validated payloads** (JSON schemas, protobufs) between each other — not free text.
- Why: **contracts** between layers enable independent testing ("I can test the comparator without running the navigator"), versioning, and precise error attribution.
- Example: a UI-verification pipeline where the spec compiler emits `{screen_id, elements[], assertions[]}`, the navigator emits `{action_trace[], screenshots[]}`, the comparator emits `{verdict, diffs[]}` — each stage's output is machine-checkable.
- The deeper principle: **deterministic interfaces between non-deterministic components**. You can't make LLMs deterministic, but you can make their *contracts* strict.

**Follow-ups:**
- "What breaks when agents pass raw text?" → Parsing failures, silently dropped fields, format drift over time, and untestable stages. It works in demos and rots in production.

## Q4: What are self-improving agent loops? Sketch a concrete design.

**Difficulty:** Hard · **Frequency:** ★★★★ (Staff-level differentiator)

**Key points:**
- The loop: **agent acts → evaluator scores → optimizer improves** the agent (prompts, skills, few-shot examples — or weights via methods like STaR). DSPy and TextGrad are the canonical frameworks: optimize the *program*, not just the prompt.
- **Concrete design** (real pattern): a 3-agent migration system —
  - *Converter* performs code conversion and emits key metrics (success rate, error classes);
  - *Brain* consumes those metrics to open PRs improving the converter's prompts, skills, and MCPs, and refines its own queries;
  - *Feeder* surfaces additional signals (new failure modes, repo changes) to trigger further learning.
- **Requirements**: a trustworthy eval signal (garbage signal → garbage improvement), versioning of every prompt/skill change, and **rollback** when the loop regresses.

**Follow-ups:**
- "What prevents reward hacking?" → Held-out eval sets the optimizer never sees, human spot-checks on a sample, and tracking *multiple* metrics (not a single number the loop can game).

## Q5: When is multi-agent worse than a single agent?

**Difficulty:** Medium · **Frequency:** ★★★★ (judgment — interviewers score the restraint)

**Key points:**
- Multi-agent adds **latency** (sequential hops), **cost** (context duplicated per agent), and **complexity** (coordination, contracts, debugging).
- Single agent wins for: narrow tasks, tasks where one context suffices, early prototypes.
- Multi-agent wins when: **roles need different tools** (a navigator needs a browser; a comparator needs vision), work is **parallelizable**, or subtasks are **independently verifiable**.
- The Staff answer: "Start single. Split when you can *name the bottleneck* the split removes — specialization, parallelism, or verifiability. Never split for aesthetics."

**Follow-ups:**
- "You inherited a 6-agent system for a 2-step task — what do you do?" → Measure per-stage value-add; collapse stages that don't earn their coordination cost; keep the split only where stages have distinct tools or verifiable contracts.
