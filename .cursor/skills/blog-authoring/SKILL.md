---
name: blog-authoring
description: Authors and upgrades high-value blog posts for this repository with correct collection placement, front matter, practical examples, and publish-ready structure. Use when creating/editing posts, improving content quality, or preparing blog content for publish.
---

# Blog Authoring

## Purpose

Produce blog content that is publish-ready for this repository, with practical reader value and strict adherence to local publishing conventions.

## Required Inputs

When possible, confirm:
- target collection (`_posts`, `_life`, `_portfolio`, etc.)
- topic and audience
- desired publish date (or choose a non-future date)

If the user does not provide these, infer from repo patterns and request.

## Workflow

1. Read `.cursor/guidance/blog-publishing-guide.md`.
2. Choose the correct collection folder.
3. Create/modify file with valid filename format `YYYY-MM-DD-slug.md`.
4. Add complete front matter (collection-specific requirements).
5. Write high-value content:
   - practical examples
   - actionable steps/checklists
   - concrete scenarios; avoid generic filler
6. For technical content, include implementation-level code examples when useful.
7. Run a freshness gate for time-sensitive claims:
   - If topic includes "latest/current/new", pricing, release dates, market data, policy/regulation, product feature comparisons, or trend claims, run real-time web checks.
   - Prefer primary sources (official docs, release notes, company blogs, standards bodies) before secondary commentary.
   - If claims cannot be verified, avoid exact numbers/dates and label as directional.
8. Run a quick quality pass:
   - not future-dated (unless requested)
   - structure is scannable
   - no prompts for comments section
   - avoids personal sensitive info

## Output Standards

- Keep tone practical and direct.
- Prioritize "how to apply this" over broad theory.
- Use tables/checklists where they improve clarity.
- Keep examples realistic and copy-adaptable.
- For time-sensitive sections, include a short "Last verified: YYYY-MM-DD" note.
- If external facts drive recommendations, include source links in-content.

## Quick Templates

For reusable templates and checklist, see:
- [templates.md](templates.md)
- [quality-checklist.md](quality-checklist.md)
- [freshness-policy.md](freshness-policy.md)
