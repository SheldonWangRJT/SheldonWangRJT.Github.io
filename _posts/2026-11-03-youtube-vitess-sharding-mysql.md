---
layout: single
title: "YouTube Grew 50x Without Replacing MySQL: How Vitess Shards a Database That Was Never Meant to Scale"
description: "Vitess was built at YouTube in 2010 after replicas and application-level sharding ran out of road. It kept MySQL and added three things around it: a router that plans every query against a shard map, a per-instance bodyguard that caps concurrency and kills runaway queries, and online resharding that moves data without downtime. The user base has since grown more than 50x on the same relational core."
date: 2026-11-03 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - YouTube
  - Vitess
  - MySQL
  - Sharding
excerpt: "YouTube did not outgrow MySQL and switch to something else. It wrapped MySQL in a router, a bodyguard, and an online resharding machine — and then grew its user base more than 50x on the same relational core."
---

> [中文版 Chinese version](/backend%20infra/youtube-vitess-sharding-mysql-zh/)

This is the fourth entry in the 🚀 Extreme Scale series.

Start with the number that should not work. Vitess was created at YouTube in 2010 because MySQL could no longer keep up — and according to the project's own history, YouTube has since scaled its user base by a factor of **more than 50** without abandoning MySQL. The database that supposedly does not scale is still underneath one of the largest video platforms on earth. It just no longer sits there unprotected.

The instinctive reading is that YouTube must have made MySQL itself dramatically faster, or quietly replaced it. It did neither. What it built was a layer that changes *which* problems MySQL is asked to solve: a router that decides, for every query, exactly which shard should answer it; a per-instance guard that refuses to let bad queries or unbounded concurrency reach the storage engine; and a resharding machine that moves data between shards while traffic keeps flowing. Every piece earns its place by breaking one specific failure mode of the system it replaced. And the failure modes it does *not* fix are just as instructive — Slack has demonstrated two of them in public, at full scale.

## Background: the ladder YouTube climbed, and where it ended

The Vitess history page tells the story as a sequence of temporary fixes, each of which bought time and then stopped working. That sequence matters, because it is the same ladder almost every MySQL shop climbs, and Vitess only makes sense as the step after the last rung.

**Rung one: replicas.** When peak traffic threatened to exceed what one database could serve, YouTube split reads from writes — a master for write traffic, a replica for read traffic. This works until read traffic alone overloads the replica.

**Rung two: more replicas.** Add replicas until read load is comfortable. This works until *write* traffic alone exceeds what the single master can handle. No number of replicas fixes a write bottleneck, because every write still lands on the same master. And it works only until the dataset itself outgrows a single instance.

**Rung three: application-level sharding.** YouTube modified its application code so that, before executing any database operation, the code identified the right shard for that query. This genuinely scales: writes and data spread across many masters. But it moved the hardest part of the database into every application. Every new feature, every query, every engineer had to know the sharding scheme. And the operation every growing system eventually needs — splitting a shard that got too hot or too big — became a coordinated, application-wide event with downtime attached. The shard map lived in code, so changing the shard map meant changing code, deploying it, and holding your breath.

Vitess is the recognition that sharding is infrastructure, not application logic. Its core move is to pull the shard map, the routing, the connection management, and the resharding machinery out of the application and into a proxy layer — so the application talks to what looks like one MySQL database, and the proxy worries about how many MySQL instances that actually is.

{% mermaid %}
graph TD;
    A["Application - plain MySQL protocol"] -->|"query with no shard logic"| B["VTGate - stateless router and planner"];
    B -->|"reads shard map and tablet types"| C["Topology server - keyspace and shard metadata"];
    B -->|"targeted query to one shard"| D["VTTablet - primary of shard 1"];
    B -->|"scatter query to all shards"| E["VTTablet - primary of shard 2"];
    D -->|"guarded pools and timeouts"| F["MySQL shard 1"];
    E -->|"guarded pools and timeouts"| G["MySQL shard 2"];
    D -->|"asynchronous replication"| H["Replica tablets - read traffic"];
    E -->|"asynchronous replication"| I["Replica tablets - read traffic"];
{% endmermaid %}

