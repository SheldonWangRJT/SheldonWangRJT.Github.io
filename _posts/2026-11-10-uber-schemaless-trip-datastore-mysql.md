---
layout: single
title: "Uber Was Going to Run Out of Database by the End of 2014: How Schemaless Turned MySQL into an Append-Only Trip Log"
description: "In early 2014 Uber's trip data lived on a single Postgres, and growth meant the company would run out of database space before the year ended. The answer was Schemaless: a thin layer over sharded MySQL where every write is an immutable cell, buffered writes close the async-replication loss window, a single master per shard turns storage into a partitioned log, and triggers turn that log into the billing pipeline. It scaled Uber from 2014 onward — and its limits are exactly what its successor, Docstore, was built to fix."
date: 2026-11-10 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Uber
  - Schemaless
  - MySQL
  - Sharding
excerpt: "In early 2014 Uber's trip data lived on a single Postgres, and the company was going to run out of database space before the year ended. Schemaless fixed it without replacing MySQL: immutable cells, buffered writes, a partitioned log, and triggers that bill the trip."
---

> [中文版 Chinese version](/backend%20infra/uber-schemaless-trip-datastore-mysql-zh/)

This is the fifth entry in the 🚀 Extreme Scale series.

Start with the deadline. In early 2014, Uber's trip data lived on a single Postgres instance, and growth was eating disk so fast that the team concluded the company's infrastructure would fail to function by the end of the year: it simply could not store enough trip data. Not "queries would get slow." Not "we would need a bigger box." The database would run out of room, and the business would stop. The mission that followed took most of the year and engineers from offices around the world — and the system they built, Schemaless, is still the source of truth for Uber's trip pipelines a decade later.

The interesting part is not that Uber built its own database. The interesting part is *why the obvious alternatives lost*, and what the winning design refused to do. Schemaless is deliberately boring in the one place that matters most: underneath it is plain MySQL, a database the team already knew how to operate at 3 a.m. Everything clever sits in the thin layer above it, and each piece of that layer exists to break one specific failure mode of the system it replaced. This article walks through those failure modes one by one — because the mechanisms are the lesson, and the limits are the second half of it.

## Background: five requirements, three rejected databases, one deciding factor

Uber's team wrote down five requirements before choosing anything, and the list is worth quoting in full because every later mechanism maps to one of them:

1. **Linear capacity.** Adding servers had to add disk *and* reduce response times. Postgres could not do this.
2. **Write availability.** Uber already had a Redis buffer: if a Postgres write failed, the trip sat in Redis and was retried later. But while it sat in Redis it could not be read, so billing was lost for that trip. Annoying, but at least the trip was not lost. The new system needed the same safety net, built in — favoring write availability over read-your-writes.
3. **Downstream notification.** Billing, analytics, and other trip processing ran as simultaneous steps; if any step failed, everything had to be retried even though some steps had succeeded. The team wanted those steps broken out and driven by data changes, the way Kafka 0.7 had been tried and could not be run losslessly.
4. **Secondary indexes.** Moving away from Postgres meant losing Postgres indexes, so the new store had to support searching trips the same way.
5. **Operational trust.** The requirement that decided everything: if the team got paged at 3 a.m. because the datastore was down and taking the business with it, would they have the operational knowledge to fix it quickly?

Against that list, the team surveyed Cassandra, Riak, MongoDB, and others. All of them scaled linearly by adding nodes. But none had a built-in way to notify downstream systems of changes — that would have to be built at the application level — and their indexes degraded into scatter-gather queries across all nodes when many values were indexed. And some of the candidates were single clusters that had never served user-facing online traffic at Uber, with operational issues the team had already felt. The decision, in Uber's own words, "ultimately came down to operational *trust*." The design is inspired by FriendFeed, and the operational focus by Pinterest — but the choice of substrate was the opposite of fashionable: keep the database you know how to run, and build the missing properties in a thin layer on top of it.

