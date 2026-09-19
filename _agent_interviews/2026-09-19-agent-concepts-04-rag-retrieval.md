---
title: "Agent Concepts 04 — RAG & Retrieval"
description: "Production RAG pipelines, chunking, hybrid search, retrieval eval, and advanced techniques (HyDE, query rewriting, agentic retrieval)."
date: 2026-09-19
category: concepts
permalink: /agent-interviews/concepts/rag-retrieval/
tags:
  - Agents
  - Interview Prep
  - RAG
  - Retrieval
difficulty: Medium
excerpt: "End-to-end RAG, chunking tradeoffs, why hybrid search + rerank, retrieval metrics, and when agentic retrieval beats single-shot RAG."
---

## Q1: Walk through a production RAG pipeline end to end.

**Difficulty:** Medium · **Frequency:** ★★★★★

**Key points:**
- **Ingest**: parse docs (handle PDFs, HTML, code), clean, dedupe, track provenance + timestamps.
- **Chunk** → **embed** → **index** (vector DB + BM25 for hybrid).
- **Retrieve**: hybrid search → **rerank** top-k with a cross-encoder → assemble context with citations.
- **Generate** with grounded prompting ("answer only from context, cite sources").
- **Close the loop**: offline eval set, log user corrections / thumbs-down, feed back into chunking and retrieval tuning.
- The unsexy truth: most production RAG work is **data plumbing and eval**, not model choice.

**Follow-ups:**
- "Where do most RAG systems actually fail?" → Retrieval quality (wrong chunks) and chunking — not the generator. If the context is wrong, no model saves you.

## Q2: Chunking strategies and their tradeoffs.

**Difficulty:** Medium · **Frequency:** ★★★★

**Key points:**
- **Fixed-size** (e.g., 512 tokens + overlap): simple, predictable; splits mid-thought.
- **Semantic**: split on topic shifts (embedding similarity); coherent chunks, variable size.
- **Structural**: split on document structure (headers, sections) or **AST-aware for code** (functions/classes stay whole).
- **Overlap**: preserves boundary context; costs index size.
- **Small-to-big**: retrieve small precise chunks, then expand to parent context for generation.
- Rule of thumb: chunk for *retrieval precision*, expand for *generation completeness*.

**Follow-ups:**
- "How would you chunk a monorepo for a coding agent?" → AST-aware (functions/classes), plus file-level summaries as a first retrieval hop, then drill into code chunks. Never fixed-size-split code — you'll sever definitions from usages.

## Q3: Hybrid search + reranking — why not just vector search?

**Difficulty:** Medium · **Frequency:** ★★★★

**Key points:**
- **BM25** (keyword) catches exact terms, IDs, error codes — things embeddings smear over. **Vectors** catch semantics/paraphrase. They fail on *different* queries → hybrid maximizes **recall**.
- **Reranking** (cross-encoder over top-k): expensive but precise — it reads query+chunk *jointly*, unlike bi-encoder retrieval. It's a **two-stage funnel**: cheap recall, expensive precision.
- Economics: retrieve 100 cheaply, rerank 10 carefully, generate from 5.

**Follow-ups:**
- "When does reranking NOT help?" → When retrieval is already near-perfect (rerank just burns latency), or when your latency budget forbids the extra model call. Measure, don't assume.

## Q4: How do you evaluate retrieval quality?

**Difficulty:** Medium-Hard · **Frequency:** ★★★★

**Key points:**
- **Retrieval metrics** on labeled sets: recall@k (did we get the gold chunk?), MRR / nDCG (did we rank it well?).
- **End-to-end metrics** (RAGAS-style): *faithfulness* (is the answer supported by context?), *answer relevancy*, *context precision/recall*.
- **Synthetic eval sets**: generate Q&A pairs from your own docs for regression testing — cheap, scalable, but validate against human labels.
- **Human spot checks** on a sample: the final arbiter, especially after data refreshes.

**Follow-ups:**
- "Faithfulness drops after a data refresh — debug plan?" → (1) check for new conflicting/duplicate docs, (2) re-run retrieval metrics on the golden set — did recall drop? (3) inspect chunking on new doc formats, (4) check for stale cached embeddings.

## Q5: Advanced RAG: query rewriting, HyDE, and agentic retrieval.

**Difficulty:** Medium-Hard · **Frequency:** ★★★

**Key points:**
- **Query rewriting**: expand the user query ("cheap flights" → "budget airfare options under $300") to bridge vocabulary gaps.
- **HyDE**: generate a *hypothetical answer* with the LLM, embed *that*, and search — the hypothetical answer lives in "document space," closer to real chunks than the short query does.
- **Agentic retrieval**: the agent itself decides *what* to retrieve, *when*, via tools (search, fetch, SQL) — multi-hop, adaptive. Not one-shot.
- When each wins: single-shot RAG for simple lookup; rewriting/HyDE for vocabulary mismatch; agentic retrieval for multi-hop or ambiguous needs ("compare our Q3 numbers with the forecast" — the agent must discover what data exists first).

**Follow-ups:**
- "When does agentic retrieval beat single-shot RAG?" → When the information need can't be expressed in one query — the agent must explore, see what's available, and refine. Cost: latency and tokens per hop.
