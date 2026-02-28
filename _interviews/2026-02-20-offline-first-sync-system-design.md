---
title: "Design an Offline-First Sync System for Notes App"
description: "System design: build an offline-first mobile sync architecture with conflict handling, retry queues, and eventual consistency."
date: 2026-02-20
category: system-design
permalink: /interviews/offline-first-sync-system-design/
tags:
  - System Design
  - Offline First
  - Sync Engine
  - Conflict Resolution
  - Mobile Backend
difficulty: Hard
excerpt: "How to design reliable offline sync for mobile apps: local-first writes, durable queues, retries, and conflict policies."
---

## 🎯 Problem

Users can create/edit notes while offline. The app syncs later when network returns.

Constraints:
- Low battery/network usage
- No data loss
- Reasonable conflict behavior
- Works across multiple devices

## 🧱 Architecture

{% mermaid %}
flowchart LR;
    App["Mobile App"]-->LocalDB["Local DB"];
    App-->Queue["Sync Queue"];
    Queue-->SyncWorker["Background Sync Worker"];
    SyncWorker-->API["Sync API"];
    API-->ServerDB["Server DB"];
    API-->Conflict["Conflict Resolver"];
{% endmermaid %}

## 🔑 Key Principles

1. **Local write is source of UX truth**  
   User action succeeds immediately after local commit.

2. **Durable operation queue**  
   Every mutation becomes a queue entry with retry metadata.

3. **Idempotent sync API**  
   Each operation carries request ID to avoid duplicate side effects.

## 🗂 Data Model Fields

- `entity_id`
- `updated_at`
- `version`
- `sync_state` (`pending`, `synced`, `failed`)
- `op_id` (idempotency key)

## ⚔️ Conflict Strategy

Recommended interview default:
- last-write-wins for low-risk fields
- server-side merge for structured content
- explicit user resolution only for high-value conflicts

Mention tradeoff: strict CRDT gives stronger merges but adds complexity.

## 🚨 Failure Handling

- Network timeout -> exponential backoff + jitter
- 409 conflict -> mark `needs_merge`, fetch latest, merge policy
- 5xx spike -> pause queue and retry with capped backoff

## 📈 Operational Metrics

- sync success rate
- queue depth and age
- conflict rate
- median time to consistency

## ✅ Interview Wrap-Up

Highlight:
- local-first UX
- reliable queue semantics
- deterministic conflict policy
- observability and rollback controls