That layer is Schemaless: a key-value store that saves any JSON without strict schema validation — hence the name — built from append-only sharded MySQL, buffered writes for failing masters, a publish-subscribe change feed called triggers, and global secondary indexes.

## The data model: a cell, three coordinates, no schema

Schemaless is an append-only, sparse, three-dimensional persistent hash map, very similar to Google's Bigtable. Its smallest entity is the **cell**: an immutable JSON blob, referenced by a **row key** (a UUID), a **column name** (a string), and a **ref key** (an integer). Once written, a cell cannot be overwritten or deleted — in special cases old records can be deleted, but that is the exception. To "update" a cell you write a new cell with the same row key and column name and a higher ref key; the latest cell is the one with the highest ref key. The ref key can also serve as list entries, but versioning is its typical use.

There is no predefined or enforced schema. Columns are defined entirely by the application, and rows do not need to share column names. Applications typically group related data into the same column, so all cells in a column have roughly the same application-side schema — which lets the application change its schema rapidly without any downtime on the database side.

Uber's trip store, a service called **Mezzanine**, shows why the column split matters. A trip is not one record written once: its pieces arrive asynchronously — pickup and drop-off, the fare calculation, billing attempts, fare adjustments, rider or driver feedback that can arrive days after the trip finished. Mezzanine models a trip as four columns:

- **BASE** — the basic trip info (driver UUID, time of day), written once when the trip finishes.
- **STATUS** — one cell per billing attempt, since a charge can fail on an expired or declined card and be retried.
- **NOTES** — cells for rider or driver feedback.
- **FARE ADJUSTMENT** — cells only if the fare changes, for example after an inefficient route.

Splitting the trip this way does two concrete things: it avoids data races, because BASE, STATUS, and NOTES are written at different times by different processes and never contend on the same cell; and it minimizes the amount of data written on each update, because a billing retry writes one small STATUS cell instead of rewriting the whole trip. The schema lives in the application. The database just stores JSON.

## Architecture: workers, storage nodes, and 4,096 shards

Schemaless has two node types, worker nodes and storage nodes, which may sit on the same host or separate ones — separated so each part can scale independently. Clients talk to worker nodes over HTTP; workers route requests to storage nodes, aggregate results, and run background jobs. The client library transparently retries against other hosts when a worker is slow or failing, which is safe because Schemaless writes are idempotent.

The dataset is divided into a **fixed number of shards — typically configured to 4,096** — mapped to storage nodes. A cell lands on a shard by its row key. Each shard is replicated to a configurable number of storage nodes, forming a storage cluster of **one master and two minions**, with minions spread across multiple data centers so a catastrophic data-center outage does not take the data with it.

{% mermaid %}
graph TD;
    A["Client - Mezzanine trip service"] -->|"HTTP request"| B["Worker nodes - route and fan out"];
    B -->|"cell mapped by row key UUID"| C["Shard map - 4096 fixed shards"];
    C -->|"write goes to master"| D["Storage cluster - 1 master plus 2 minions"];
    D -->|"async MySQL replication"| E["Minion in another data center"];
    D -->|"async MySQL replication"| F["Minion in another data center"];
    B -->|"read from any node in cluster"| D;
    B -->|"buffered write - secondary first"| G["Random secondary master - buffer table"];
    G -->|"background job replays to primary"| D;
{% endmermaid %}

Reads can come from any node in the cluster; the default is the master, which guarantees the client sees its own write. Writes must go to the master, and the master replicates asynchronously to its minions. If the master is available, reads always return the latest data. If it is not, a minion may serve slightly stale data — in production, replication latency is typically subsecond, so minions tend to be fresh — and worker nodes use a circuit breaker on storage connections so reads fail over to a healthy node. A minion going down does not affect writes at all.

That is the whole topology. Now the mechanisms — each one breaks a specific failure loop, and each one has a boundary the team states honestly.

## Mechanism 1: immutability — the update race, deleted by never updating

