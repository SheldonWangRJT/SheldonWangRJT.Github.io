---
name: ai-blog-authoring
description: Authors AI-focused blog posts with strict freshness checks, source-backed claims, and practical implementation guidance. Use when writing about LLMs, AI agents, model/tool releases, prompting, evals, RAG, or AI product comparisons.
---

# AI Blog Authoring

## Purpose

Create AI posts that remain credible in a fast-moving landscape by combining practical guidance with rigorous fact freshness.

## Freshness-First Workflow

1. Follow `.cursor/guidance/blog-publishing-guide.md` and `_posts` standards.
2. Identify volatile claims:
   - pricing, model versions, launch dates, benchmark results, feature availability.
3. Perform real-time verification:
   - prioritize primary sources first
   - use at least 2 independent sources for high-impact claims
4. Write with explicit time context:
   - add `Last verified: YYYY-MM-DD` in volatile sections
   - link sources near claims
5. If facts conflict:
   - state uncertainty and avoid absolute conclusions.

## Required Quality Signals

- Practical implementation examples (prompt pattern, eval setup, pipeline pattern, or integration snippet).
- Clear "when to use / when not to use" guidance.
- A risk/limitations section.

## References

- Shared templates: `../blog-authoring/templates.md`
- Base freshness policy: `../blog-authoring/freshness-policy.md`
- Final QA: `../blog-authoring/quality-checklist.md`
