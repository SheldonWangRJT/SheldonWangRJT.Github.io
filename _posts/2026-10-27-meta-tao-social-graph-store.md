---
layout: single
title: "One Billion Reads a Second, 96.4% Served From Cache: How Meta's TAO Stores the Social Graph"
description: "TAO, the data store behind Facebook's social graph, processes a billion reads and millions of writes per second over many petabytes — on top of ordinary sharded MySQL. It gets there not with a smarter database but with a narrow graph API, a two-tier write-through cache whose leader serialises every write to a shard, and consistency messages smuggled inside the MySQL replication stream."
date: 2026-10-27 08:00:00 -0700
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Meta
  - TAO
  - Social Graph
  - MySQL
  - Distributed Cache
excerpt: "A billion reads a second, millions of writes, many petabytes — served by sharded MySQL behind a graph-aware cache. TAO's trick is not a new database. It is a deliberately narrow API plus a leader that stands between every cache miss and the database."
---

> [中文版 Chinese version](/backend%20infra/meta-tao-social-graph-store-zh/)

This is the third entry in the 🚀 Extreme Scale series.

Start with the number that should not work. In their 2013 USENIX ATC paper, TAO's authors report that a single production deployment of the system — one logical instance for all of Facebook — "continually processes **a billion reads and millions of writes per second**" over a data set of **many petabytes**, running on thousands of machines. And the persistent store underneath it is not an exotic new database. It is MySQL, sharded.

The instinctive reading is that Facebook must have made MySQL dramatically faster. It did not. What it built, starting in early 2009, was a layer that makes sure MySQL almost never gets asked a question — a **96.4% overall read hit rate** in the cache tiers in front of it, measured in production — and that the questions it does get asked are the small, shaped subset it is good at. TAO ("The Associations and Objects") is best understood as a set of mechanisms for keeping a very ordinary database away from a very un-ordinary workload, and every mechanism earns its place by breaking a specific failure of the system it replaced: memcache in front of MySQL, with the control logic living in application code.

## Background: a workload that resolves the graph at view time

Facebook's core decision, stated plainly in the paper, is to *pull* the social graph rather than push it. A single page aggregates and filters hundreds of items — feed stories, comments, likes, check-ins — and every item passes a privacy check against the *current viewer*, so two people looking at the same check-in see different renderings of it. That makes pre-computing views at write time infeasible: the aggregated result depends on who is asking. So the graph is resolved, item by item, at view time, inside a budget of a few hundred milliseconds. That one product decision is what manufactures a billion reads a second.

Three properties of that read workload then dictate the design:

**Creation-time locality.** Most graph data is old, but most queries want the newest slice of it: the 50 most recent comments, the latest likes. A block cache in a database buffer pool exploits *spatial* locality — neighbouring bytes on a page — which this workload largely does not have. Worse, a large share of queries are negative ("does this user like that story?" is false for most stories in a feed), and answering one by dragging several kilobytes of disk block into a buffer pool pollutes that pool for no benefit. The paper names this mismatch directly as a reason InnoDB's buffer pool could not be the main cache.

**Read mix dominated by edges, not nodes.** In the paper's sampled production reads, association operations are about 71% of the total: assoc range 40.9%, assoc get 15.7%, assoc count 11.7%, assoc time range 2.8%, against 28.9% object gets. A store optimised for fetching whole records by key is optimised for the minority of the traffic. The hot path is "give me the recent edges out of this node, of this type, and tell me how many there are."

**Reads dwarf writes by orders of magnitude.** A billion reads against millions of writes per second is a ratio somewhere between a hundred and a thousand to one. Any design that pays a coordination cost on *reads* to make *writes* cleaner is spending on the wrong side of that ratio. TAO consistently does the opposite, and says so: it "explicitly favours efficiency and availability over consistency."

## The data model: two types, one shard rule

TAO's entire data model is two things. **Objects** are typed nodes — users, posts, photos, check-ins — identified by a globally unique 64-bit id, holding key-value fields under a per-type schema. **Associations** are typed directed edges, identified by the triple (id1, atype, id2), with at most one association of a given type between a pair of objects, and each carrying a time field. Association lists — all edges of one type out of one object, sorted descending by that time — are the unit the API is built around: point queries test one edge, range queries page through the newest edges, count queries return a list's length in constant time from a maintained counter.

The mechanism that makes this model cheap is a placement rule, and it is worth stating exactly: **an object's id embeds its shard id, and an association is stored on the shard of its id1.** Every association query is anchored at id1 — "edges out of this node" — so storing the edge with its source means every such query is served by exactly one shard, on one server, with no fan-out and no scatter-gather. Two objects land on the same shard only if they were deliberately colocated at creation. The dataset is divided into far more logical shards than servers (the engineering blog puts it at hundreds of thousands of shards), so load is balanced by remapping shards to servers, and a hot shard can be migrated or cloned without moving the whole dataset.