Two design choices in that diagram do most of the work, and both are worth stating exactly.

First, **VTGate is stateless**. It holds no data and no sessions that matter; it reads the shard map from the topology server, plans the query, and forwards it. Statelessness is what lets the routing layer itself scale horizontally: if VTGate becomes the bottleneck, you add more VTGates. A proxy that cannot scale is just a new single point of failure wearing a trench coat.

Second, **VTTablet sits in front of every single MySQL instance**, one per instance, usually on the same machine. It is not a sidecar in the decorative sense. It is the only thing allowed to talk to MySQL, which means it is the only place where policy can be enforced: how many concurrent transactions, how long a query may run, which tablet type serves which traffic. Every protection in the next section lives here, and it works precisely because nothing can bypass it.

## Mechanism 1: routing by keyspace ID — the shard map as a first-class object

Vitess does not hash a row straight to a server. It maps the sharding key through a **vindex** to a **keyspace ID**, and each shard owns a contiguous range of that ID space. A keyspace is the logical database — the thing the application thinks it is talking to — and shards are the physical partitions of it. The mapping from keyspace ID ranges to shards, and from tables to vindexes, lives in the **vschema**, which VTGate reads from the topology server.

This indirection is the whole trick, and it pays off in three specific ways.

**Targeted queries cost one shard.** When a query carries the sharding key, VTGate computes the keyspace ID, finds the one shard whose range contains it, and sends the query there — and only there. The price of a well-formed query does not grow with the number of shards. This is the property that makes sharding scale rather than merely partition: adding shards adds capacity without taxing the queries that already work.

**Scatter queries cost every shard.** When a query does *not* carry the sharding key, VTGate cannot know where the rows live, so it sends the query to all shards and merges the results. That is correct, and it is expensive in a way that scales *against* you: every scatter query consumes capacity on every shard simultaneously, so the system's total scatter capacity is roughly the capacity of a single shard, no matter how many shards you add. Ordered scatter queries over-fetch on top of that: asking each shard for its top 50 rows to return a global top 50 means fetching up to 50 rows per shard and discarding most of them in the merge. The router does not hide this cost — it cannot, it is inherent — but it makes the cost visible and attributable: you can see which queries scatter, and how often.

**A second access path costs a second write.** Sometimes you need to find a row by something other than the sharding key — a message by its ID, an order by its number. Vitess's answer is a **lookup vindex**: a table that maps the other key to the keyspace ID, so the router can resolve the shard in two hops instead of scattering. The price is paid on every insert and delete, which must also write the lookup entry. That is a clean, honest trade — read fan-out converted into write amplification — and it is the kind of trade a team should choose deliberately, per table, rather than discover in production.

The causal chain here is about *where decisions live*. In application-level sharding, the routing decision lived in thousands of call sites, so changing it required changing all of them. In Vitess, the routing decision lives in one place — the vschema plus VTGate's planner — so changing the shard map means changing metadata, and the applications never notice. That is what makes the next mechanism possible at all: you cannot reshard online if every application has the old shard map compiled in.

What routing does **not** fix: it cannot make a bad sharding key good. If one key attracts a wildly disproportionate share of traffic, its shard is hot no matter how many other shards exist, and the router will faithfully deliver all of that load to exactly one place. Routing distributes load across keys; it does not redistribute load within a key. That distinction returns, with consequences, in the Slack stories below.

## Mechanism 2: VTTablet as a bodyguard — failing fast instead of collapsing slowly

The second failure mode Vitess was built to break is older and more humiliating than sharding: a single bad query taking down the database. Before Vitess, every time YouTube went down because somebody wrote a bad query, the team added protection code to VTTablet. The result is a set of guards that look like mere configuration until you see the collapse they interrupt.

