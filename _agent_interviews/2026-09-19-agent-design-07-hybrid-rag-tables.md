---
title: "Design: Hybrid RAG over Documents and Tables"
description: "System design: a fintech analyst copilot answering over 2M documents and 500 live tables — BM25 + dense + rerank funnel, text-to-SQL vs table embeddings, and operation-first query routing."
date: 2026-09-19
category: design
permalink: /agent-interviews/design/hybrid-rag-tables/
tags:
  - Agents
  - Interview Prep
  - System Design
  - RAG
  - Text-to-SQL
  - Hybrid Search
difficulty: Hard
excerpt: "2M docs + 500 live tables: two-stage retrieval funnel, text-to-SQL vs table embeddings vs linearized chunks, operation-first routing, and determinism contracts for numeric answers."
---

## 🎯 Problem Statement

Design a **fintech analyst copilot** answering questions over **2M policy/support documents** and **500 live database tables** (Postgres + Snowflake). It must handle both *"What is the policy limit for commercial auto?"* (docs) and *"Total exposure for customer X last quarter?"* (tables — **bit-exact, auditable, never approximate**).

**Constraints:**
- **Numeric answers over tables must be deterministic and reproducible** — the CFO will reconcile them against the warehouse.
- **Evidence contracts**: doc answers carry citations; table answers carry the executed query. Every material claim traces to evidence.
- **Freshness**: tables update continuously (CDC); the doc index refreshes hourly.
- **Latency**: p95 under 4s end-to-end.
- **Permissions**: warehouse RBAC must be inherited on the SQL path; embedded table chunks must not reintroduce row-level leaks.

## 📐 Architecture

{% mermaid %}
flowchart TD;
    Q["User question"]-->Router["Router (operation-first)"];
    Router-->|exact or aggregate|SQL["Text-to-SQL path"];
    Router-->|fuzzy or exploratory|Fun["Retrieval funnel"];
    Router-->|needs both|Fan["Fan out to both paths"];
    Fun-->BM["BM25 + dense in parallel (RRF fusion)"];
    BM-->RR["Cross-encoder rerank top-K"];
    RR-->Gen["LLM generation (citations)"];
    SQL-->Exec["Live SQL as caller (query = evidence)"];
    Fan-->Synth["Synthesize both evidence streams"];
    Gen-->Synth;
    Exec-->Synth;
{% endmermaid %}

*Route by required operation, not by modality. "Total exposure for customer X?" is a SQL question even though it was asked in English.*

{% mermaid %}
flowchart TD;
    T["Question touches tables"]-->Op["What operation is needed?"];
    Op-->|exact number, aggregation|Live["Live text-to-SQL (deterministic)"];
    Op-->|fuzzy match, exploration|Emb["Table embeddings (TaBERT-style)"];
    Op-->|lookup in small table|Lin["Linearized chunk index"];
    Live-->RBAC["Warehouse RBAC inherited"];
    Emb-->Warn["Approximate: never for financials"];
    Lin-->Rows["Embed descriptions and slices, not every row"];
{% endmermaid %}

## 🧭 Discussion Framework

**1. The two-stage retrieval funnel (industry standard)**
- **Stage 1** (cheap, high-recall): BM25 + dense bi-encoder in parallel, fused with RRF — no trained model, no extra latency tier. Optional Stage 1.5: traditional **learning-to-rank** stacking lexical/semantic/recency/authority features.
- **Stage 2** (expensive, high-precision): cross-encoder or neural reranker over top-K — roughly 3–5x retrieval compute, measurably fewer hallucinations. Then top-N passages go to the LLM.
- **Budget the funnel explicitly**: where does the LLM enter — rerank? judge? generate-only? Each choice moves the latency/cost/quality frontier.

