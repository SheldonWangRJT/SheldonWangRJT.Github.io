---
layout: single
title: "Never Reject a Write: From Amazon Dynamo's Hash Ring to DynamoDB's 192 Million Requests a Second"
description: "In the 2004 holiday season Amazon's relational databases deadlocked under the shopping rush. The answer was Dynamo — a key-value store that refused to reject a write, built from consistent hashing, sloppy quorums, vector clocks, and Merkle trees. Its descendant DynamoDB answered 192 million requests a second on Prime Day 2026. This is the story of both systems: the mechanisms, what each one fixes, and what neither can fix."
date: 2026-11-17 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Amazon
  - Dynamo
  - DynamoDB
  - NoSQL
excerpt: "Amazon's 2004 holiday deadlocks produced Dynamo, a store that refused to reject a write. Its descendant DynamoDB peaked at 192 million requests a second on Prime Day 2026 — same promise, rebuilt machinery."
---

> [中文版 Chinese version](/backend%20infra/amazon-dynamo-dynamodb-always-writable-zh/)

This is the sixth entry in the 🚀 Extreme Scale series.

Start with the number. During Prime Day 2026 — four days, June 23 to 26 — Amazon DynamoDB processed **over 59 trillion requests** and peaked at **192 million requests per second**, while holding single-digit-millisecond responses. That is not a lab benchmark. That is Alexa, the Amazon.com sites, and every Amazon fulfillment center, all hitting one database service at the same time, while shoppers added items to carts.

The system answering those requests is the descendant of a database Amazon built because its relational databases kept deadlocking under the holiday rush. The story has two acts, and the interesting part is what changed between them: the first system, Dynamo, solved availability by refusing to ever reject a write; the second, DynamoDB, kept that promise but threw away almost everything Dynamo was made of to keep it at multi-tenant cloud scale. The mechanisms are the lesson — each one breaks a specific failure loop, and each one has a boundary the authors state honestly.

## Background: the 2004 holiday outages and one intern's question

By 2004 Amazon was a service-oriented architecture of hundreds of services on tens of thousands of servers across many data centers. A single page request to an e-commerce site typically required the rendering engine to send requests to over 150 services. Every service in the call chain had to obey its performance contract, or the page blew its bound — so Amazon measured service-level agreements at the **99.9th percentile**, not the mean or the median. The paper's example SLA: a service guaranteeing a response within 300 ms for 99.9% of requests at a peak load of 500 requests per second.

The state behind those services mostly lived in third-party relational databases. During the 2004 holiday shopping season, the databases hit hard-to-debug, hard-to-reproduce deadlocks under peak traffic — even though the usage patterns were simple, mostly query-by-primary-key. The relational machinery (joins, transactions, ad-hoc query planning) was pure overhead for workloads that only ever did `get(key)` and `put(key, value)`.

Amazon's correction-of-error review of the outage produced the question that started the project. A young intern, Swaminathan Sivasubramanian — later the VP who ran the database organization — asked: "Why are we using a relational database for this? These workloads don't need the SQL level of complexity and transactional guarantees."

The answer became Dynamo, an internal key-value store for services with very high reliability requirements: shopping carts, session state, best-seller lists, customer preferences, sales rank. Its scale in 2007 already sounds modern: tens of thousands of servers, tens of millions of customers at peak, a shopping cart service serving tens of millions of requests and well over 3 million checkouts in a single day, a session service holding hundreds of thousands of concurrently active sessions. Its design brief was one sentence long: **a customer should be able to view and add items to their shopping cart even if disks are failing, network routes are flapping, or data centers are being destroyed by tornados.**

That sentence is a business decision disguised as an engineering requirement. Rejecting a write loses a sale; accepting a write that later turns out to conflict with another write costs a merge. Dynamo chose the merge, every time.

## Architecture: a ring, a preference list, and three knobs

