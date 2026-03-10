---
title: "Design a Mobile Offline Sync Engine for iOS"
description: "Interview system design: build an offline-first sync engine with conflict handling, retries, and user-visible consistency guarantees."
date: 2026-03-07
category: system-design
permalink: /interviews/mobile-offline-sync-engine/
tags:
  - System Design
  - iOS
  - Offline First
  - Data Sync
  - Reliability
difficulty: Medium-Hard
excerpt: "Design a mobile sync engine that handles offline writes, conflict resolution, and reliable reconciliation when connectivity returns."
---

## 🎯 Problem

Design an iOS sync engine for an app where users create and edit records offline. Requirements:

- local writes must feel instant
- sync resumes automatically when network returns
- conflict handling is deterministic
- retries are safe (idempotent)
- users can see sync state

## 🧱 Architecture

{% mermaid %}
flowchart TD;
    UI["iOS UI"]-->Store["Local Store"];
    Store-->Outbox["Sync Outbox"];
    Outbox-->SyncWorker["Sync Worker"];
    SyncWorker-->API["Sync API"];
    API-->DB["Server DB"];
    API-->Version["Version/ETag Service"];
    SyncWorker-->Telemetry["Sync Telemetry"];
{% endmermaid %}

## Core Design Decisions

### 1) Local-first write path
- Persist writes to local store immediately.
- Enqueue intent in outbox for background sync.

### 2) Versioned conflict strategy
- Use record version (or ETag) in updates.
- On mismatch, fetch latest server state and run merge policy.

### 3) Idempotency key per mutation
- Every mutation carries a stable operation id.
- Safe retries avoid duplicate server-side effects.

## Data Model Sketch

A minimal local model usually includes:

- `records` table (business entities + local version)
- `outbox` table (pending operations + retry metadata)
- `sync_state` table (cursor, last successful sync timestamp, backoff state)

This separation keeps product data independent from transport mechanics.

## API Contract Sketch

```http
POST /sync/mutations
Headers:
  Idempotency-Key: <operation_id>
Body:
  {
    "device_id": "abc",
    "mutations": [
      {
        "record_id": "r1",
        "base_version": 12,
        "op": "update",
        "patch": { "title": "new title" }
      }
    ]
  }
```

Server response should include accepted operations, conflicts, and current authoritative versions.

## Sync Loop Pseudocode

```swift
func runSyncLoop() async {
    let batch = outbox.nextBatch(limit: 50)
    guard !batch.isEmpty else { return }
    let result = await api.push(batch)
    applyServerAcks(result.accepted)
    handleConflicts(result.conflicts)
    scheduleRetryIfNeeded(result.retryableFailures)
}
```

Bounded batches reduce memory pressure and avoid long-running background tasks.

## Conflict Policy Table

| Record Type | Merge Strategy | User Visibility |
|-------------|----------------|-----------------|
| Notes/text | field-level merge | show "merged update" banner |
| Toggle/status | last-writer-wins with timestamp | minimal notice |
| Financial/order-like | server-authoritative + user review | explicit resolution UI |

## Conflict Resolution UX Principles

1. Avoid silent data loss for user-authored content.
2. Show conflict context (local vs server values).
3. Offer one-tap accept server or keep local (where domain allows).
4. Log final resolution path for support/debugging.

## Failure Modes

- **Long offline period** -> replay backlog in bounded batches
- **Poison message in outbox** -> move to dead-letter queue with UI warning
- **Server validation failures** -> mark item as requires user action
- **Token expiry mid-sync** -> refresh auth and resume from checkpoint
- **App kill during sync** -> persist progress after every acknowledged batch

## Reliability and Observability

Track these operational metrics:

| Metric | Why It Matters |
|--------|----------------|
| outbox depth | indicates sync backlog pressure |
| sync success rate | health of end-to-end pipeline |
| conflict rate by entity type | merge-policy quality signal |
| median time to converge | user-perceived consistency speed |
| retry distribution | network/API stability indicator |

Add tracing IDs per sync cycle to correlate client logs with server traces.

## Security and Privacy Notes

- Encrypt local store at rest.
- Sign requests and scope tokens minimally.
- Avoid logging sensitive payload fields.
- Respect regional data handling constraints for sync telemetry.

## Scale Considerations

- shard sync API by tenant or user domain when volume grows
- keep payloads incremental (delta sync), not full snapshots
- introduce server-side compaction for mutation history
- prioritize critical entity types during degraded mode

## Interview Tradeoffs

- Strong consistency on mobile UX is expensive; aim for eventual consistency with clear status indicators.
- Merge quality is domain-specific; one global strategy is usually wrong.
- Background sync must respect battery/network constraints.

## What Strong Answers Include

- clear separation of local UX path vs remote reconciliation path
- deterministic conflict policy with domain-based exceptions
- explicit retry, backoff, and idempotency strategy
- user-visible sync status for trust and supportability