**2. Table strategy: three options, chosen by operation semantics**
- **Live text-to-SQL** (Snowflake Cortex Analyst pattern): LLM translates NL → SQL against a governed semantic model, executes deterministically. Best for aggregations, exact numbers, freshness (live query = zero staleness), and **permission inheritance** — the SQL runs as the caller, so warehouse RBAC, row-access, and masking policies apply automatically. Weakness: schema brittleness; needs a curated semantic layer.
- **Table embeddings** (TaBERT/TAPAS lineage): joint NL+table pretraining, table linearization, cell-selection heads. Fuzzy match with structure awareness — but *approximate*. Wrong tool for material financial results.
- **Linearized chunk indexing** (practitioner standard): serialize rows to text and embed alongside docs. Cheapest to build; destroys joins/aggregations. Rule of thumb: **embed column descriptions, aggregated slices, and summaries — never every row** of a 50M-row table.
- Middle ground: **typed query specs** (`{dataset, filters, aggregation}` JSON) emitted by the model, executed by trusted code — safer than free SQL, more exact than embeddings.

**3. Query routing**
- Options: rule-based intent heuristics → **LLM classifier** → **agentic tool-use** (Snowflake's Cortex Agents: the LLM picks Analyst/Search/both as tools per question).
- **Operation-first routing** is the accepted principle: "What is the policy limit?" → text; "Total exposure for customer X?" → deterministic SQL — regardless of surface form.
- **Hybrid queries** ("top 5 customers by revenue and why they're valuable") fan out to both paths and synthesize. Low routing confidence → run both, or ask a clarifying question (Cortex Analyst's approach) rather than guessing.

**4. Freshness of table data**
- Warehouse-native: Snowflake `TARGET_LAG` on the search service (managed re-embedding cadence); Databricks Delta Sync `CONTINUOUS` pipelines tailing the Delta log (CDC-like) vs `TRIGGERED` one-shot.
- Text-to-SQL **sidesteps staleness entirely** — another reason to prefer it for live tables. Continuous sync = fresher but constant compute/embedding cost; scheduled = cheaper with a staleness window.

**5. The permissions trap most candidates miss**
- Structured data permissions are solved *differently* than documents: inherit warehouse RBAC at execution time.
- But serializing table rows into a vector index **reintroduces the document-permissions problem** — now you need row-level ACLs on embeddings. Strong reason to prefer live text-to-SQL for sensitive tables. If the candidate doesn't raise this, prompt them.

**6. Evals**
- **Golden QA sets** with known-correct SQL and expected numbers; recall@K on retrieval; LLM-as-judge on answers — re-run on every schema or chunking change.
- **Determinism contracts**: numeric answers must reproduce byte-identical on re-run; low-confidence structured outputs can never become accepted facts.

## 🔍 Deep-Dive Questions

- **"The CFO asks for Q3 revenue by region. Your system embeds table rows and answers $412M. The real number is $418M. What broke?"** → Approximate embeddings were used for an exact question. The fix is routing (operation-first → text-to-SQL) plus the evidence contract: the answer should have carried its query, and a wrong-number answer with no query should never ship.
- **"A table has 50M rows. Walk through your indexing strategy."** → Don't embed every row: embed column/table descriptions, aggregated slices, and summaries for discovery; route actual computation to live SQL. Index size, embedding cost, and update churn all explode otherwise.
- **"Routing confidence is 55/45 between SQL and docs. What do you do?"** → Fan out to both and synthesize, with per-source confidence surfaced — or ask a clarifying question. Never silently pick the 55.
- **"Schema changes overnight; generated SQL starts failing silently. How do you catch it?"** → The semantic layer is the real cost of text-to-SQL, not the model. Golden QA evals run on every schema change; monitor SQL execution failure rates and answer-confidence distributions as production signals.

## 💡 What Great Looks Like

The candidate routes by **operation semantics, not modality**; puts determinism contracts on numeric answers (reproducible, query-as-evidence); names the reintroduced row-level permission problem for embedded chunks without prompting; and budgets latency and cost per funnel stage instead of treating retrieval as one black box. Bonus: they note that the semantic layer — synonyms, verified queries, schema curation — is the actual long-term cost of the text-to-SQL path, not the model.