Dynamo's data model is deliberately minimal: binary objects, usually under 1 MB, identified by unique keys, accessed only by single-key get and put. No operations span multiple items, no relational schema, no isolation guarantees, no ACID. Each service runs its own Dynamo instance, and the initial design targeted up to hundreds of storage hosts per instance.

Placement uses consistent hashing. Both nodes and keys hash onto a 128-bit ring (MD5), and a key belongs to the first node clockwise from its hash. Each physical node is assigned multiple positions on the ring — virtual nodes — so that adding a node moves only its neighbors' keys, load evens out, and a bigger machine can own more of the ring. A key's **preference list** is the first N distinct nodes clockwise from it; the paper's typical configuration is **N = 3**, with replicas spread across multiple data centers so an entire data-center failure does not take the data with it.

Every request is coordinated by one node — usually the first healthy node in the preference list — which fans the work out to the N highest-ranked reachable nodes. Two more knobs tune the tradeoff: **R**, the minimum nodes that must answer a read, and **W**, the minimum that must answer a write. Setting R + W > N yields a quorum-like system; R and W are usually configured below N, because the latency of a get or put is dictated by the slowest of the R (or W) replicas. A write is considered successful once the coordinator has written locally and W − 1 other nodes have responded.

{% mermaid %}
graph TD;
    A["Client - shopping cart service"] -->|"PUT key and value"]| B["Coordinator - first healthy node in list"];
    B -->|"write locally - new vector clock"]| C["Replica 1 - preference list"];
    B -->|"write to W minus 1 more"]| D["Replica 2 - preference list"];
    B -->|"node A down - hinted handoff"]| E["Stand-in node - holds hint for A"];
    E -->|"A recovers - hand back replica"]| F["Node A - intended replica"];
    B -->|"W acks - write succeeds"]| A;
    C -->|"Merkle tree compare - background"]| D;
    D -->|"gossip membership - every second"]| C;
{% endmermaid %}

That is the whole topology: a ring, a list, three numbers. Now the mechanisms — each one breaks a specific failure loop, and each one has a boundary.

## Mechanism 1: sloppy quorum and hinted handoff — the write that cannot be refused

The first failure mode is the oldest one in distributed storage: a strict quorum fails a write whenever too many replicas are unreachable. Under a traditional quorum, a node failure or a network partition makes the data unavailable until the replicas return — precisely the moment a shopping cart must keep accepting items.

Dynamo's answer is the **sloppy quorum**. Reads and writes go to the first N *healthy* nodes in the preference list, which may not be the first N nodes on the ring. If node A is temporarily down during a write, the replica that would have lived on A is sent to the next healthy node down the ring, node D. The replica carries a **hint** in its metadata naming its intended recipient. D keeps it in a separate local database that it scans periodically; when A recovers, D delivers the replica and then deletes its own copy, so the total replica count does not change.

The causal chain is what matters: the failure loop is "unreachable replica means rejected write," and the mechanism breaks it by *decoupling the write's destination from the key's owner*. Durability is preserved because the write still lands on N distinct nodes; only the identity of those nodes is flexible. Applications that need the highest availability can set **W = 1**, which means a write is accepted as long as a single node in the system has durably written it — the request is rejected only if *every* node is unavailable.

What sloppy quorum does **not** fix: it trades the availability problem for a consistency problem. During a failure, the write set and a later read set can be different groups of nodes with no overlap at all — so R + W > N no longer guarantees a read sees the latest write. A write accepted with W = 1 exists on exactly one node until hinted handoff or anti-entropy catches up, and if that node dies permanently before the handoff, the write is gone. That is why, the paper notes, most services in production set a higher W than 1: the knob exists to be turned, and the default is a compromise between "never reject" and "never lose." Hinted handoff also works best when membership churn is low — in a system where nodes flap constantly, hints pile up faster than they are delivered.

## Mechanism 2: vector clocks and read-time reconciliation — detect, don't prevent