The first failure mode is the oldest one in database engineering: two processes updating the same row. In a relational store, an update is a read-modify-write under a lock. When billing retries, fare adjustments, and driver feedback all touch the same trip, they queue on the same row lock; a slow writer holds the lock while others wait; a crash mid-update leaves a half-applied state that the next writer has to reason about. The contention loop is: more concurrency on one trip means more lock waiting, which means longer transactions, which means more lock waiting.

Immutability deletes the loop instead of tuning it. A cell, once written, is never modified. A billing retry does not update the STATUS cell; it appends a new STATUS cell with a higher ref key. A fare adjustment does not rewrite the trip; it appends a FARE ADJUSTMENT cell. There is no row to lock, because no write ever touches a row another write touched. Two processes writing different columns of the same trip cannot block each other at all, and two processes writing the same column simply produce two versions, with the highest ref key winning deterministically. Readers never see a torn write, because a cell is either fully present or not present.

The storage layout makes the append cheap in a second, mechanical way. Each shard is a separate MySQL database, and each cell is a row in the shard's entity table:

| Column | Type |
| --- | --- |
| added_id | auto-increment integer |
| row_key | UUID |
| column_name | string |
| ref_key | integer |
| body | compressed blob |
| created_at | datetime |

The `added_id` column is the MySQL primary key. Because it auto-increments, MySQL writes cells linearly on disk — new rows append at the end of the clustered index instead of being inserted into random pages, which keeps write I/O sequential. A compound index on `(row_key, column_name, ref_key)` makes looking up a trip's cells fast, and the body holds the JSON compressed with MessagePack and ZLib, chosen after experiments for compression speed and size. The `created_at` timestamp lets triggers find cells written after a given date.

What immutability does **not** fix: storage grows forever, because nothing is ever overwritten. Every billing retry, every version, every superseded cell stays on disk until a special-case deletion. Years later this became a real cost problem — Uber's Jellyfish project exists precisely because Schemaless had "amassed Uber's data" on fast, expensive storage, and it had to batch cells and re-compress them with ZSTD (100 cells per batch, level 7, up to 40% saving) to bring the bill down. Immutability also means corrections are new versions, not fixes: a wrong cell cannot be edited in place, and "latest" is always a lookup, not a read of the row itself. The mechanism trades disk for the absence of races — a good trade at Uber's scale, but a trade with a bill attached.

## Mechanism 2: buffered writes — the async-replication loss window, closed with a second copy

The second failure mode comes from the replication choice itself. Schemaless uses MySQL **asynchronous** replication: the master persists a write, then replicates it to the minions. If the master receives a write, persists it, and then fails — a hard-drive failure, say — before replication has happened, that write is lost. It existed on exactly one host, briefly, and then on none. The window is small; the consequence is a lost trip, which for a billing system is unacceptable.

Buffered writes close the window by refusing to let a write exist on only one host. When a worker receives a write, it writes it to **two** clusters: a *secondary* first, then the *primary*. The client is told the write succeeded only if both succeed. The primary master is where the data is expected to be found on later reads. The secondary master is chosen at random, and the write goes into a special buffer table there. A background job watches the primary's minions; once the cell appears there, it deletes the cell from the buffer table. Having the secondary means all data is written on at least two hosts.

The same mechanism covers the case where the primary master is simply down. If the master is unavailable, Schemaless still accepts writes — they are persisted to disk on another, randomly chosen master, exactly like hinted handoff in Dynamo or Cassandra. The client is told the write succeeded, and also told the master is down, so it knows the cell is not immediately readable. When the master returns, the buffered cells are replayed into the primary cluster.

None of this works without **idempotency**. Writes are idempotent because a cell is identified by its (row key, column name, ref key) triple: writing a cell that already exists is rejected. So the background replay can safely re-deliver buffered cells — if two copies of the same write were buffered, only one succeeds when the primary comes back and the rest are rejected. And the client library can safely retry a timed-out write against another worker, because a retry is a no-op if the first attempt actually landed.