The price of the rule is paid in the opposite direction, and TAO pays it openly. Traversing an edge *backwards* — "who liked this post" instead of "what did this user like" — is a different list on a different shard, so types that need both directions declare an **inverse type**, and TAO maintains both edges on every write. That is duplicated storage and a two-shard write, in exchange for making both traversal directions single-shard reads. Given the read/write ratio above, it is the right trade — and its failure mode is examined below, because the two writes are *not* atomic.

Equally deliberate is what the API refuses to do. There are no joins, no cross-shard transactions, and no server-side graph traversals or set intersections: the paper argues that executing a complex traversal inside a user request is almost always a design error, and that with an unclustered graph a client orchestrating simple point and range queries uses about the same bandwidth as a server-side intersection would. This refusal is not a missing feature; it is the load-bearing constraint. A narrow API is what allows the cache below to *understand* what it is caching — lists, prefixes, counts — instead of caching opaque query results that any write might invalidate. That distinction is the whole difference between TAO and the memcache layer it replaced.

{% mermaid %}
graph TD;
    A["Web servers - hundreds of graph lookups per page"] -->|"point and range queries"| B["Follower cache tier - one per region"];
    B -->|"cache miss or write"| C["Leader cache tier - one leader per shard"];
    C -->|"bounded queries only"| D["MySQL shard - objects and associations"];
    C -->|"invalidation and refill messages"| B;
    D -->|"replication stream with embedded cache messages"| E["Secondary region - leader and follower tiers"];
    E --> F["Secondary region MySQL replica"];
{% endmermaid %}

## What was actually broken in memcache plus MySQL

TAO grew out of a lookaside cache: application code checked memcache, fell back to MySQL on a miss, and invalidated cache entries after writes. The paper lists why that structure, and not the components, failed at graph scale. Each failure is a mechanism, and TAO's design is the point-by-point answer.

**Whole-list invalidation.** Edges were stored as one cached list item. One new comment meant invalidating the entire list, so the most active — therefore most valuable — cached items were exactly the ones most often destroyed. Hit rate fell precisely where traffic concentrated.

**Whole-list transfer.** A query that needed three edges had to pull the entire list from memcache to the web server and filter there, paying network and CPU for data that would be discarded.

**No control point.** Control logic — who may query the database, how duplicate simultaneous misses are merged, how a misbehaving client is throttled — ran independently in every application process, uncoordinated. When a hot item expired, nothing stopped thousands of web servers from missing simultaneously and hammering the same shard: a thundering herd with no gatekeeper.

**Expensive read-after-write.** MySQL replicas receive writes asynchronously. In a region reading from a replica, a user's own write could be invisible to their next page load unless the system tracked which keys were stale and routed around the lag — machinery (remote markers, in the earlier memcache work) that was complicated and costly to run per key.

TAO's answer to all four is the same structural move: take the control logic out of the clients and put it in a cache service that speaks the graph API itself. The sections below are that move, mechanism by mechanism.

## Mechanism 1: a two-tier cache where the leader is a gatekeeper, not a bigger cache

Each region runs two cache tiers. **Followers** face the clients: they serve reads, scale horizontally, and read throughput scales with how many follower servers exist. **Leaders** sit between followers and MySQL: exactly one leader hosts a given shard, all writes to that shard pass through it, and it is the only tier that talks to the database for that shard.

Splitting the tiers by role, rather than stacking two identical caches, is what makes each mechanism possible:

**Thundering-herd suppression.** Because every miss and write for a shard funnels through its single leader, the leader can see the whole stream for that shard. The paper states the two controls directly: the leader "does not issue concurrent overlapping queries to the database" — ten followers missing on the same list in the same moment become one database query whose result fills all of them — "and also enforces a limit on the maximum number of pending queries to a shard." The database therefore sees a *bounded* query rate per shard no matter how bursty the front end gets. In the lookaside design this was impossible in principle: the coordination point did not exist. Here it exists because the architecture created exactly one throat per shard and put the control logic in it.

**Write serialisation per shard.** All writes to a shard go through its leader, so the leader is naturally consistent for that shard and concurrent writes are ordered there rather than racing. This is a much cheaper place to serialise than the database: the leader is in memory, in-region, and only serialises writes (millions per second) while reads (a billion per second) stay parallel across every follower.

**Graph-aware caching instead of result caching.** Because the tiers implement the API, they cache objects, association lists and counts as *data structures*, not query strings. A cached count of zero answers a range query with an empty result. And association lists are cached only as **contiguous prefixes** — the newest N edges, which is precisely the slice creation-time locality says will be asked for. An assoc range asking for the 50 newest comments never touches the database if the prefix covers it; the long tail of old edges simply is not in memory, by design rather than by eviction luck.