Once writes can land on different nodes concurrently, the second failure mode appears: two versions of the same cart, written on different sides of a partition, with no single order between them. A traditional store resolves this at write time with a lock or a majority — and rejects the loser. Dynamo cannot do that, because rejecting is the one thing it refuses to do.

So Dynamo detects instead of preventing. Every version of an object carries a **vector clock**: a list of (node, counter) pairs. When a node coordinates a write, it increments its own counter; the new clock causally subsumes the clock of the version it overwrites. On a read, the coordinator gathers versions from the N highest-ranked reachable nodes and waits for R responses. If one version's clock descends from another's, the older one is discarded. If neither descends from the other — two concurrent writes — both versions are returned to the client, and the application reconciles them. The shopping cart's reconciliation is a merge: take the union of the items. The next write carries a clock that subsumes both branches, collapsing them into one version, and the reconciled version is written back — read repair, done by the client.

The mechanism works because divergence is rare. In a 24-hour profile of the shopping cart service, **99.94% of requests saw exactly one version**; 0.00057% saw two, 0.00047% saw three, and 0.00009% saw four. And the paper is careful about *why* versions diverge: not failures, mostly, but concurrent writers — "busy robots," automated clients hammering the same key — and rarely humans. The conflict rate is a property of the workload, not of the failure rate.

What vector clocks do **not** fix: the clock itself can grow. If many servers coordinate writes to one key — exactly what happens during partitions — the (node, counter) list grows with every coordinator. Dynamo caps it by truncation: each pair carries a timestamp, and when the clock passes a threshold (ten pairs), the oldest pair is dropped. That can make descendant relationships underivable, so reconciliation gets less accurate — a known inefficiency the authors admit "has not surfaced in production and therefore this issue has not been thoroughly investigated." More fundamentally, vector clocks only *detect* conflicts; they cannot resolve them. The resolution is application code — a merge function the developer must write and get right — and for applications that cannot merge, the store's only fallback is last-write-wins, which silently discards data. Dynamo pushes the hardest part of the problem out of the database and into the service. That is the price of never rejecting a write.

## Mechanism 3: Merkle trees, gossip, and the background that must not hurt the foreground

The third failure mode is the slow one: replicas that drift apart permanently — a node that was down for hours, a hint that was never delivered, a disk that lost a write. Hinted handoff handles the temporary case; something has to handle the permanent one, without scanning whole datasets to find the differences.

Dynamo's answer is **anti-entropy with Merkle trees**. Each node maintains a separate Merkle tree for each key range it hosts — a hash tree whose leaves are hashes of individual keys and whose parents are hashes of their children. Two nodes exchange the root of the tree for a key range they share; if the roots match, the ranges are identical and no synchronization is needed. If they differ, the nodes exchange child hashes and descend until they reach the leaves, identifying exactly the keys that are out of sync. The mechanism breaks the "compare everything" loop by turning a full comparison into a walk down a tree: equal branches are pruned in one hash comparison, and only the differing leaves cost data transfer and disk reads.

Membership and failure detection run on **gossip**. There is no master, no central registry: each node contacts a randomly chosen peer every second and the two reconcile their persisted membership-change histories, giving the ring an eventually consistent view of itself. A node outage rarely means a permanent departure, so joining and leaving are explicit, administrator-initiated operations — the system does not rebalance just because a node flapped.

Two more pieces of background machinery keep the whole thing honest. First, **partitioning strategy**: Dynamo's deployed scheme uses fixed-size partitions (strategy 3 in the paper's evaluation), which gave the best load-balancing efficiency and shrank the membership information each node must maintain by three orders of magnitude versus random token positions — with the tradeoff that changing membership requires coordination to preserve the assignment. Second, **admission control for background tasks**: in early production, anti-entropy and handoff traffic starved foreground gets and puts. The fix was a feedback loop — background tasks reserve time slices, and a controller watches the 99th-percentile database read latency over a trailing 60 seconds against a threshold (say 50 ms) and throttles background work when the foreground is near its limit. The background is allowed to exist only when the foreground can afford it.

