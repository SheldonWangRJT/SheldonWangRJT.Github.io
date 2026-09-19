---
title: "Agent Concepts 02 — Tool Use & MCP"
description: "How function calling works under the hood, what makes a good tool, MCP, error handling, and structured outputs."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/tool-use/
tags:
  - Agents
  - Interview Prep
  - Tool Use
  - MCP
  - Function Calling
difficulty: Medium
excerpt: "Function calling mechanics, tool design principles, MCP vs bespoke integrations, error-handling contracts, and schema-constrained decoding."
---

## Q1: How does function calling actually work under the hood?

**Difficulty:** Easy-Medium · **Frequency:** ★★★★★

**Key points:**
- The model **never executes anything**. It emits a structured payload (e.g., JSON) matching a declared schema: tool name + arguments.
- Your **harness** parses it, validates against the schema, executes the real API/function, and feeds the result back as a `tool` message.
- Modern stacks add **constrained decoding** (grammar-guided generation) so the JSON is valid by construction, plus **parallel tool calls** in one turn.
- The loop: `model → structured call → harness executes → observation → model`. All reliability engineering lives in the harness, not the model.

**Follow-ups:**
- "The model emits invalid JSON — what now?" → Retry with the parse error in context (models usually self-correct), or better: constrained decoding so it can't happen. Track invalid-JSON rate as a health metric.
- "Who owns retries — the model or the harness?" → The harness. The model decides *what* to retry; the harness enforces *how* (backoff, caps, idempotency keys).

## Q2: What makes a good tool definition? What makes a bad one?

**Difficulty:** Medium · **Frequency:** ★★★★

**Key points — good tools:**
- **Narrow scope**: one tool, one job. `search_orders(customer_id)` beats `do_stuff(query)`.
- **Names and descriptions the model actually reads**: precise, with examples of when (not) to use it.
- **Typed schemas** with required/optional clearly marked, enums where the value space is closed.
- **Idempotent** where possible (safe to retry): `get`, `upsert` > `create`.
- **Informative errors**: "order_id must be numeric, got 'abc'" — the error message is *prompt material* for the recovery step.
- **Least privilege**: the tool exposes only what the agent needs, not the full admin API.

**Bad tools:** mega-tools with 20 parameters, ambiguous names (`process_data`), boolean flag soup, destructive defaults, raw stack traces as errors.

**Follow-ups:**
- "How many tools is too many?" → When the model can't reliably select (usually past ~20–50 in one flat list). Fixes: **tool routing** (a router picks the subset), **grouped namespaces**, or **tool search** (the agent queries for tools like RAG).

## Q3: What is MCP and why does it matter?

**Difficulty:** Medium · **Frequency:** ★★★★ (very hot in 2025–2026 interviews)

**Key points:**
- **MCP (Model Context Protocol)**, released by Anthropic (Nov 2024): an open protocol standardizing how AI applications connect to tools/data — "USB-C for AI."
- Architecture: **host** (the AI app) → **client** → **server** (exposes *tools*, *resources*, *prompts* over a standard interface).
- Why it matters: kills the N×M integration problem (every app × every tool). Write once, reuse across Claude, Cursor, IDEs, etc. Ecosystem effects: community servers for GitHub, Slack, databases.
- It's a **convention play**, not a capability play — the value is standardization and composability.

**Follow-ups:**
- "MCP vs plain function calling — when does MCP win?" → When tools must be shared across apps/teams, or you want community-maintained integrations. For a single internal agent with 5 bespoke tools, plain function calling is simpler.
- "What are MCP's sharp edges?" → Security surface (a malicious server = prompt injection vector), versioning across servers, latency of remote servers, least-privilege scoping per server.

## Q4: How do you design the error-handling contract between tools and the agent loop?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points:**
- **Classify errors**: transient (timeout, 429 → retry with backoff), permanent (bad args, not found → don't retry, fix the call), auth/config (escalate immediately).
- Return **structured errors**: `{code, message, retryable, hint}` — the `hint` tells the agent what to try next ("did you mean order_id 48291?").
- **Bounded retries** with exponential backoff + jitter; **circuit breakers** per tool (stop calling a failing dependency).
- **Never dump raw stack traces** into context — summarize to one actionable line. Stack traces poison the context and leak internals.
- Log full traces to your observability backend; the agent sees the summary.

**Follow-ups:**
- "Design the retry policy for a payment tool vs a search tool." → Payments: idempotency keys mandatory, at-most-once semantics, human approval on ambiguity. Search: aggressive retries, fallbacks to alternate providers, degrade gracefully.

## Q5: Schema-constrained decoding vs prompting 'respond in JSON' — when does each win?

**Difficulty:** Medium · **Frequency:** ★★★

**Key points:**
- **Constrained decoding** (Outlines, Guidance, `instructor`-style): the sampler is restricted to tokens valid under a grammar/schema. Output is valid *by construction*.
- **Prompting for JSON**: cheaper, zero infra, works everywhere — but validity is probabilistic. Fine for low-stakes parsing with a repair loop.
- Use constraints when: downstream code parses the output, the schema is complex/nested, or invalid output is expensive (e.g., triggers a wrong tool call).
- Use prompting when: prototyping, the consumer is another LLM (tolerant), or latency budget is tight (constrained decoding adds overhead).

**Follow-ups:**
- "What's the cost/latency tradeoff?" → Constrained decoding can slow token generation (grammar state tracking) but *saves* round trips from parse-retry loops. Net win when invalid-output rate is high.