## Mechanism 2: write-through with two different maintenance messages

How caches are updated after a write decides both freshness and hit rate, and TAO uses two different messages because objects and association lists fail differently under invalidation.

For **objects**, the leader enqueues an **invalidation** to each follower after an update. Deleting a cached object is safe: the next read refills it with one query, and nothing else is lost.

For **associations**, invalidation would be destructive. Followers cache only a contiguous prefix of a list; invalidating on an edge write could truncate that prefix and discard many still-valid cached edges, recreating the whole-list invalidation disease from the memcache era. So the leader instead sends a **refill** message: if the follower has that association list cached, the refill triggers the follower to re-query the leader and refresh the list in place, keeping the prefix intact and current. Same trigger, different verb — because the cost of "drop it" is trivial for a single object and expensive for a prefix.

Two details keep this honest under asynchrony. First, **version numbers**: every cache maintenance message carries one, so a follower can recognise and ignore a maintenance message that has been overtaken by a newer state — the paper notes the follower that originated a write is updated synchronously from the leader's reply, and the version lets it discard the duplicate async message when it arrives later. Second, the **changeset reply**: on a successful write the leader returns the actual change, which is propagated synchronously down the chain to the follower that originated the write. That is the mechanism behind TAO's central consistency guarantee — **read-after-write within a tier**: the user who just liked a post reloads and sees it, not because the system is strongly consistent, but because *their own* write was pushed into *their* follower's cache on the reply path, before the request returned. Everyone else converges asynchronously.

## Mechanism 3: geography — replicate the whole graph, forward the writes, piggyback on the replication stream

The social graph is tightly interconnected; there is no way to partition users so that cross-region requests are rare. TAO's response is to refuse to partition geographically at all: **every region holds a complete copy of the multi-petabyte graph**, with regions defined as clusters of nearby data centers where intra-region latency is typically under 1 millisecond. Any read can therefore be satisfied entirely inside the user's region, at regional latency, whatever it asks for.

The cost lands on writes, deliberately. Each shard has a single **primary region**; a write arriving in a secondary region is forwarded by its local leader to the primary region's leader, applied there, and propagated back by ordinary asynchronous MySQL replication. The paper's numbers make the asymmetry concrete: average write latency in the primary region is **12.1 ms**; from a region 58.1 ms of round-trip away it is **74.4 ms** — the write pays the inter-region round trip, the read never does. At a billion-to-millions read/write ratio, buying local reads with remote writes is arithmetically obvious.

The subtle mechanism is *when* secondary-region caches hear about a write. If a secondary leader invalidated its caches the moment a write was forwarded, a subsequent local read would refill from the local MySQL replica — which has not yet received the write — and cache the stale value as if it were fresh. TAO avoids that race by **embedding the invalidation and refill messages in the MySQL replication stream itself**: they are delivered in a region only *after* the transaction that caused them has been applied to that region's replica. The cache can therefore never be told "this changed" before the local source of truth actually contains the change. Measured replication lag in production: replica storage lagged the primary by **less than 1 second 85% of the time, less than 3 seconds 99% of the time, and less than 10 seconds 99.8% of the time** — which is the real staleness budget a TAO client in a secondary region lives with for other people's writes.

{% mermaid %}
graph LR;
    A["Write arrives in a secondary region"] --> B["Local leader forwards write to primary region"];
    B --> C["Primary leader applies write and updates its caches"];
    C -->|"changeset on the reply path"| D["Originating follower updated synchronously"];
    C -->|"MySQL replication carries the transaction"| E["Secondary replica applies the transaction"];
    E -->|"only then are embedded messages delivered"| F["Secondary caches receive invalidation or refill"];
{% endmermaid %}

## The measured result

The paper's production numbers (2013 hardware, sampled across all regions) describe a system whose cache is doing nearly all the work:

- **Overall read hit rate: 96.4%.** Roughly one read in 28 reached MySQL.
- **Latency, hits vs misses.** Cache hits show a median of about **1.0–1.3 ms** across operation types, with 99th percentiles of roughly 25–33 ms. Misses cost a median of 5.0–8.2 ms, and object-get misses average 75.3 ms with a 99th percentile of 186.4 ms — the long tail lives almost entirely on the miss path, which is why hit rate, not database speed, is the metric that matters.
- **Availability.** Over 90 days, the fraction of failed TAO queries measured at the web server was **4.9 × 10⁻⁶** — with the authors' own caveat that one failed query can suppress dependent queries, so the number flatters slightly.
- **Failover was routine, not exceptional.** Over the sample, 0.15% of follower misses bypassed a failed leader and went straight to the database; 0.045% of writes were delegated to a random surviving leader; replica databases were promoted to primary 0.25% of the time for maintenance or downtime. The system was designed so these paths are normal traffic, not incidents.