What this layer does **not** fix: the full-membership gossip model does not scale. Every node gossips the full routing table, which the paper says works well for a couple of hundred nodes but is "not trivial" to scale to tens of thousands — the routing-table overhead grows with system size. Dynamo's own answer is that each service runs its own instance, capped at hundreds of hosts; the design never claimed to be one global ring. And Merkle trees have their own tax: many key ranges change when a node joins or leaves, forcing tree recalculation — the fixed-partition scheme mitigates it but does not eliminate it.

The production receipt, as of the 2007 paper: applications received successful responses (without timing out) for **99.9995%** of requests, and **no data loss event had occurred to date**. Client-driven coordination — routing requests directly to the coordinator instead of through a load balancer — cut 99.9th-percentile latency from 68.9 ms (reads) and 68.5 ms (writes) to 30.4 ms for both, with averages around 1.5–1.9 ms. The numbers are modest by today's standards. The architecture is not.

## The second act: Dynamo becomes DynamoDB, and nearly everything changes

Dynamo worked, and that created the next problem. It was single-tenant: each team ran its own Dynamo installation, and teams had to become experts in operating it. AWS's own retrospective is blunt — Dynamo gave teams the reliability, performance, and scalability they needed, but "it did not simplify the operational complexity of running the system." Engineers preferred SimpleDB, Amazon's managed NoSQL service, despite its 10 GB domain limit and unpredictable latency, because they did not have to run it. Operational complexity was the adoption bottleneck.

The conclusion was to combine Dynamo's scalability and predictable low latency with SimpleDB's operational simplicity: declare a table and let the system handle the rest. **Amazon DynamoDB launched on January 18, 2012.** The 2022 USENIX paper that documents the next decade puts the relationship in one line: DynamoDB "shared most of the name of the previous Dynamo system but little of its architecture."

The rebuild changed the consistency model first. A multi-tenant public service cannot hand every customer a vector clock and a merge function. Instead, each partition of a table is a **replication group** across Availability Zones that uses **Multi-Paxos** for leader election and consensus. Only the leader serves writes and strongly consistent reads. On a write, the leader generates a write-ahead log record and sends it to its peers; the write is acknowledged once a quorum of peers has persisted the record to their local write-ahead logs. Any replica can serve eventually consistent reads. Leadership is held by lease, and a newly elected leader serves nothing until the previous leader's lease expires — the mechanism that keeps two leaders from ever both believing they are in charge. Some replicas are log-only — Paxos acceptors that persist recent write-ahead log entries without storing key-value data — which improves availability and durability without the cost of full replicas.

{% mermaid %}
graph TD;
    A["Client SDK"] -->|"request"]| B["Request router - auth and routing"];
    B -->|"partition map lookup"]| C["MemDS - metadata in memory"];
    B -->|"admission tokens"]| D["Global admission control - token buckets"];
    B -->|"write to leader"]| E["Partition leader - Multi-Paxos"];
    E -->|"WAL record - quorum persist"]| F["Replica 2 - second AZ"];
    E -->|"WAL record - quorum persist"]| G["Replica 3 - third AZ"];
    E -->|"eventual read - any replica"]| F;
    H["Autoadmin - health and scaling"] -->|"replace unhealthy replica"]| E;
    E -->|"split when hot or large"]| I["Child partitions - throughput divided"];
{% endmermaid %}

The request path is a second machine built around the same principle Dynamo used for background tasks: **the foreground must be protected from everything else**. Stateless request routers authorize, authenticate, and route each request, looking up the partition map from the metadata service. Admission control, which started as per-node token buckets, became **global admission control**: a central service tracks each table's token consumption, and every request router holds a local token bucket replenished every few seconds. That is what stops one tenant's burst from degrading its neighbors on shared hardware — the central problem of a multi-tenant service, and the reason Dynamo's per-instance design could not simply be rented out.

