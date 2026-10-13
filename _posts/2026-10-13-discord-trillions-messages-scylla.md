---
layout: single
title: "Trillions of Messages, 72 Nodes: How Discord Outgrew Cassandra and Rebuilt on ScyllaDB"
description: "Discord's message store grew from 12 Cassandra nodes holding billions of messages to 177 nodes holding trillions — and got slower, not faster. The fix was not just a database swap: Rust data services with request coalescing upstream, then a home-grown migrator that moved trillions of messages in 9 days instead of 3 months."
date: 2026-10-13 07:58:00 -0700
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - Discord
  - ScyllaDB
  - Cassandra
  - databases
excerpt: "177 Cassandra nodes, trillions of messages, and a p99 that swung from 40 to 125 ms. Discord cut the cluster to 72 ScyllaDB nodes and pinned historical-fetch p99 at 15 ms — but the database swap was only half the fix."
---

> [中文版 Chinese version](/backend%20infra/discord-trillions-messages-scylla-zh/)

Here is the number that should make any infrastructure engineer pause: between 2017 and early 2022, Discord's message database grew from 12 nodes to 177 nodes — and over the same period it became *less* predictable, not more. The cluster held trillions of messages, paged the on-call team regularly, and forced operators into rituals like taking nodes out of rotation just so background maintenance could catch up. Scale had compounded the toil instead of amortising it.

This is the first entry in the 🚀 Extreme Scale series, and Discord's message store is the right place to start, because its lesson is uncomfortable: at extreme scale, the database is rarely the whole problem. The access pattern is.

## Background: a data model built for one access pattern

Discord's message schema is deliberately simple, and every design decision in it serves the dominant query: "give me the recent messages in this channel, newest first."

- **Partition key: channel + bucket.** Messages are partitioned by the channel they were sent in, plus a static time-window bucket. All messages for one channel-and-bucket live together on disk.
- **Snowflake IDs.** Every ID is a Snowflake — chronologically sortable — so ordering by ID is ordering by time, and a range scan inside a partition returns messages in order with no sort step.
- **Replication factor 3, quorum consistency.** Each partition is replicated to three nodes, and reads and writes run at quorum, so a single node can fail without losing availability or correctness.

This is a textbook wide-column design, and for years it worked. The problem is what the partition key does to load distribution. A small server where a few friends chat sends orders of magnitude fewer messages than a community with hundreds of thousands of members. Load follows community size, not node count — and a handful of channels are astronomically larger than the rest.

## The failure mode: hot partitions

In Cassandra, writes are cheap: append to a commit log, buffer in a memtable, flush later. Reads are the expensive direction — a read may have to consult the memtable and several on-disk SSTables. So the expensive operation is exactly the one that concentrates.

When a huge server has a big moment — an announcement that pings everyone, a match goal, a product launch — tens of thousands of users open the same channel at the same time. All of those reads land on the small set of nodes that own that channel's partition. That is a **hot partition**, and its blast radius is worse than it looks:

1. The owning nodes fall behind; latency on that partition climbs.
2. Because reads and writes run at quorum, queries touching those nodes inherit the latency — the hot partition's problem becomes every co-located partition's problem.
3. Meanwhile, cluster maintenance competes for the same resources. Compactions fall behind, which makes reads touch more SSTables, which makes reads slower, which makes compaction fall further behind.

Layered on top were JVM garbage-collection pauses that could spike latency or, in the worst cases, stall a node until an operator intervened. Discord's team described a manual routine — informally, a "gossip dance" — where a node was drained of traffic so it could compact in peace, then rejoined to catch up on missed writes via hinted handoff, repeated until the backlog cleared. When your database needs a choreographed dance to survive routine maintenance, the architecture is telling you something.

## Fix #1: shield the database before replacing it

Discord's first move was not a migration. It was an admission that unbounded concurrency against a hot partition is an *upstream* problem, and they built a layer to bound it: **data services**, written in Rust, sitting between the API monolith and the database.

The design is deliberately boring — roughly one gRPC endpoint per database query, and no business logic at all. The value is in two mechanisms:

**Request coalescing.** If a thousand users request the same row at the same moment, the database should see one query, not a thousand. In the data service, the first request for a row spawns a worker task that performs the query; every concurrent request for the same row subscribes to that task and shares its result. Duplicate reads collapse before they ever reach storage.

**Consistent-hash routing.** Coalescing only works if duplicate requests land on the same service instance. So requests are routed by a consistent hash of the channel ID: all traffic for one channel goes to one data-service instance, which is exactly where its duplicates can be merged.

Together these turn an @everyone thundering herd from "N identical quorum reads hammering three nodes" into "one read, N subscribers." Hot partitions still existed on Cassandra afterwards — but they bit less often, and that bought the team the one thing a migration needs most: time.

## Fix #2: ScyllaDB, and why it fit

ScyllaDB is a Cassandra-compatible database written in C++. For Discord's pain list, three properties mattered:

- **No garbage collector.** C++ instead of Java removes the GC-pause failure class entirely — historically one of the largest sources of latency spikes and on-call pain.
- **Shard-per-core.** Each CPU core owns a shard of the data and serves it independently, so one hot shard's load is isolated instead of contending with everything else on the node.
- **Cassandra compatibility.** Same data model, same query language family, existing drivers — the migration changes the engine, not the application contract.

There was one blocker: reverse queries — scanning a partition in the opposite of its stored order, which Discord does when reading messages in ascending order — were too slow in ScyllaDB. Discord worked with the ScyllaDB team, who implemented performant reverse queries. With that landed, the last technical objection was gone. Notably, by 2020 Discord had already moved every *other* database it ran to ScyllaDB; the messages cluster was last purely because of its size.

The new cluster also used a storage topology Discord calls **super-disk**: local SSDs for speed, mirrored via RAID onto persistent disks — local-disk latency with persistent-disk durability.

{% mermaid %}
graph TD
    A[Discord clients] --> B[API monolith]
    B --> C{Consistent-hash router<br/>key: channel_id}
    C --> D1[Rust data service<br/>instance A]
    C --> D2[Rust data service<br/>instance B]
    D1 -->|request coalescing:<br/>one worker task per hot row,<br/>N subscribers share one query| E[ScyllaDB cluster<br/>72 nodes · shard-per-core · RF 3 · quorum]
    D2 -->|request coalescing| E
    E --> F[Super-disk per node:<br/>local SSD mirrored via RAID<br/>to persistent disk · 9 TB/node]
    G[Cassandra cluster<br/>177 nodes · legacy] -.->|Rust migrator: token ranges,<br/>SQLite checkpoints, up to<br/>3.2M messages/sec| E
    E -.->|dual-read sampling<br/>during validation| G
{% endmermaid %}

## The migration: an afternoon of work beat a 3-month estimate

The requirements were simple to state: move trillions of messages, with zero downtime, quickly — because the Cassandra cluster was being firefought in the meantime.

The first plan followed the standard playbook: dual-write new data to both systems, backfill history with ScyllaDB's Spark-based migrator. Once tuned, the Spark migrator's estimate came back at roughly **three months**. The team then remembered they already owned a fast database library — the one inside the Rust data services — and extended it into a migrator in about an afternoon. Its estimate: **nine days**. It read token ranges from Cassandra, checkpointed progress locally in SQLite, and streamed data into ScyllaDB at up to **3.2 million messages per second**.

The migration then did what migrations do: it stuck at 99.9999%. The final token ranges were timing out because they were dense with tombstones — deletion markers that Cassandra had never compacted away. One manual compaction of those ranges later, the copy completed in seconds. Validation was by dual-read sampling: a small percentage of production reads went to both databases and the results were compared. In May 2022, with the team gathered at an onsite, Discord flipped ScyllaDB to primary.

## Results

| Metric | Cassandra | ScyllaDB |
|---|---|---|
| Nodes | 177 | 72 |
| Avg. disk per node | ~4 TB | 9 TB |
| Historical-message fetch p99 | 40–125 ms | 15 ms |
| Message insert p99 | 5–70 ms (variable) | 5 ms (steady) |

The node count fell by roughly 60% while per-node density more than doubled. But the more telling result is the *shape* of the latency numbers: the win is not just that p99 dropped, it is that the ranges collapsed. A p99 that wanders between 40 and 125 ms is an operations problem; a p99 pinned at 15 ms is a product enabler — Discord notes the new headroom unlocked product use cases that needed confidence in the message store.

The proof under load came at the end of 2022: during the World Cup final, Discord's message-send graph showed nine distinct spikes tracking events in the match — goals, half-time, extra time — and the cluster absorbed all of them without incident.

## Lessons worth stealing

1. **Hot partitions are an access-pattern problem, not a capacity problem.** Adding replicas does not help when every duplicate read targets the same partition. Collapse the duplicates first — coalescing turned an unbounded fan-in into a bounded one.
2. **Route for your cache/coalescing key, not for balance.** Consistent hashing by channel ID deliberately creates *uneven* load across service instances, because evenness was never the goal — co-location of duplicates was.
3. **Sequence the fixes: shield, then swap.** The data services shipped before the migration and stayed after it. They reduced Cassandra's pain enough to migrate calmly, and they still protect ScyllaDB today, because hot partitions exist in any partitioned store.
4. **A purpose-built migrator on a library you already trust can beat the generic tool by 10x.** Three months became nine days because the team reused code whose performance characteristics they already knew. But budget for the long tail: the last 0.0001% was tombstones, not throughput.
5. **Judge a migration by variance, not averages.** The headline is not "15 ms vs 40–125 ms"; it is that the tail stopped wandering. Predictability is what on-call teams and product teams actually consume.

## Sources

- Bo Ingram, "How Discord Stores Trillions of Messages," Discord Engineering Blog, March 6, 2023. https://discord.com/blog/how-discord-stores-trillions-of-messages — all figures, timelines, and mechanism descriptions in this article are from this post.
- Predecessor post referenced therein: "How Discord Stores Billions of Messages" (2017), covering the original 12-node Cassandra deployment.