What buffered writes do **not** fix: they shrink the loss window from "one host dies at the wrong moment" to "two specific hosts die at the wrong moment" — they do not eliminate it, because the replication underneath is still asynchronous. And they create a new state the application has to understand: a write can be **durable but not readable**. A trip accepted while its shard's master is down exists on disk, but no read can find it until the master returns or a minion is promoted. The client is told this explicitly, and the design is honest about it: write availability was requirement two, read-your-writes was explicitly sacrificed to get it. The double write also costs real work — every write is written twice, and the background reaper is a permanent piece of machinery that must itself never lose a buffered cell.

## Mechanism 3: one master, one order, one log — how storage becomes an event bus

The third mechanism is the one that turns Schemaless from a store into the backbone of Uber's trip processing, and it falls out of a design choice that looks like a limitation: **a single node receives all writes for a shard**. One master per shard means writes to that shard have a **total order** — a single sequence, the same on every replica. The auto-increment `added_id` is the physical form of that order: it is identical on all replicas of a shard, and it denotes insertion order. So each shard is, in effect, its own log: a partitioned log of cell revisions, where the partition key is the shard and the position is the `added_id`.

That is what makes **triggers** possible without a separate event bus. Uber had tried Kafka 0.7 for trip events and could not run it losslessly; the requirement was a lossless notification mechanism. Schemaless's answer is to tail its own log. The API exposes log-style access alongside random access: `get_cells_for_shard(shard_no, location, limit)` returns the next cells after a location — a timestamp or an `added_id` — plus the next location offset, so a client can poll forward exactly like `tail -f`. The triggers framework does this tailing, keeps track of the offsets, and calls a registered function whenever a new cell lands in a watched column.

The billing flow is the canonical example. A handler is registered on the BASE column with a decorator; when a trip finishes and its BASE cell is written, the framework calls `bill_rider` with the trip UUID. The handler checks the latest STATUS cell — if `is_completed` is absent, the rider has not been billed — fetches the trip from BASE, charges the card, and writes the result back as a new STATUS cell. Billing is decoupled from trip creation: the trip service writes one cell, and the billing service reacts to it. The same log feeds the analytics warehouse and cross-datacenter replication.

{% mermaid %}
graph TD;
    A["Shard 1 - partitioned log of cells"] -->|"tail by added_id offset"| B["Trigger worker 1 - owns shard 1"];
    C["Shard 2 - partitioned log of cells"] -->|"tail by added_id offset"| D["Trigger worker 2 - owns shards 2 and 5"];
    B -->|"at-least-once call"| E["bill_rider - watches BASE column"];
    D -->|"at-least-once call"| E;
    E -->|"charge card"| F["Payment provider"];
    E -->|"write result back"| G["STATUS column - new cell"];
    H["Leader worker - assigns shards"] -->|"reassign on failure"| B;
    H -->|"reassign on failure"| D;
    I["ZooKeeper - offsets and leader election"] -->|"persist progress"| B;
    I -->|"persist progress"| D;
{% endmermaid %}

The framework makes this scalable and fault-tolerant with three pieces of machinery. First, **shard ownership**: the framework divides the shards between worker processes so only one worker handles a given shard — up to 4,096 workers for a 4,096-shard instance, added or removed online. Second, **a leader**: one worker is designated leader and assigns shards; if a worker dies, the leader reassigns its shards to healthy processes. Third, **persisted offsets**: the framework stores the `added_id` of the latest successfully triggered cell per shard in shared storage such as ZooKeeper (or a Schemaless instance itself), so a restart resumes from the stored offset instead of from the beginning. The shared storage also coordinates leader election and worker discovery.

The failure handling is layered deliberately. If a worker process dies, the leader redistributes its shards. If the leader dies, a new one is elected — cells keep being processed during the election, but work cannot be redistributed and workers cannot be added or removed until it completes. If ZooKeeper goes down, cells are still processed, with the same restriction. If a database node goes down, triggers read from any replica. And because delivery is **at-least-once** — a handler is called at least once per cell, and possibly more if the handler or something outside it errors — every trigger function must be idempotent; the billing example handles this by checking whether the cell was already processed before charging.