The collapse works like this. MySQL's cost for a connection is not just a socket — each connection carries thread stacks, buffers, and session state, and under contention, concurrent transactions contend on locks and on InnoDB's version history. As concurrency rises past the engine's comfortable operating point, each query gets *slower*, which means queries pile up longer, which means more concurrency, which means slower still. It is a positive feedback loop with a cliff at the end: throughput does not degrade gracefully, it falls off. An unbounded queue in front of such an engine does not protect it; it guarantees that the engine will be fed work faster than it can finish it, forever.

VTTablet breaks the loop at three points, and the defaults in the Vitess docs show the shape of the policy:

**A cap on concurrent transactions.** The transaction pool defaults to a cap of 20 per tablet. The 21st transaction does not queue indefinitely — it waits briefly (the pool timeout defaults to 1 second, with a waiter cap of 5,000) and then *fails with an error*. That failure is the feature. It converts an unbounded pileup inside the storage engine into a bounded error at the edge, where the client can retry with backoff or shed load. A thread pool that queues forever merely moves the pileup from the engine to the queue; a pool that fails fast stops the feedback loop from forming.

**A kill switch on runaway queries.** The query timeout — the docs suggest roughly 15–30 seconds for OLTP queries — kills any query that exceeds it, and the transaction timeout (default 30 seconds) kills transactions abandoned by crashed clients. A query that would have run for minutes, holding locks and growing version chains the whole time, is instead removed after seconds, and its locks die with it.

**Separate pools for separate workloads.** Regular queries, streaming (OLAP-style) queries, and transactions draw from different pools (defaults: 16, 200, and the transaction cap respectively), so a bulk analytical scan cannot starve short transactional queries of connections. Pool exhaustion in one lane does not close the others.

PlanetScale's own write-up of a production incident shows the mechanism working as designed: a batch job held a transaction open for fifteen minutes without committing, and reads that normally took milliseconds began blowing through their execution ceilings as InnoDB walked ever-longer version histories to build snapshots. Once the transaction timeout killed the long-running transaction, its locks were released and a sixteen-minute backlog drained in about thirty seconds. The timeout did not make the database faster. It removed the one transaction that was making everything else slow — and, crucially, it did so automatically, without a human noticing and intervening.

What the bodyguard does **not** fix: it sheds load by failing queries, and failures propagate to clients. If clients retry immediately and aggressively, they rebuild the pileup at the gate instead of inside the engine — the same feedback loop, one hop outward. Fail-fast only works as a system if the callers treat errors as backpressure: bounded retries, exponential backoff, circuit breakers. Vitess gives the database a way to say no; it cannot force the application to listen.

## Mechanism 3: online resharding — making the scary operation boring

This is the mechanism that justifies the whole project, because it attacks the operation that application-level sharding made terrifying. In the old world, splitting a shard meant coordinated downtime: stop traffic, copy data, repoint applications, restart. In the Vitess world, resharding is a workflow — Reshard, and its sibling MoveTables for moving tables between keyspaces — built on **vreplication**, and it runs while traffic flows.

{% mermaid %}
graph TD;
    A["Source shard - still serving live traffic"] -->|"copy phase - rows copied in batches"| B["Target shards - new keyspace ID ranges"];
    A -->|"binlog tail - vreplication replays new writes"| B;
    B -->|"VDiff - source and target compared row by row"| C["Traffic switch - reads first then writes"];
    C -->|"reverse replication kept live"| D["Rollback path - switch traffic back"];
    C -->|"cleanup"| E["Source tables dropped"];
{% endmermaid %}

Walk through it, because each step exists to close a specific hole:

1. **Copy phase.** Target shards are created with the new keyspace ID ranges, and vreplication copies existing rows from the source in batches. Traffic still goes to the source. The copy can be throttled so it does not overwhelm the production source — the docs explicitly warn that workflows can hit production source tablets hard, and provide flags to cap the copy phase's impact.
2. **Replication tail.** After the bulk copy, vreplication keeps tailing the source's binlog and applying new writes to the target, so the target converges toward the source and then tracks it in near real time. The target is never a stale snapshot; it is a replica that happens to own a narrower key range.
3. **VDiff.** Before switching traffic, Vitess compares source and target row by row. This is the step that turns "we think the copy worked" into "we verified the copy worked," and it is cheap to insist on precisely because the switch has not happened yet.
4. **Traffic switch, reads first, then writes.** Reads move to the target first — a read on the wrong side costs a stale answer, not lost data — and only after reads prove healthy do writes switch. The ordering is deliberate: it stages the blast radius.
5. **Reverse replication as a rollback path.** After the switch, replication can run in reverse, keeping the old source updated from the new target. If something goes wrong, traffic switches back without a restore. The migration is revertible until the operator explicitly completes it and drops the source tables.

The causal chain: resharding used to be rare and feared because it required downtime and had no safe rollback, so teams postponed it until a shard was already on fire — at which point the operation was both urgent and dangerous. Online, verified, revertible resharding breaks that loop by making the operation cheap enough to do *before* the fire. A shard that can be split on a Tuesday afternoon will be split on a Tuesday afternoon; a shard that requires a maintenance window will be split during an incident.

What resharding does **not** fix: the copy phase still reads from a production source, so a huge shard costs real I/O and time no matter how smooth the workflow is; throttling exists to manage that, not eliminate it. And resharding splits *ranges of keys* — it cannot split a single hot key. If one celebrity account, one giant workspace, or one runaway job owns a disproportionate share of a shard's load, splitting the range around it leaves the hot key exactly where it was, now with fewer neighbours to dilute it. Range splits fix skew across keys. They do not fix skew within a key, and no amount of workflow polish changes that.

## Mechanism 4, briefly: topology and failover as metadata operations

The last piece is the least glamorous and the most operationally decisive: the **topology server** (etcd, ZooKeeper, or Consul) holds the shard map, the tablet types, and the replication graph, and **vtctld** orchestrates changes to it. When a primary dies, Vitess promotes a replica through a planned reparenting operation driven from that metadata — the same metadata VTGate reads to route queries. Failover is therefore a metadata update followed by routing updates, not a scramble through application configuration. Slack's case study, written when about 45% of its query load ran on Vitess, put the routing overhead at about one extra millisecond on average — the price of the indirection, measured, and negligible against the alternative of baking the topology into every application.

## Proof at other companies' scale

YouTube is the origin story, but Vitess's claim to generality rests on adopters with different shapes of load. Slack is the most instructive: by fall 2016 it was already running thousands of sharded MySQL hosts answering hundreds of thousands of queries per second, and its problem was not total capacity but *distribution* — its busiest hosts ran hotter and hotter serving its largest customers while thousands of other hosts sat mostly idle. Workspace-based sharding had concentrated load instead of spreading it. Slack's team took about seven months from whiteboard to production on Vitess, and at the time of the CNCF case study roughly 45% of its query load — about 20 billion queries a day, peaking near 500,000 per second — ran through it, with all new features written Vitess-only. The fix for its skew problem was exactly the mechanism above: re-shard by a key that spreads load (messages by channel, not by workspace), using online workflows rather than a rewrite of every application.

JD.com, one of China's largest retailers, pushed about **35 million queries per second** through Vitess at peak during Singles Day, according to PlanetScale. And the project itself graduated from the CNCF in November 2019 — the eighth project to do so, after Kubernetes, Prometheus, and Envoy — having entered incubation in February 2018. Open-sourced in 2012 (the internal name was Voltron; the public name is French for "speed"), Vitess spent its first five years with YouTube as essentially its only user, and then became the default answer for teams that wanted to keep MySQL and still scale it.

## What Vitess cannot fix: two Slack incidents as the boundary

The honest way to state Vitess's limits is to show where it was present, working as designed, and still not enough.

