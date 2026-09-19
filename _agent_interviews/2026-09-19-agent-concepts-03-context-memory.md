---
title: "Agent Concepts 03 — Context Engineering & Memory"
description: "Context engineering vs prompt engineering, managing long runs, memory taxonomies, and the 'lost in the middle' problem."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/context-memory/
tags:
  - Agents
  - Interview Prep
  - Context Engineering
  - Memory
difficulty: Medium
excerpt: "Why context is the working memory, compaction strategies, episodic/semantic/procedural memory, and mitigating 'lost in the middle'."
---

## Q1: "Context engineering" vs "prompt engineering" — what's the real difference?

**Difficulty:** Medium · **Frequency:** ★★★★★

**Key points:**
- **Prompt engineering** = wording of instructions ("be concise", few-shot examples, role framing).
- **Context engineering** = curating *everything* in the window: system prompt, tool definitions, retrieved documents, conversation history, agent state, intermediate results.
- The key insight: **the context is the agent's working memory**. Most agent failures are *context failures* (missing facts, stale state, distracting junk) — not model failures.
- Senior framing: "I stopped asking 'is the model smart enough' and started asking 'does the context contain everything needed, and nothing harmful.'"

**Follow-ups:**
- "Walk me through assembling context for a coding agent on a 500k LOC repo." → You can't dump it: repo map / file tree summary, retrieved relevant files (not whole files — targeted slices), the task spec, recent tool outputs (truncated), explicit state block (what's done, what's next). Everything else stays behind tools.

## Q2: How do you manage a growing context window over long agent runs?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points — the toolkit:**
1. **Compaction / summarization checkpoints**: periodically summarize history into a dense state block; keep the original goal + constraints verbatim.
2. **Structured external state**: scratchpad files, task DBs, progress trackers — state lives *outside* the window, referenced by pointer.
3. **Subagent handoffs with schematized summaries**: delegate, get back a typed summary, not a transcript.
4. **Sliding window with importance**: keep system prompt + recent observations; drop middle chatter first.
5. **Event sourcing**: log every action; the agent can replay/reconstruct state from the log instead of holding it all.

**Follow-ups:**
- "What must never be summarized away?" → The goal, hard constraints ("never do X"), verified facts the agent depends on, and user-provided corrections. Summarization is lossy — protect invariants explicitly.

## Q3: Explain agent memory systems: working, episodic, semantic, procedural.

**Difficulty:** Medium · **Frequency:** ★★★★

**Key points:**
- **Working memory** = the context window. Fast, tiny, ephemeral.
- **Episodic memory** = past trajectories/experiences ("last time this migration failed because…"). Retrieved by similarity; enables Reflexion-style learning.
- **Semantic memory** = facts and knowledge (docs, wikis, RAG stores, knowledge graphs).
- **Procedural memory** = skills and workflows (prompt templates, DSPy programs, tool macros, "how we do deploys here").
- Each needs **read/write/curation policies**: who writes, when, with what provenance, TTL, and review. Memory without curation becomes a liability.

**Follow-ups:**
- "How do you prevent memory poisoning?" → Provenance tags on every memory (source, confidence), TTLs, human review gates for writes, and periodic audits. One bad experience written permanently can corrupt every future run.

## Q4: What is 'lost in the middle' and how do you mitigate it?

**Difficulty:** Medium · **Frequency:** ★★★

**Key points:**
- Liu et al., 2023: LLM performance on long contexts is **U-shaped** — best at the start and end, worst in the middle. Critical facts buried mid-context get ignored.
- **Mitigations**: place critical instructions/facts at the start or end; **rerank and keep top-k** instead of dumping 50 chunks; extract-then-reason (pull key facts into a structured block first); repeat the goal statement before the final action.
- This is why "bigger context window" ≠ "better agent" — *utilization* matters more than size.

**Follow-ups:**
- "How does this change your RAG strategy?" → Retrieval precision beats recall dumping: fewer, better-ranked chunks; and put the highest-relevance chunk last (recency) or first, never in a 40-chunk middle.