What the log does **not** fix: ordering is **per shard only**. There is no global order across shards, so two cells in different shards have no defined sequence — a consumer that needs cross-trip ordering has to build it itself. A poison cell stalls its shard: within a shard, cells trigger in write order, so a cell whose handler always fails blocks everything behind it until the framework quarantines repeatedly-failing cells to a separate queue — and if the quarantined count passes a threshold, triggering stops entirely, which Uber treats as a signal that a systematic error needs a human. And at-least-once is a contract with the handler, not a property of the store: a non-idempotent billing handler would charge a rider twice on a retry. The log gives you lossless delivery; it cannot give you correct handling.

## Mechanism 4: sharded indexes — the scatter-gather trap, dodged by a shard field

The fourth requirement — secondary indexes — hides the nastiest scaling trap in the whole design. A naive index over a sharded store is a **scatter-gather** query: to find a driver's trips, you ask every shard, wait for all of them, and merge. With 4,096 shards, one lookup costs 4,096 sub-queries, and the slowest shard sets the latency. Index more fields and every query pays that fan-out. Uber had already named this as the reason the off-the-shelf options failed their index requirement.

Schemaless dodges the trap by sharding the index itself. Every index must designate one of its fields as a **shard field**, and the index is partitioned by that field — so an index query carrying the shard field goes to exactly one shard. For Mezzanine, the `driver_partner_index` is defined over the BASE column with `driver_partner_uuid` as the shard field, plus the city and trip creation time denormalized into the index. Finding all trips for a driver in a city within a time range is then a single-shard query.

Denormalization is the second half of the trick. Schemaless lets the index carry a copy of the cell data it is built from, so an index query can answer from the index alone without a second hop to the entity table. The team explicitly recommends denormalizing anything you might need into the index. The trade is stated plainly in the original post: "we thereby trade storage for fast query lookup." One shard, one lookup, no merge — bought with duplicated bytes on every indexed field.

What sharded indexes do **not** fix: they are **eventually consistent** — Uber's own synopsis calls them "efficient, eventually consistent secondary indexes," and an index query can lag the entity write it describes. Every index also adds write amplification and storage: each new cell must update each index defined over its columns, so an index you rarely query still taxes every write. A query that does *not* carry the shard field is back to scatter-gather, with the full 4,096-way fan-out — the index does not help it at all. And a hot shard field concentrates load exactly the way a hot key does anywhere else: one driver-partner with an enormous number of trips owns a disproportionate share of one shard's index, and no amount of index design spreads it. The index solves fan-out for queries that name the shard field, and nothing else.

## What Schemaless cannot do — and what replaced it

The honest boundary of Schemaless is the list of things it never tried to be. It has no transactions: cells are written one at a time, and there is no atomic multi-cell or multi-shard update. It has no cross-shard queries beyond the single-shard index lookup — anything that needs to join across shards is application work. It has no schema enforcement: the database stores JSON and trusts the application, so a buggy writer can persist malformed data that every reader then has to tolerate. And its consistency contract is deliberately narrow: read-your-writes only when you read from the master, eventually consistent indexes, and writes that can be durable-but-invisible during a master outage.

Uber's later history is a record of those bills coming due. **Docstore**, the evolution Uber published after the Schemaless series, keeps MySQL as the engine but adds what Schemaless refused: transactions, materialized views, associations, and change data capture, with strict serializability *within a partition* — still not across partitions, because that boundary is the price of the shard-local design. And **Jellyfish** exists because append-only storage on expensive disks got expensive: Schemaless was still the source of truth for pre-existing pipelines while Uber consolidated new use cases onto Docstore, and the tiering project had to batch and re-compress cells to claw back up to 40% of the storage cost. Neither project repeals Schemaless. Both are priced in its original tradeoffs.

## Lessons worth stealing