## What TAO cannot do — the boundaries are the design

**No atomicity across shards, including inverses.** A write with an inverse touches two shards, and TAO explicitly does not make the pair atomic. If a failure lands between them, the forward edge exists without its inverse — a "hanging" association that an asynchronous repair job cleans up later. Any feature that reads both directions during that window observes a graph that briefly disagrees with itself. Referential tidiness is eventual, like everything else here.

**High-degree objects defeat the prefix cache.** Many objects have more than 6,000 associations of a single type; TAO does not cache those complete lists, only prefixes. A point query asking whether a specific edge exists in the *uncached tail* of such a list cannot be answered from cache — the edge might be there — so it always goes to the database. The paper's mitigations are unglamorous: rewrite the client to check the inverse direction instead (equivalence makes the cheaper side answerable), or use the count to pick a direction. The mechanism that makes normal lists fast is structurally blind to the tail of huge ones.

**Eventual consistency can, rarely, go backwards.** If an item is evicted from a secondary region's cache after a forwarded write updated the cache but before replication updates the local database, a refill can pull the older value and a client can watch data "go back in time" within a follower tier. The paper calls this rare in practice; it is nonetheless a real consequence of maintaining caches ahead of replicas, not a bug that a patch removes.

**Strong consistency exists only as an opt-in escape hatch.** Reads may be marked *critical*, in which case they are proxied to the primary region and read the synchronous MySQL source of truth — the paper's example is authentication, where replication lag must not let stale credentials work. You pay inter-region latency and give up the availability story for exactly the reads that need it, and no others. That the hatch exists is an admission that eventual consistency is a per-data-type decision, not a religion.

**Hot objects still need special handling.** A celebrity object can draw orders of magnitude more reads than any single follower should serve. TAO responds with shard cloning (multiple followers serve the same shard, and maintenance messages fan out to all of them) and, past an access-rate threshold the follower reports, a small client-side cache validated by version numbers — plus the option to throttle clients for very hot objects. Sharding spreads *average* load; celebrity load is a separate problem with separate machinery, in TAO as everywhere else.

## Lessons worth stealing

1. **Narrow the API until the cache can understand it.** TAO's decisive move was refusing joins, traversals and cross-shard transactions, so the cache could store lists, prefixes and counts as first-class structures instead of opaque results. Expressiveness given up at the API is what bought a 96.4% hit rate underneath it.
2. **Create exactly one gatekeeper per shard.** Thundering herds and unbounded database load were unsolvable while control logic lived in thousands of uncoordinated clients. One leader per shard deduplicates overlapping misses, caps pending queries, and serialises writes — cheaply, because it only has to do this at write-and-miss rates, not at read rates.
3. **Invalidate objects, refill lists.** Cache maintenance is not one operation. Dropping a single value costs one refill; dropping a cached prefix destroys the working set. Match the maintenance verb to the cost of losing the cached structure.
4. **Deliver consistency messages in the replication stream, not beside it.** A cache must never learn about a change before the local replica contains it, or refills will cache stale data as fresh. Piggybacking invalidation on the stream that carries the data makes the ordering correct by construction.
5. **Spend the read/write ratio consciously.** Local reads everywhere, remote writes, duplicated inverse edges, read-after-write only for the writer: every TAO trade spends write-side cost and storage to buy read-side latency, because the workload is hundreds of reads per write. Measure your own ratio before copying any of it — a write-heavy workload inverts every one of these choices.

Thirteen years on, TAO remains the clearest worked example of a lesson backend teams keep relearning: at extreme scale you rarely win by building a faster database. You win by deciding precisely which questions the database will never be asked — and building the layer that enforces that decision.

## Sources

- Bronson, Amsden, Cabrera, Chakka, Dimov, Ding, Ferris, Giardullo, Kulkarni, Lawrence, Marchukov, Petrov, Puzar, Venkataramani, "TAO: Facebook's Distributed Data Store for the Social Graph," USENIX Annual Technical Conference (ATC '13), 2013. https://www.usenix.org/system/files/conference/atc13/atc13-bronson.pdf — the data model, shard placement rule, leader/follower design, refill vs invalidation, replication-stream embedding, and all production numbers (billion reads and millions of writes per second, 96.4% hit rate, latency table, replication lag, 4.9 × 10⁻⁶ failure rate, read mix) are from this paper.
- Mark Marchukov, "TAO: The power of the graph," Engineering at Meta, June 25, 2013. https://engineering.fb.com/2013/06/25/core-infra/tao-the-power-of-the-graph/ — the memcache/MySQL background, creation-time locality, API overview, hundreds of thousands of shards, and the primary/secondary region design are from this post.
