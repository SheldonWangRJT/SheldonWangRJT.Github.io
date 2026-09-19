---
title: "Design: Agent Platform (Marketplace, Versioning, Rollout)"
description: "System design: an internal platform where teams publish versioned agents and skills for 500 engineers — dependencies, rollouts, security, metering."
date: 2026-09-19
category: design
permalink: /agent-interviews/design/agent-platform/
tags:
  - Agents
  - Interview Prep
  - System Design
  - Platform
  - Infrastructure
difficulty: Hard
excerpt: "500 engineers consuming versioned agents/skills: semver for prompts, dependency resolution, staged rollouts, sandboxing, and the deprecation contract."
---

## 🎯 Problem Statement

Build an **internal agent platform**: teams publish **versioned agents, skills, and tools**; **500 engineers** discover and consume them in their own workflows.

**Constraints:**
- **Breaking changes happen** (prompt edits, tool signature changes) — consumers must not break silently.
- **Dependency hell**: agent A depends on skill B v2 which depends on tool C v1…
- **Security review**: a malicious or careless published skill is a supply-chain attack.
- **Discoverability**: 500 engineers can't use what they can't find.

## 📐 Architecture

{% mermaid %}
flowchart TD;
    Pub["Team publishes skill"]-->SecPipe["Security pipeline (static analysis, permission review)"];
    SecPipe-->Reg["Versioned registry (semver + eval results)"];
    Reg-->Dep["Dependency resolver (lockfiles)"];
    Dep-->Roll["Staged rollout (canary, gradual, full)"];
    Roll-->Cons["Consumer agents (pinned versions)"];
    Roll-->|regression|Kill["Kill switch and rollback"];
    Reg-->Market["Marketplace (search, ratings, examples)"];
{% endmermaid %}

*Prompts and skills are software artifacts: versioned, tested, rolled out, deprecated — not magic strings.*

{% mermaid %}
flowchart TD;
    Change["Publisher ships v2"]-->Check["Dependent eval runs (automatic)"];
    Check-->|pass|Ship["Ship as MINOR or PATCH"];
    Check-->|fail|Major["Ship as MAJOR + migration guide"];
    Major-->Notice["Deprecation notice with N-month window"];
{% endmermaid %}

## 🧭 Discussion Framework

**1. Versioning: semver for the non-deterministic**
- **Skills/prompts get versions** like code: MAJOR (behavior change), MINOR (new capability, backward compatible), PATCH (wording/cost tweaks).
- **Pin by default**: consumers pin exact versions; `latest` is opt-in and clearly labeled dangerous.
- **Evals per version**: a new version ships with its eval results — the "changelog" is measured, not written.

**2. Dependency resolution**
- **Lockfiles** for agent compositions (like package-lock): reproducible runs.
- **Compatibility ranges** with automated checks: publishing skill B v2 triggers eval runs of known dependents.
- **The blast radius question**: who gets paged when a deep dependency breaks? → The *publisher* owns backward compat within a major version; breaking changes require a new major + migration guide.

**3. Rollout & safety**
- **Staged rollouts**: canary (1% of traffic / one team) → gradual → full, with automatic rollback on metric regression.
- **Kill switches** per skill version — platform can disable a bad version globally in minutes.
- **Shadow mode**: new versions run alongside old, results compared, no user impact.

**4. Security & sandboxing**
- **Publishing pipeline**: static analysis of tool code, permission review (what can this skill *do*?), provenance (who published, what changed).
- **Runtime sandboxing**: skills run with least-privilege tool scopes; tenant isolation so Team A's data never leaks into Team B's runs.
- **Audit trail**: every skill invocation logged with version pins — reproducibility for incidents.

**5. Discovery & metering**
- **Marketplace UX**: search, categories, usage stats, ratings, example compositions. Discovery is a product problem, not a docs problem.
- **Metering/billing**: track $/team/agent for chargeback and cost awareness — nothing disciplines usage like a bill.

**6. Deprecation contract**
- Published policy: N months notice, migration guides, automated codemods where possible. A platform without a deprecation story becomes a museum of frozen versions.

## 🔍 Deep-Dive Questions

- **"Team A's v2 breaks Team B's workflow — who owns the fix?"** → Team A, if they broke backward compat within a major version (that's the contract). If B pinned `latest` against advice, B owns it. The platform's job: make the contract explicit and the breakage *visible* before it ships (dependent eval runs).
- **"Design the canary analysis for a prompt change."** → Same traffic split, compare: task success rate, cost/task, latency p99, and judge-scored quality — with statistical significance thresholds, not eyeballing.
- **"A skill is popular but the owning team left — now what?"** → Adoption/ownership policy decided at publish time: popular skills get platform-team adoption or a new owner; unowned skills get deprecated, not orphaned.

## 💡 What Great Looks Like

The candidate treats **prompts and skills as software artifacts** (versioned, tested, rolled out, deprecated) — not as magic strings. The strongest answers name the *contracts* between publisher, platform, and consumer, because that's where platform design actually lives.