1. **Operational trust is a requirement, not a vibe.** Uber rejected technically capable databases because the team could not have fixed them at 3 a.m. The winning design kept the substrate the team already knew — MySQL — and built the missing properties in a layer thin enough to reason about under pressure. When you choose a datastore, ask who gets paged and whether they can fix it.
2. **Immutability deletes whole classes of bugs instead of mitigating them.** No updates means no row locks, no torn writes, no read-modify-write races — and an append-only log falls out for free. The price is storage growth and version lookups, which is a bill you can measure, unlike a race condition.
3. **Close the async-replication loss window with a second copy, not with synchronous replication.** Buffered writes accept the cost of writing twice and the complexity of a reaper, and in exchange keep writes available during a master outage — with the honest caveat that durable-but-invisible is a real state clients must handle.
4. **A total order per shard is worth more than a global order you cannot afford.** One master per shard is a limitation that buys the partitioned log, and the partitioned log buys lossless triggers — an event bus with no separate system to operate. Ordering guarantees should be scoped to the smallest unit that still delivers the feature.
5. **Indexes must be sharded or they are scatter-gather in disguise.** An index that fans out to every shard is not an index at scale; it is a full scan with extra steps. Designate a shard field, denormalize into the index, and audit every query for whether it carries the field — because the one that does not will cost 4,096 sub-queries.

Schemaless's real lesson is not "build your own database." It is that a datastore is a bundle of promises — linear capacity, write availability, lossless notification, indexed lookup, operability — and the art is deciding which promise each mechanism keeps, which failure loop it breaks, and what it charges for the job. Uber kept MySQL and bought the rest with four mechanisms and a decade of operating them. The receipt, in storage bills and successor systems, is part of the design.

## Sources

- Uber Engineering, "Designing Schemaless, Uber Engineering's Scalable Datastore Using MySQL" (part one of three). https://www.uber.com/ng/en/blog/schemaless-part-one-mysql-datastore/ — early-2014 Postgres capacity crisis; the five requirements; Cassandra, Riak, and MongoDB evaluated and rejected; operational trust as the deciding factor; FriendFeed-inspired design and Pinterest-inspired operational focus; the cell data model (row key UUID, column name, ref key), immutability, and the Mezzanine trip columns BASE, STATUS, NOTES, and FARE ADJUSTMENT; triggers and sharded, denormalized secondary indexes.
- Uber Engineering, "The Architecture of Schemaless, Uber Engineering's Trip Datastore Using MySQL" (part two). https://www.uber.com/mx/en/blog/schemaless-part-two-architecture/ — worker and storage nodes; 4,096 shards; one master and two minions per cluster across data centers; reads from any node, writes to the master, subsecond replication; circuit breakers; buffered writes (secondary-then-primary, success only if both succeed, background reaper, idempotency); the entity table with auto-increment added_id, compound index, and MessagePack plus ZLib compressed bodies.
- Uber Engineering, "Using Triggers On Schemaless, Uber Engineering's Datastore Using MySQL" (part three). https://www.uber.com/kr/en/blog/schemaless-part-three-datastore-triggers/ — triggers as the trip-processing engine; the bill_rider example and at-least-once, idempotent handlers; Schemaless as a partitioned log; get_cells_for_shard and added_id offsets; shard ownership, leader assignment, ZooKeeper-persisted offsets; poison-cell quarantine and the stop threshold; up to 4,096 trigger workers.
- Uber Engineering, "Evolving Schemaless into a Distributed SQL Database." https://www.uber.com/us/en/blog/schemaless-sql-database/?uclick_id=37e0581b-5432-40df-b0a8-4b055bb80aa7 — Docstore as the transactional successor: strict serializability within a partition, transactions, materialized views, associations, and change data capture on MySQL.
- Uber Engineering, "Jellyfish: Cost-Effective Data Tiering for Uber's Largest Storage System." https://www.uber.com/au/en/blog/jellyfish-cost-effective-data-tiering/ — Schemaless still the source of truth for pre-existing pipelines while use cases consolidate on Docstore; batching 100 cells with ZSTD level 7 for up to 40% storage saving.