**February 2022: the scatter query meets a cold cache.** Slack's postmortem of its February 22, 2022 outage describes a cascade that started in the caching tier: a percentage-based rollout of the Consul agent fleet — the February 22 step covered 25% of the fleet, after two uneventful 25% steps the prior week — kept removing cache nodes from the service catalog, and the cache control plane kept promoting empty spares and flushing rejoined nodes. Hit rates dropped. Among the reads that suddenly reached the database was a client-boot query: the list of users in a group direct message, read from a keyspace sharded by user. Finding the members of one GDM from a user-sharded table requires querying every shard, and Vitess did exactly what it is designed to do with such a query — it scattered it to every shard. Normally that inefficiency is invisible, because GDM membership is immutable, carries a long cache TTL, and is almost always served from cache. But with a significant portion of the cache unavailable, nearly every booting user needed a successful query on every shard, read load rose superlinearly with the cache-miss rate, and timed-out queries could not refill the cache — the two tiers locked into the unhealthy state, where low hit rates cause overload and overload prevents refilling. Client retries added load on top. The loop ran for most of a working day — about nine hours before full functionality was restored. Vitess did not malfunction: the router cannot know which shard holds a row the query does not identify, and a scatter query's cost is multiplied by the shard count by construction. The fixes, tellingly, were not in Vitess either: throttle client boots to cut load, change the query to read from Vitess only the data actually missing from cache, and — since the data tolerates staleness — serve it from replicas as well as primaries. The lesson is architectural, not configurational: a scatter query at the top of your traffic distribution is a loaded gun, and sharding more finely makes it worse, because it multiplies the fan-out. Audit your scatter rate the way you audit your error rate.

**October 2022: the hot shard meets a bulk job.** Slack's follow-up post, "The Query Strikes Again," describes a bulk purge job — users being removed from a workspace — that spiked writes against a cluster where a single shard held about 6% of the subscription data. Write load drove the tablets out of memory until the kernel OOM-killed MySQL, replicas could not catch up with the primary, and replacements crashed in a loop. Splitting ranges would not have helped in the moment, because the load was concentrated, not spread; the shard's problem was its contents, not its boundaries. Vitess gives you the tools to split a shard, and it gives you nothing that splits a key. When one key is the workload, the fix is in the data model — bucket the key, duplicate the data, or pick a different sharding key — and it has to be made before the bulk job arrives, not during it.

Both incidents share a shape worth naming: **Vitess multiplies whatever pattern you feed it.** Feed it well-targeted queries and it multiplies your capacity. Feed it scatter queries and it multiplies your load by the shard count. Feed it a hot key and it delivers all of that heat to one place, efficiently and without complaint. A proxy can enforce policy at the boundary; it cannot repair a data model that concentrates load, and it cannot invent a shard for a row it cannot locate.

## Lessons worth stealing

1. **Sharding is infrastructure, not application logic.** The moment the shard map lives in application code, every reshard is a deployment and every new feature pays a sharding tax. Pull routing into a layer that reads metadata, and the shard map becomes changeable without touching applications. That single move is what makes everything else — online resharding, failover, pool policy — operable.
2. **Protect the database by failing fast at the edge.** Unbounded concurrency in front of a storage engine does not degrade gracefully; it collapses, because slower queries pile up into more concurrency. Caps on concurrent transactions, kill switches on runaway queries, and separate pools per workload convert collapse into bounded errors — provided clients treat those errors as backpressure instead of retrying them into a new pileup.
3. **Make the scary operation boring, or it will happen during an incident.** Resharding that requires downtime and has no rollback will be postponed until a shard is on fire. Copy plus binlog tail plus verification plus staged traffic switch plus reverse replication turns it into a routine operation, which is the only kind of operation that actually gets performed on time.
4. **Measure your scatter rate and your hottest key, not just your total QPS.** Total capacity is the wrong number for a sharded system. What matters is the fan-out of your worst query and the concentration of your hottest key, because those are the two quantities the router multiplies. A system with 100 shards and one scatter-heavy boot query has the effective read capacity of one shard for that query.
5. **Keep the database you know, and pay for the layer that lets you keep it.** YouTube, Slack, and JD.com all stayed on MySQL. The alternative — migrating to a database with native distribution — trades a solved operational problem for an unsolved one: new query semantics, new failure modes, new expertise. Vitess's bet is that the relational model was never the bottleneck; the missing piece was the machinery around it. Sixteen years of production traffic suggest the bet was sound — with the boundary conditions above attached, in writing, to every adoption.

