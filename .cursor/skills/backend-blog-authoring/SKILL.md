---
name: backend-blog-authoring
description: Authors backend-focused blog posts with concrete system design, API/data model examples, and operational tradeoff analysis. Use when writing about backend architecture, APIs, distributed systems, databases, caching, queues, devops, or reliability.
---

# Backend Blog Authoring

## Purpose

Create backend posts that are useful for engineers implementing systems, not just learning concepts.
Default voice is staff+ engineer: system boundaries, failure domains, operational risk, and cost/performance tradeoffs.

## Workflow

1. Follow `.cursor/guidance/blog-publishing-guide.md` and `_posts` standards.
2. Frame the problem with explicit constraints (scale, latency, consistency, cost).
3. Provide implementation-level examples:
   - API contract or handler flow
   - data model/schema or indexing decisions
   - queue/retry/idempotency pattern
4. Prefer diagram-first explanation for complex systems:
   - use architecture and sequence/state diagrams to communicate design.
   - code is optional when diagrams and interfaces already make decisions clear.
5. Include tradeoffs:
   - what to choose under small/medium/large scale.
6. Include operational guidance:
   - observability metrics, alerting, failure modes, rollout strategy.

## Required Quality Signals

- At least one architecture diagram (Mermaid or equivalent) for non-trivial systems.
- Code examples are optional; include them only when they clarify a critical mechanism.
- At least one table comparing design options.
- A production checklist section.

## References

- For shared templates, see `../blog-authoring/templates.md`.
- For final QA, see `../blog-authoring/quality-checklist.md`.