The same protect-the-foreground logic shows up in the metadata path. Routers originally cached whole-table routing information locally, with a 99.75% hit rate — but a cold start, for example when new router capacity was added, made every request miss the cache, and metadata traffic could spike to 75% of the request rate, destabilizing the system. The fix was **MemDS**, an in-memory distributed datastore holding all metadata, built on a Perkle tree — a hybrid of a Patricia tree and a Merkle tree — with a new cache design that refreshes asynchronously on every hit, so the metadata fleet always sees constant traffic regardless of hit ratio. A cache that can take the system down when it is cold is worse than no cache; the redesign makes the load on the metadata fleet independent of the cache's state.

And the partition itself is where the old scaling problems reappeared in new clothes. A table is divided into partitions, each a disjoint contiguous key range, and throughput was originally allocated per partition: one read capacity unit buys one strongly consistent read per second for items up to 4 KB, one write capacity unit buys one write per second for items up to 1 KB. Two failure modes followed. **Hot partitions**: traffic concentrates on a few keys, and the partition's fixed allocation throttles the application even though the table as a whole has capacity to spare. **Throughput dilution**: splitting a partition for size divides its throughput equally among the children, so each child has less performance than the parent — the paper's example is a partition capped at 1,000 WCUs, where a 3,200-WCU table gets four partitions at 800 each. The fixes came in layers: **bursting**, which lets a partition spend unused capacity banked for up to 300 seconds; **adaptive capacity**, which redistributes unused throughput; and global admission control, which moved the enforcement point from the partition to the table. The service-level agreement is now 99.99% availability for regular tables and 99.999% for global tables, and YCSB benchmarks run against production in us-east-1 from 100,000 to 1,000,000 operations per second on 900-byte items show latencies barely moving as throughput scales 10x — the flat line is the point.

