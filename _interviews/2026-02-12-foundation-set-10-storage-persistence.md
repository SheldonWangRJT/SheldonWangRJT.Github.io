---
title: "Foundation Set 10: Storage & Persistence (25 Q&A)"
description: "Rapid-fire iOS persistence questions: UserDefaults, Keychain, Core Data, SQLite, file system strategy, and data migration basics."
date: 2026-02-12
category: foundation
permalink: /interviews/foundation-storage-persistence/
tags:
  - Foundation
  - Persistence
  - Core Data
  - SQLite
  - Data Migration
difficulty: Medium
excerpt: "25 concise persistence Q&A for iOS interviews covering storage choices, tradeoffs, and migration strategy."
---

## 💾 Storage & Persistence - 25 Quick Q&A

### Q1: `UserDefaults` use case?
**A:** Small preferences/settings, not complex relational data.

### Q2: Keychain use case?
**A:** Secrets (tokens/passwords/keys).

### Q3: Core Data vs SQLite directly?
**A:** Core Data offers object graph + change tracking; SQLite offers raw control.

### Q4: File storage best for?
**A:** Large blobs (images, media, exports).

### Q5: Why not store images in Core Data by default?
**A:** DB bloat and slower fetch patterns.

### Q6: What is lightweight migration?
**A:** Auto migration for compatible Core Data model changes.

### Q7: When migration fails?
**A:** Breaking schema changes needing custom mapping.

### Q8: What is data corruption mitigation?
**A:** Backups, checksums, atomic writes, recovery path.

### Q9: Atomic file write means?
**A:** Write temp file then replace to avoid partial writes.

### Q10: Why background context in Core Data?
**A:** Keep heavy writes off main thread.

### Q11: Merge conflicts in persistence?
**A:** Concurrent updates from multiple contexts/devices.

### Q12: Conflict policy examples?
**A:** Store-trump, object-trump, custom merge.

### Q13: Why indexing matters?
**A:** Speeds query/filter/sort on large datasets.

### Q14: What is write amplification?
**A:** One logical update causing many disk operations.

### Q15: Cache + persistence relationship?
**A:** Cache for speed, persistence for durability.

### Q16: How to design app launch data load?
**A:** Load critical subset first, lazy-load rest.

### Q17: Why version your stored models?
**A:** Supports safe schema evolution and rollback.

### Q18: Offline-first persistence principle?
**A:** Local commit first, sync later.

### Q19: What to log for storage debugging?
**A:** Migration version, DB size, query latency, error codes.

### Q20: How to avoid giant table scans?
**A:** Proper predicates/indexes + pagination.

### Q21: GDPR/CCPA storage implication?
**A:** Data deletion/export workflows and retention control.

### Q22: Why partition data domains?
**A:** Better ownership, safer migration, reduced contention.

### Q23: Interview tradeoff example?
**A:** Core Data productivity vs raw SQLite flexibility.

### Q24: One anti-pattern?
**A:** Treating all data with same storage strategy.

### Q25: Staff-level summary?
**A:** Persistence design should optimize durability, performance, evolvability, and compliance together.
