---
title: "Agent Concepts 06 — Evals, Reliability & Cost"
description: "Evaluating agents (outcome vs trajectory), key benchmarks, production reliability patterns, guardrails, and cost/latency control."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/eval-reliability-cost/
tags:
  - Agents
  - Interview Prep
  - Evals
  - Reliability
  - Cost Optimization
difficulty: Medium-Hard
excerpt: "Outcome vs trajectory evals, LLM-as-judge calibration, SWE-bench / tau-bench / WebArena, reliability patterns, guardrail layers, and cutting $/task."
---

## Q1: How do you evaluate an agent system? (Outcome vs trajectory)

**Difficulty:** Medium-Hard · **Frequency:** ★★★★★

**Key points:**
- **Outcome evals**: did the task succeed? (Tests pass, ticket resolved, migration compiles.) Necessary but insufficient — a lucky success teaches nothing, and a good trajectory that hit bad luck looks like failure.
- **Trajectory evals**: were the *steps* correct? Tool-call accuracy, number of wasted actions, recovery behavior after errors, final answer grounded in observations.
- **LLM-as-judge**: scalable, but needs **rubrics** (not vibes), **calibration** against human labels, and awareness of judge biases (verbosity, position, self-preference).
- **Golden sets + human eval**: a curated set of representative tasks, human-graded, run as regression. The foundation everything else calibrates against.
- **Eval-driven development**: evals run in CI on every change — the agent equivalent of unit tests.

**Follow-ups:**
- "Your LLM judge disagrees with humans 30% of the time — fix?" → Tighten the rubric (disagreement usually means vague criteria), add few-shot calibrated examples, switch contested cases to pairwise comparison, and slice disagreement by category to find the blind spot.

## Q2: Name the key agent benchmarks and what each actually measures.

**Difficulty:** Medium · **Frequency:** ★★★★

**Key points:**
- **SWE-bench**: real GitHub issues → code patches, validated by tests. Measures: practical software engineering.
- **τ-bench**: multi-turn tool-use in customer-service-like scenarios. Measures: *consistency* — following policy across long interactions.
- **WebArena**: web navigation tasks on real sites. Measures: grounding actions in dynamic environments.
- **GAIA**: general-assistant tasks requiring multi-step reasoning + tool use. Measures: breadth of capability.
- **METR autonomy evals**: long-horizon task completion. Measures: sustained autonomous work.
- What they all miss: *your* org's tools, *your* data distribution, long-horizon reliability. Benchmarks are a starting filter, never the finish line.

**Follow-ups:**
- "Why can't you just optimize for SWE-bench score?" → Goodhart's law + distribution gap: the benchmark's repos/tools aren't yours. Teams that overfit benchmarks ship agents that ace the test and fail the oncall.

## Q3: What reliability patterns do production agent systems use?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points:**
- **Bounded loops**: max iterations, token/time budgets, no-progress detection — an agent must always be able to *stop*.
- **Idempotent tools**: safe to retry; at-most-once semantics for destructive actions.
- **Transactional checkpoints**: persist state so a crashed run resumes instead of restarting.
- **Human-in-the-loop** for irreversible actions (refunds, deletes, sends) — with clear escalation thresholds.
- **Sandboxing**: untrusted code/commands run isolated; least-privilege tool scopes.
- **Graceful degradation**: when the agent is stuck, hand a clean summary to a human instead of failing opaquely.

**Follow-ups:**
- "Design the safety story for an agent that can issue refunds." → Policy engine (max auto-refund $X), HITL above threshold, idempotency keys, full audit trail, anomaly alerting (refund rate spike = page someone), and a kill switch.

## Q4: How do you control cost and latency at scale?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points — the levers:**
1. **Model routing / cascades**: small model tries first, escalate to frontier on low confidence or failure. Most tasks don't need the biggest model.
2. **Prompt caching**: reuse system prompts and stable context across calls.
3. **Distillation / PEFT**: train a small specialist for narrow, high-volume tasks.
4. **Token budgets per task**: cap spend; measure **$/successful task**, not $/call.
5. **Parallelism**: independent tool calls and subagents run concurrently.
6. **Cache tool results**: deterministic tool outputs shouldn't be recomputed.
- The metric that matters: **cost per successful task** — a cheap agent that fails half the time is the expensive one.

**Follow-ups:**
- "Your agent costs $2/task at 10k tasks/day — cut 50% without hurting success rate?" → Profile first: where do tokens go? (Usually: oversized context + frontier model on easy subtasks.) Then: route easy subtasks to a small model, cache aggressively, compact context, distill the highest-volume narrow subtask.

## Q5: Guardrails — what layers exist, and where do they run?

**Difficulty:** Medium · **Frequency:** ★★★

**Key points — defense in depth:**
1. **Input layer**: prompt-injection detection, PII redaction, input validation. Runs before the model sees anything.
2. **Tool layer**: allowlists (which tools, which args), parameter validation, sandboxing, rate limits. Runs in the harness.
3. **Output layer**: policy checks (toxicity, disallowed content), factuality/grounding checks, format validation. Runs before the user sees anything.
4. **System layer**: budgets (token/time/$), kill switches, audit logging, anomaly alerting.
- Guardrails can be **wrappers** (around the agent) or **tools** (the agent invokes a `check_policy` tool) — wrappers are harder to bypass.

**Follow-ups:**
- "Prompt injection arrives via a retrieved document — which layer catches it?" → Input-layer *data* handling: retrieved content must be tagged as untrusted data (instruction hierarchy), and the output layer should verify the final action against the original user goal. No single layer is sufficient — that's why it's defense in depth.