What DynamoDB does **not** fix: the hot-key problem is mitigated, not solved — a single partition still has a ceiling (1,000 WCUs in the paper's example), and an application whose traffic concentrates on one key will still throttle no matter how much table-level capacity it buys. The API is deliberately narrow — no joins, no ad-hoc query planner, a 400 KB maximum item size — because every operation must have a cost that can be bounded before it runs; that is the price of predictable latency. And the operational complexity Dynamo pushed onto its users did not vanish: it moved inside AWS, into autoadmin (the service that watches fleet and partition health and replaces unhealthy replicas), game days and chaos tests, formal proofs of the consensus algorithms, and deployment practices that roll out to a small set of nodes first with automatic rollback on error-rate or latency alarms. The user sees a table; the operator runs tens of microservices.

## The arc in numbers

AWS publishes DynamoDB's Prime Day peak in its annual retrospective, and the series is the cleanest public record of a database growing into its own scale:

| Prime Day | Peak requests per second |
| --- | --- |
| 2017 | 12.9 million |
| 2019 | 45.4 million |
| 2020 | 80.1 million |
| 2021 | 89.2 million |
| 2022 | 105.2 million |
| 2023 | 126 million |
| 2024 | 146 million |
| 2025 | 151 million |
| 2026 | 192 million |

From 12.9 million to 192 million in nine years — roughly a 15x increase — with the latency promise unchanged at single-digit milliseconds throughout. The 2021 event is the one the USENIX paper documents in detail: 66 hours, trillions of API calls, 89.2 million requests per second at peak. Note what the arc does *not* show: a redesign. The growth was absorbed by the same partition-and-replicate machinery, splitting tables and adding servers, while the per-request contract stayed flat. That is the definition of the system working.

## What neither system can do

The honest boundary of the whole lineage is the list of things it never tried to be. Dynamo has no transactions across keys, no secondary indexes, no queries beyond primary-key access — anything more is application work. Its consistency contract is deliberately narrow: eventual consistency with application-side reconciliation, and read-your-writes only when the read happens to reach a node that has seen the write. DynamoDB added transactions (2018), secondary indexes (2013), streams (2014), global tables (2017), and point-in-time recovery (2018) — but each addition is scoped so the latency contract survives: transactions cover at most 100 items, items are capped at 400 KB, and there is still no join and no ad-hoc query. A workload that needs relational queries, or a single hot key with unbounded write rate, is simply the wrong workload for this family of systems — and both papers say so by construction rather than by apology.

## Lessons worth stealing

1. **Availability is a business decision before it is an engineering one.** Dynamo's design follows from a single sentence about the shopping cart. If rejecting a write costs more than merging two versions, you build a system that never rejects a write — and then you accept vector clocks, read repair, and application-side merges as the bill. State the business cost first; the architecture is downstream of it.
2. **Push complexity to reads, not writes.** Dynamo resolves conflicts on read so that writes never block; DynamoDB's leader writes to a quorum of WALs so that reads can be served by any replica. In both systems the write path is kept short and unconditional, and the expensive work — reconciliation, anti-entropy, re-replication — happens in the background or on read. Latency budgets are spent where they hurt least.
3. **A mechanism must name the loop it breaks.** Sloppy quorum breaks "unreachable replica means rejected write" by decoupling destination from ownership. Merkle trees break "compare everything" by pruning equal branches in one hash. Global admission control breaks "one tenant's burst starves the rest" by moving enforcement to the table. If you cannot state the loop, you do not have a mechanism — you have a migration.
4. **Background work needs its own admission control.** Both papers learned this the same way: anti-entropy and handoff traffic starved foreground requests in Dynamo, and metadata cache misses destabilized DynamoDB's routers. The fix in both cases is a feedback loop that throttles background work against a foreground latency threshold — and, in MemDS's case, a redesign that makes background load constant instead of spiky. Any system with background repair that lacks this will eventually be woken at 3 a.m. by its own janitor.
5. **Operational simplicity is the adoption bottleneck, not capability.** Dynamo was technically right and still under-adopted inside Amazon, because teams had to run it themselves. DynamoDB's real innovation was not Multi-Paxos or global admission control — it was moving the operations inside AWS so the user only declares a table. When a technically superior system is not adopted, check who gets paged before you check the benchmarks.

Dynamo's real lesson is not "use consistent hashing." It is that a datastore is a bundle of promises — never reject a write, bounded latency, survival of whole data centers — and each promise is kept by one mechanism with one named failure loop and one stated price. DynamoDB kept the promises and replaced the mechanisms: quorum-of-WALs instead of sloppy quorum, Paxos leaders instead of vector clocks, token buckets and MemDS instead of gossip and full membership tables. The name survived. Almost nothing else did — and that is why it still answers 192 million requests a second.

## Sources

- Giuseppe DeCandia, Deniz Hastorun, Madan Jampani, Gunavardhan Kakulapati, Avinash Lakshman, Alex Pilchin, Swaminathan Sivasubramanian, Peter Vosshall, and Werner Vogels, "Dynamo: Amazon's Highly Available Key-value Store," SOSP 2007, Stevenson, WA, October 14–17, 2007. https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf — the 2004 holiday deadlocks and the relational-database limits; tens of thousands of servers and tens of millions of customers at peak; the 150-services-per-page call chain; the 99.9th-percentile SLA example (300 ms at a peak of 500 requests per second); the shopping cart's tens of millions of requests and well over 3 million checkouts in a single day; objects usually under 1 MB; consistent hashing with virtual nodes; N = 3 typical configuration; R + W > N; W = 1 write availability; vector clocks with truncation at ten pairs and the D1–D5 version example; sloppy quorum and hinted handoff; Merkle-tree anti-entropy per key range; gossip every second; fixed-partition strategy and membership information three orders of magnitude smaller; background-task admission control against a 50 ms 99th-percentile threshold; the 24-hour cart profile (99.94% one version; 0.00057% two; 0.00047% three; 0.00009% four); divergent versions from concurrent writers, mostly automated clients; 99.9995% successful responses and no data loss to date; client-driven coordination cutting 99.9th-percentile latency from 68.9/68.5 ms to 30.4 ms; the full-membership model working for a couple of hundred nodes and not trivially scalable to tens of thousands.
- Werner Vogels, "Amazon's Dynamo," All Things Distributed, October 2, 2007. https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html — the SOSP paper announcement and the synthesis framing.
- AWS News Blog, "Happy 10th Birthday, DynamoDB!" February 18, 2022. https://aws.amazon.com/blogs/aws/happy-birthday-dynamodb/ — DynamoDB general availability on January 18, 2012; the 2004 holiday outages and the intern's question; the Dynamo paper in 2007; Dynamo's operational complexity as the adoption barrier; SimpleDB's 10 GB domain limit; Prime Day 2021 (June, 66 hours): trillions of requests, peak 89.2 million requests per second, single-digit-millisecond performance; feature timeline (secondary indexes December 2013; Streams November 2014; global tables November 2017; backup and restore November 2017; point-in-time recovery March 2018; adaptive capacity August 2018; ACID transactions November 2018; on-demand November 2018).
- Mostafa Elhemali et al., "Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service," USENIX ATC 2022, Carlsbad, CA, July 11–13, 2022. https://www.usenix.org/system/files/atc22-elhemali.pdf — DynamoDB "shared most of the name of the previous Dynamo system but little of its architecture"; hundreds of thousands of customers; Prime Day 2021 (66 hours, trillions of API calls, 89.2 million requests per second); availability SLA 99.99% (99.999% for global tables); average low-single-digit-millisecond latency for a 1 KB item, stable from megabytes to hundreds of terabytes; tables scaling from several servers to many thousands; partitions as disjoint contiguous key ranges; replication groups using Multi-Paxos; leader-only writes and strongly consistent reads; write-ahead-log quorum acknowledgment; log replicas as Paxos acceptors; RCU (one strongly consistent read per second, items up to 4 KB) and WCU (one write per second, items up to 1 KB); hot partitions and throughput dilution; the 1,000-WCU partition example; bursting with unused capacity retained up to 300 seconds; adaptive capacity; global admission control with token buckets replenished every few seconds; router metadata cache at 99.75% hit rate with cold-start metadata traffic spiking to 75% of the request rate; MemDS and its Perkle tree (Patricia plus Merkle); autoadmin as the central nervous system; game days, formal proofs, small-set deployments with automatic rollback; YCSB benchmarks (100,000 to 1,000,000 operations per second, 900-byte items, flat latencies).
- AWS News Blog, "Prime Day 2023 Powered by AWS – All the Numbers," August 2, 2023. https://aws.amazon.com/blogs/aws/prime-day-2023-powered-by-aws-all-the-numbers/ — DynamoDB peaking at 126 million requests per second, trillions of calls, single-digit-millisecond responses.
- AWS News Blog, "All the numbers: Amazon Prime Day 2026 powered by AWS," October 6, 2026. https://aws.amazon.com/blogs/aws/all-the-numbers-amazon-prime-day-2026-powered-by-aws/ — Prime Day 2026 (June 23–26): DynamoDB processed over 59 trillion requests, peaking at 192 million requests per second with single-digit-millisecond responses; earlier peaks in the series (12.9 million in 2017; 45.4 million in 2019; 80.1 million in 2020; 105.2 million in 2022; 146 million in 2024; 151 million in 2025).
- AWS Documentation, "Cheat sheet for DynamoDB" / "Service quotas." https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CheatSheet.html — maximum item size 400 KB including attribute names and values; no practical limit on table size.