Vitess's real lesson is not "MySQL scales." It is that scale is usually a property of the layer around the database, not the database itself — and that the layer earns its keep by making three specific operations safe: routing a query to one shard, refusing a query that would hurt the engine, and moving data without stopping the world. Everything else is commentary.

## Sources

- Vitess documentation, "History." https://vitess.io/docs/archive/13.0/overview/history/ — created at YouTube in 2010; the replica, then sharding, then application-sharding sequence; user base grown by more than 50x; CNCF incubation February 2018 and graduation November 2019.
- Sugu Sougoumarane and Mike Solomon, "Vitess: Scaling MySQL at YouTube Using Go," USENIX LISA, December 2012. https://www.usenix.org/conference/lisa12/vitess-scaling-mysql-youtube-using-go — the original paper; Vitess at the core of YouTube's MySQL serving infrastructure, written in Go.
- The Changelog, "The story of Vitess" (interview with Deepthi Sigireddi, Vitess maintainer and tech lead), episode 485. https://changelog.com/podcast/485 — open-sourced in 2012, internal name Voltron, YouTube the only user for about five years, adoption by other companies from around 2015.
- Vitess documentation, "MoveTables" and "Reshard." https://vitess.io/docs/archive/18.0/reference/vreplication/movetables/ and https://vitess.io/docs/archive/13.0/reference/vreplication/v1/reshard/ — copy phase, VDiff verification, SwitchReads/SwitchWrites traffic switching, reverse replication, and copy-phase throttling flags.
- Vitess documentation, "VTTablet and MySQL" and "VTTablet Connection Pools and Sizing." https://vitess.io/docs/archive/11.0/user-guides/configuration-basic/vttablet-mysql/ and https://vitess.io/docs/archive/11.0/reference/features/connection-pools/ — transaction cap default 20, transaction timeout default 30 seconds, query timeout guidance of roughly 15–30 seconds, pool sizes, and the max_connections sizing rule.
- CNCF, "How Slack leverages Vitess to keep up with its ever-growing storage needs," November 25, 2019. https://www.cncf.io/blog/2019/11/25/how-slack-leverages-vitess-to-keep-up-with-its-ever-growing-storage-needs/ — fall 2016 scale (hundreds of thousands of queries per second, thousands of sharded hosts), hot-host skew, seven months whiteboard to production, 45% of load at about 20 billion queries per day and 500,000 peak queries per second, about one millisecond of added latency.
- PlanetScale, "Horizontal sharding for MySQL made easy." https://planetscale.com/blog/horizontal-sharding-for-mysql-made-easy — JD.com at about 35 million queries per second at peak during Singles Day; Slack's full migration and the 2020 work-from-home surge.
- PlanetScale, "Concurrency vs. Throughput: why more parallelism can make databases slower." https://planetscale.com/blog/concurrency-vs-throughput-vitess-mysql — the fifteen-minute transaction, sixteen-minute backlog drained in about thirty seconds after the transaction timeout fired, and the fail-fast transaction pool versus unbounded queueing.
- Laura Nolan et al., "Slack's Incident on 2-22-22: Double Trouble with Datastores," Engineering at Slack, April 5, 2022. https://slack.engineering/slacks-incident-on-2-22-22/ — Consul rollout tipping point, the GDM scatter query on the user-sharded keyspace, superlinear read load versus cache misses, the cache-database feedback loop, and the fixes (boot throttle, read only cache-missing data from Vitess, serve from replicas).
- Slack Datastores EMEA team, "The Query Strikes Again," Engineering at Slack. https://slack.engineering/the-query-strikes-again/ — October 12–13, 2022 bulk-purge write spike, one shard holding about 6% of subscription data, tablet OOM kills and the primary-replacement loop.
