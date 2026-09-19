---
title: "Agent Concepts 01 — Agent Foundations"
description: "What is an AI agent, precisely? ReAct, Plan-and-Execute, Reflexion, the autonomy spectrum, and when NOT to build an agent."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/foundations/
tags:
  - Agents
  - Interview Prep
  - ReAct
  - Architecture
difficulty: Medium
excerpt: "Agent vs chatbot vs workflow, ReAct / Plan-and-Execute / Reflexion compared, the autonomy spectrum, and the 'when not to build an agent' decision framework."
---

## Q1: What is an AI agent, precisely? How does it differ from a chatbot, a workflow, and an "autonomous system"?

**Difficulty:** Easy-Medium · **Frequency:** ★★★★★ (opener in almost every agent round)

**Key points an interviewer wants to hear:**
- An **agent** = an LLM (or model) in a **perception–action loop**: it observes state, reasons, takes actions via tools, observes results, and repeats — pursuing a goal across multiple steps.
- A **chatbot** responds to a single input with a single output; no tools, no persistent goal, no environment feedback.
- A **workflow** is a fixed DAG of steps (possibly with LLM calls inside); the *path* is predetermined, even if individual steps are non-deterministic.
- An **agent** chooses its own path dynamically at runtime based on observations. That's the defining property: **runtime control-flow decisions**.
- **Autonomy spectrum**: copilot (human drives, AI suggests) → supervised agent (AI acts, human approves checkpoints) → autonomous agent with guardrails (AI acts within bounded envelopes, escalates on exceptions).

**Follow-ups:**
- "Is a 2-step ReAct loop an agent?" → Technically yes by the definition, but the interesting question is whether the *dynamic* path selection buys you anything over a workflow. Name the threshold: branching factor × uncertainty.
- "What breaks when a team calls everything an agent?" → You lose the ability to reason about reliability: workflows get SLAs, agents get evals. Different engineering disciplines.

## Q2: Explain the ReAct pattern. Why did interleaving reasoning and acting beat reasoning-only or acting-only approaches?

**Difficulty:** Medium · **Frequency:** ★★★★★

**Key points:**
- ReAct (Yao et al., 2022): **Thought → Action → Observation** loop. The model emits a reasoning trace, takes a tool action, reads the observation, and continues.
- Why it works: reasoning traces **ground tool selection** (the model commits to a rationale before acting); observations **correct hallucinations** mid-trajectory instead of at the end; it synergizes chain-of-thought with tool use.
- Empirically beat CoT-only and act-only baselines on HotpotQA/FEVER-style multi-hop tasks at the time.
- **Limitations**: error compounding over long trajectories, context bloat from verbose traces, no real long-horizon planning (it's greedy/reactive), can loop forever without external bounds.

**Follow-ups:**
- "When does ReAct fail in production?" → Sparse or misleading tool observations, tasks needing upfront planning (multi-day migrations), cost blowup from long loops.
- "How do you bound the loop?" → Max iterations, token/time budgets, stop conditions (goal check, no-progress detection), graceful fallback to human.

## Q3: Compare ReAct vs Plan-and-Execute vs Reflexion. When would you pick each?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points:**
- **ReAct**: interleaved, reactive, greedy. Strengths: adapts to surprises, simple to implement. Weaknesses: myopic, expensive on long tasks.
- **Plan-and-Execute**: generates an upfront plan, executes step by step, replans when steps fail. Strengths: better for long-horizon tasks with known structure, plan is inspectable. Weaknesses: brittle when the environment is highly dynamic; replanning is costly.
- **Reflexion** (Shinn et al., 2023): adds **verbal reinforcement** — after a failed trial, the agent writes a self-critique into episodic memory and retries. No weight updates; learning happens in language. Strengths: improves across trials on the same task class. Weaknesses: needs a reliable success signal; critique quality bounds improvement.
- **Selection heuristic**: short/uncertain task → ReAct; long/structured task → Plan-and-Execute; repeated task class with clear success criteria → Reflexion-style memory.

**Follow-ups:**
- "30-minute coding task vs 5-minute QA task — which pattern and why?" → Coding: plan-and-execute (or hierarchical) for structure + ReAct inside steps; QA: ReAct, cheap and reactive.
- "What's the failure mode unique to Plan-and-Execute?" → Plan commitment: the agent follows a stale plan instead of reacting to new observations (mitigate with per-step verification).

## Q4: What does 'agentic' behavior mean, and how do you measure it?

**Difficulty:** Medium · **Frequency:** ★★★

**Key points:**
- Observable properties: **tool-use rate** (actions per task), **multi-step completion** without human intervention, **error recovery** (does it fix its own mistakes?), **autonomy under ambiguity** (asks clarifying questions vs guessing).
- **Benchmarks** (know what each measures): SWE-bench (real GitHub issues → code patches), τ-bench (tool-use consistency in customer-service-like tasks), WebArena (web navigation), GAIA (general assistant, multi-step reasoning), METR's autonomy evals (long-horizon).
- **Trajectory-level vs outcome-level**: outcome = did the task succeed; trajectory = were the tool calls correct, efficient, safe. You need both — a lucky success teaches nothing.

**Follow-ups:**
- "A model aces MMLU but fails agentic tasks — why?" → Static QA tests knowledge recall; agentic tasks test sequential decision-making under uncertainty, tool grounding, and error recovery. Different capabilities, weakly correlated.

## Q5: When should you NOT build an agent?

**Difficulty:** Medium · **Frequency:** ★★★★ (judgment question — interviewers love this)

**Key points:**
- Agents are the **most expensive, slowest, least reliable** way to solve a problem. Default to simpler: **rules → workflow → agent** escalation ladder.
- Build an agent when: the task has **high variance** (inputs differ a lot), the **branching is unknowable upfront**, and the **cost of a wrong step is manageable** (or guarded).
- Don't build one when: the path is deterministic, latency/cost budgets are tight, or errors are catastrophic and unguardable.
- Strong answer structure: "I ask three questions — (1) can I enumerate the paths? (2) what's the cost of being wrong? (3) does the environment change mid-task?"

**Follow-ups:**
- "Give an example where you replaced an agent with a workflow." → Have one ready (e.g., a classification agent replaced by a small classifier + rules once the label space stabilized — 10× cheaper, more reliable).

## Q6: What are the main failure modes of LLM agents in production?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points (name 5–6 with a mitigation each):**
1. **Compounding errors** — early small mistake snowballs → mitigate with per-step verification, checkpoints.
2. **Tool misuse / hallucinated arguments** → schema validation, constrained outputs, dry-run modes.
3. **Infinite / unproductive loops** → iteration caps, no-progress detection, budgets.
4. **Context overflow / distraction** → compaction, structured state, retrieval instead of dumping.
5. **Prompt injection** (especially via tool outputs) → treat tool output as untrusted data, instruction hierarchy, output validation.
6. **Silent wrong answers** (the worst) → evals, verification steps, human sampling. A loud failure is a gift; a quiet one is a liability.

**Follow-ups:**
- "Which is hardest to detect and why?" → Silent wrong answers — everything looks green. This is why evals and verification agents exist.
- "Your agent worked in dev but fails in prod — top 3 hypotheses?" → Data distribution shift (real tool outputs messier), latency/timeout differences, missing guardrails that dev never triggered.
