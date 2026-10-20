---
layout: single
title: "2,277,845 Sockets, 41.9% Idle: How WhatsApp Put Two Million Connections on One Box"
description: "In January 2012 WhatsApp showed 2,277,845 open sockets on a single FreeBSD server with CPU still 41.9% idle. Getting from 200,000 connections to over two million was not a hardware upgrade — Rick Reed's own summary was 'contention, contention, contention'. Every fix was about breaking a shared point that millions of lightweight Erlang processes were queueing on."
date: 2026-10-20 08:00:00 -0700
categories:
  - Backend Infra
tags:
  - Extreme Scale
  - WhatsApp
  - Erlang
  - BEAM
  - FreeBSD
  - concurrency
excerpt: "2,277,845 open sockets on one server, with 41.9% of the CPU still idle. WhatsApp went from 200k to over 2M connections per box not by adding hardware, but by hunting down one shared lock, queue and table at a time."
---

> [中文版 Chinese version](/backend%20infra/whatsapp-2-million-connections-erlang-zh/)

This is the second entry in the 🚀 Extreme Scale series.

On January 6, 2012, WhatsApp published a blog post with a deliberately throwaway title — "1 million is so 2011" — and one command output that still deserves attention:

```text
jkb@c123$ sysctl kern.ipc.numopensockets
kern.ipc.numopensockets: 2277845
```

One server. **2,277,845 open sockets.** And the part that matters more than the record: the same post showed the machine at 37.9% user CPU, 13.6% system, 6.6% interrupt — and **41.9% idle**, with tens of gigabytes of memory still free. Two million connections was not the machine's ceiling. It was the point where the team stopped, because the bottlenecks left were no longer the obvious ones.

The hardware was not exotic. A dual-socket Xeon X5675 box: 24 logical CPUs, roughly 100 GB of RAM, running FreeBSD and Erlang/OTP R14B03. Two months later, WhatsApp engineer Rick Reed told the Erlang Factory audience how they got there, and his summary of the entire project fits in one line from his own slides:

> "Contention, contention, contention. From 200k to 2M were all contention fixes."

That sentence is the article. WhatsApp did not scale by finding a faster way to serve a connection. It scaled by repeatedly finding the one place where millions of cheap connections were forced to queue behind each other — a lock, a timer wheel, a single table, a single transaction manager — and breaking that queue apart. Understanding *why* each shared point serialises, and what breaking it actually changes, is the transferable lesson.

## Background: why a connection had to become almost free

The starting point, in early 2011, was about **200,000 connections per server**, and Reed described the prognosis for growth as discouraging and the cluster as brittle in the face of failures and overloads. The goal he set was blunt: **1 million connections per server**, with resilience against software failures, hardware failures, and world events — his slides list growth, earthquakes, and soccer matches in the same breath, because a goal in a big match and an earthquake both produce the same thing on the server side: a correlated surge of people opening the app at once.

Start with the arithmetic that rules out the conventional design. A thread-per-connection server pays an OS thread for every idle phone. Even at a lean 1 MB of stack and bookkeeping per thread — an optimistic figure — two million connections would need about 2 TB of memory just to exist, before a single message moves. WhatsApp's whole machine had about 100 GB. So the unit of concurrency could not be an OS thread. It had to be something the runtime could create, schedule, and destroy at a cost measured in kilobytes, not megabytes.

That is what Erlang's BEAM virtual machine provides, and WhatsApp's stack was built around three of its properties. Each mechanism below matters because of the specific failure it prevents — not because "Erlang is good at concurrency" in the abstract.

**1. One lightweight process per connection, with its own heap and mailbox.** A BEAM process does not share memory with other processes. It communicates by copying messages into another process's mailbox. For a messaging server this isolation is the load-bearing property: a connection whose handler crashes, or whose client sends garbage, damages its own small heap and nobody else's. There is no shared heap for one bad connection to corrupt, and no global lock needed to protect shared mutable state on the normal message path, because on that path there is no shared mutable state to protect.

**2. Preemptive scheduling by reductions, not by cooperation.** The Erlang/OTP documentation states the rule plainly: scheduling is preemptive, and a process is preempted when it has consumed more than a certain number of reductions — roughly, function calls — since it was last selected to run. One scheduler thread runs per core, in WhatsApp's case 24 schedulers on 24 logical CPUs. The consequence is a fairness guarantee that cooperative event loops do not give you: a connection process that starts doing expensive work cannot hold a scheduler indefinitely while thousands of other connections wait for their one small message to move. Its budget expires, it is descheduled, and the queue moves. Tail latency on an idle-heavy workload is mostly the story of who gets stuck behind whom — reduction counting is the mechanism that bounds that "whom".

**3. Per-process garbage collection.** Because each process has its own heap, collecting it is a small, local job whose cost tracks that one connection's live data — not a stop-the-world pause whose cost tracks the whole server's memory. On a box holding two million connections, a global pause is not a latency spike; repeated across millions of mostly-idle processes, it is the product. Small independent heaps turn GC from a cluster-wide event into background noise.

Together these explain why 200,000 connections was even plausible. They do not explain two million. The gap between those numbers was shared points hiding *inside* the runtime and the kernel — places where the supposedly independent processes were secretly queueing on the same thing.

{% mermaid %}
graph TD;
    A["Mobile clients - mostly idle long-lived TCP"] -->|"one connection each"| B["FreeBSD kernel - socket limits raised and TCP hash widened"];
    B --> C["BEAM schedulers - one per core on 24 logical CPUs"];
    C --> D["One Erlang process per connection - own heap and mailbox"];
    D -->|"message for a local user"| D;
    D -->|"message for a remote user"| E["Erlang distribution - large receive buffer"];
    E --> F["Peer WhatsApp node"];
    D --> G["Partitioned ETS and Mnesia tables - access localised"];
    D --> H["Per-table dirty transaction processes - no single manager queue"];
{% endmermaid %}

## The diagnostic that pointed at the real disease

Reed's team did not guess. Before fixing anything, they built the instrumentation BEAM did not have: scheduler utilisation broken into useful work, waits, sleeps and spins; lock counting that could be switched on for processes and ports at runtime; and message-queue statistics — how many messages were queued, how many queues were non-empty, which queue was longest, and per-process enqueue and dequeue rates over 1, 10 and 100 seconds.

That instrumentation produced the signature that defined the project. At the first serious bottleneck, around **425,000 connections**, the schedulers reported about 95% utilisation while the machine as a whole was only using roughly a third to under half of its CPU. Read those two numbers together and the conclusion is unavoidable: the schedulers were not doing useful work 95% of the time, they were *busy being stuck* — spinning or sleeping on locks. The CPU had headroom. The work could not get to the CPU, because too much of it first had to pass through a serialised point, one waiter at a time.

This is why "contention" is a mechanism claim, not a vibe. A lock under contention does not just add its own holding time. It converts parallel work into a queue, and queueing delay grows non-linearly as arrival rate approaches the serial service rate. Past that point, adding connections adds almost no useful throughput — it just lengthens the queue, which is exactly the 200k-to-425k plateau WhatsApp hit. Every fix below earns its keep by either shortening the time spent inside the serial section, or — better — shattering one serial section into many independent ones so there is no single queue left to saturate.

{% mermaid %}
graph LR;
    A["200k connections - brittle starting point"] --> B["425k - first wall - schedulers busy but CPU under half used"];
    B -->|"first contention fixes"| C["1M connections"];
    C -->|"similar bottlenecks attacked"| D["Over 2M connections - about a month later"];
    D -->|"application code work after New Year"| E["2.8M peak in February - intervened by operators"];
    E --> X["3M attempt - not achieved in this talk"];
{% endmermaid %}

## Fix 1: stop asking the clock a question that forces a queue

The most instructive fix is also the smallest. Erlang's older timestamp call, `erlang:now`, did not just read the time. It guaranteed that successive calls across the whole node returned unique, increasing values. A guarantee like that cannot be kept with a plain clock read: if two schedulers ask at the same instant, something has to decide who gets which value, and that something is a lock. On a messaging server, timestamps are taken constantly — per message, per connection event — so millions of independent processes were funnelling through one node-wide lock just to find out what time it was. Reed's slides call out the timeofday lock specifically, including its delivery path.

The fix was to change the question. WhatsApp's Erlang code was moved to prefer `os:timestamp`, which reads the operating system's clock without the node-wide uniqueness guarantee. No guarantee to enforce means no lock to take, which means 24 schedulers can read the time in parallel and none of them queues. The tradeoff is real and must be stated: you give up guaranteed uniqueness and monotonicity. If any code had been silently using `erlang:now` values as unique identifiers or as a total ordering, `os:timestamp` would break it — two events can now share a timestamp, or appear out of order. The fix works only because message ordering and identity at WhatsApp did not actually depend on that guarantee. That is the general pattern: half of contention removal is discovering that a guarantee you were paying for on every operation was a guarantee nobody needed.

The kernel side had the same shape. Getting the time was also expensive *below* BEAM, so WhatsApp backported FreeBSD's TSC-based timecounter, making `gettimeofday` much cheaper. A call that happens per message has to be cheap per call *and* uncontended; fixing only one of those leaves the other as the ceiling.

## Fix 2: timers — replace one central wheel with a per-process deadline

A messaging server with two million connections is a server with millions of timers: keepalives, retries, timeouts, presence expiry. BEAM's built-in function timers were kept in central structures — a timer wheel that had to be traversed and a hash table Reed's team widened because lookups were colliding. Traversal is the mechanism to focus on: work spent walking a shared wheel is work proportional to how many other people's timers exist, and it is done under shared access, so every new connection made every other connection's timer handling marginally more expensive and marginally more contended. The system had a cost that grew with total load even for operations that were logically independent.

The durable fix in the slides is not just "widen the hash", although they did that. It is that they **moved built-in timers to receive timeouts**. A receive timeout is local to a process: the process says "wake me if nothing arrives within this long", and the deadline lives with the process and its scheduler rather than in a central registry of every timer on the node. The causal chain is the same as partitioning a database table: one structure that every operation must visit becomes many structures that each operation visits alone. No traversal of other connections' timers, no shared hash to collide in. What this does *not* fix: a process that needs many independent simultaneous timers still needs its own bookkeeping, and receive timeouts express exactly one deadline — the one for the wait you are currently in. It removes the central bottleneck by giving up a general central service, which is fine precisely because most connection timers *are* just "wake me if this connection stays quiet".

## Fix 3: memory allocation — give every scheduler its own allocator

When 24 scheduler threads allocate memory through shared allocator structures, allocation becomes another queue: threads wait on allocator locks, and the memory they get can bounce cache lines between cores. Reed's tuning reads like a checklist for eliminating exactly that:

- One allocator instance per scheduler (`+Mut 24`) — so the common allocation path for a scheduler's processes does not need to coordinate with other schedulers.
- Prefer memory segments over plain `malloc`, with large, 2 MB-aligned segment allocations — so the operating system can back them with superpages, which reduces translation-lookaside-buffer pressure. On a 100 GB machine cycling through millions of small heaps, address translation is not a footnote; wasting it means the CPU stalls on page walks instead of running connection processes.
- Scheduler behaviour tuning — a low scheduler wakeup threshold so schedulers do not fall into a deep sleep they are slow to leave (`+swt low`), a patched scheduler spin count, and running with real-time scheduling priority — all aimed at the same failure: a runnable process waiting not for a lock, but for a sleeping scheduler to notice it.

None of these change what the system computes. They change how often the 24 cores wait on each other to manage the memory and scheduling machinery *underneath* the computation. That is why aggregate CPU figures mislead here: the win shows up as schedulers spending their cycles on processes instead of on coordination.

## Fix 4: partition the data, localise the access, shrink the cluster

The application-level fixes follow the same rule, applied to data instead of runtime internals.

**Partition ETS and Mnesia tables, and localise access to a smaller number of processes.** ETS and Mnesia are BEAM's in-memory and distributed data stores. A single table is a single point of serialisation: concurrent access coordinates through that table's structures and, for transactional access, through the transaction manager. Patent medicine would be "make the table faster". WhatsApp instead split tables into partitions and arranged for accesses to be handled by a smaller, local set of processes. Splitting works for the same reason sharding a database works: N partitions have roughly N independent contention domains, so the arrival rate at any one of them falls, and with it the queueing delay — plus accesses served locally stop paying cross-process coordination for data that only one neighbourhood of connections ever touches. The boundary is equally familiar: anything that genuinely needs a global view — a lookup across all partitions, a cluster-wide group membership — does not get faster by partitioning, and WhatsApp had to handle the biggest such case separately, by denormalising process-group membership lists in `pg2` so lookups read a prepared list instead of computing membership under contention at query time.

**Route dirty transactions around the single manager.** Mnesia's transaction manager is, by design, a coordinating process — which makes it a queue. WhatsApp patched it so asynchronous dirty transactions were dispatched to **separate per-table processes**. Dirty operations do not need full transactional coordination; sending them through the coordinator anyway meant every lightweight write paid for ordering machinery it did not use and waited behind operations that did. Per-table dispatch gives each table its own service rate, so a hot table cannot stall writes to cold ones. What it cannot give you is the guarantee you skipped: if you actually need cross-table atomicity, this path is not a faster version of it, it is a different and weaker contract — safe only for operations where that weakness was already acceptable.

**Keep Mnesia clusters small.** Reed's advice is one line and easy to underrate. Distribution and transaction coordination costs grow with the number of nodes that must agree and stay in contact. Small clusters cap that cost by construction, at the price of more clusters to operate and no single cluster that sees everything. WhatsApp chose the bounded coordination cost deliberately.

**Remove coordination you were paying for by idiom.** Two examples from the slides deserve naming because both are cases of a *default idiom* quietly taxing every operation. First, cross-node `gen_server` calls were reimplemented **without monitors**: a monitor gives the caller a notification if the callee dies, but creating and tearing one down per call adds distributed traffic and process-link lock contention on every single call, whether or not the callee ever dies. Removing it removes that per-call tax; the cost is that the caller must handle a dead callee some other way, because nobody will now tell it. Second, the team reduced socket-option calls in the accept path and in the call that hands a socket to its controlling process — per-connection setup work that is trivial at a thousand connections and a measurable serial cost at two million.

And one throughput fix ties the cluster together: the Erlang distribution receive buffer went from **4 KB to 256 KB** and became configurable. Inter-node traffic on WhatsApp is not an edge case — at the February peak the system was moving **over 200,000 distributed messages per second** and **571,000 packets per second**. A 4 KB receive buffer on that path means the receiving side drains in tiny sips, backpressure engages constantly, and sender processes stall behind buffer refills instead of doing their own work. A 64x larger buffer lets the distribution channel absorb bursts at line rate. It fixes a *burst absorption* problem, not a sustained overload problem: if a peer is permanently slower than the send rate, the bigger buffer only delays the day the queue becomes visible — which is why Reed's team also built the message-queue instrumentation to see that day coming, per process, before it arrived.

## What the fixes bought — and what they did not

The results, in order: bottlenecks appeared around 425,000 connections; the first round of fixes took the server past **1 million**; about a month later came **2 million**; and after application-code work began in the new year, an *unintentional* record attempt in February 2012 peaked at **2.8 million connections** before the operators intervened — at 571,000 packets per second and over 200,000 distributed messages per second. In January, WhatsApp's own snapshot at just over 2.27 million sockets still showed 41.9% idle CPU. Reed also reported Erlang achieving over 85% CPU utilisation across the 24 logical CPUs once contention was removed — the mirror image of the 425k signature, where high scheduler utilisation had meant spinning, not working.

Now the honest boundaries, because the headline number invites three misreadings.

**Two million connections is not two million active conversations.** The workload that makes this result possible is millions of mostly idle, long-lived connections, each occasionally sending a small message. The expensive thing being scaled is *existence* — a socket, a process, a set of timers per user — not sustained per-connection computation. A workload where every connection continuously does heavy work would saturate the 24 cores at a tiny fraction of two million connections, and no amount of contention removal changes that arithmetic. Reed's team tried for **3 million** and, as of the March 2012 talk, had not got there; even existence has a ceiling, set by kernel socket structures, memory per socket, and file-descriptor limits — which is why the FreeBSD side of the work is mostly raising hard caps: maximum sockets to 2.4 million, maximum files to 3 million, and the TCP hash table to 524,288 entries so that looking up one connection's state among two million does not degrade into walking long collision chains.

**One process per connection isolates failures; it does not make the node survivable.** If the box holding 2.27 million connections dies, 2.27 million clients reconnect — and a simultaneous reconnect surge is itself one of the correlated-load events Reed listed as a design threat. Isolation bounds the blast radius of a *process* failure to that process. Node failure remains a node-sized event, and the defence is the cluster and the reconnect behaviour, not the actor model.

**Patching your runtime is a capability and a debt.** Most of the fixes, Reed said plainly, required BEAM patches, plus FreeBSD backports. That bought WhatsApp performance no configuration file offered — and left it maintaining a fork whose changes had to be carried, understood, and re-validated by a very small team. The strategy is only rational because the team first built lock counting and scheduler instrumentation good enough to *prove* each patch attacked a measured queue. Without that evidence, a patched runtime is just a more exciting way to be wrong.

## Lessons worth stealing

1. **Measure contention directly; CPU utilisation will lie to you.** Schedulers at 95% and a machine under 50% is the fingerprint of lock queueing, not of hard work. If you do not instrument locks, scheduler wait states, and queue lengths, you will "optimise" code that was never the bottleneck.
2. **Every guarantee has a queue somewhere.** Unique monotonic timestamps, per-call death notifications, full transactional coordination for a dirty write — each is a sensible default, and each was a serial point at two million connections. List the guarantees your hot path enforces, price each one, and delete the ones nobody actually consumes.
3. **Partitioning beats strengthening.** The timer wheel, the tables, the transaction manager, the allocator: in every case the durable fix was not a faster shared thing but many independent things. One queue saturates; N queues scale with N — provided your access pattern can actually be localised, which is a design property you must build, not a setting you flip.
4. **Idle is a workload, and it is the product.** For messaging, presence, IoT, and push, the service *is* holding millions of quiet connections cheaply enough that the occasional burst is routine. Cost per idle connection — in memory, timers, and kernel structures — deserves the same engineering attention as peak throughput, because at this scale it decides how many boxes you buy.
5. **Keep the coordination domain small on purpose.** Small clusters, localised table access, per-table dispatch: WhatsApp repeatedly chose bounded coordination over a single system that sees everything. Coordination cost grows faster than load does; the only reliable way to cap it is to refuse, structurally, to coordinate globally by default.

Fourteen years on, runtimes have absorbed many of these lessons and few teams need to patch a virtual machine to hold a million sockets. But the diagnostic discipline has not dated at all: find the shared point, prove with instrumentation that work is queueing there, break it into independent pieces, and say out loud which guarantee you traded away. That is how 200,000 became 2,277,845 — with CPU to spare.

## Sources

- WhatsApp, "1 million is so 2011," WhatsApp Blog, January 6, 2012. https://blog.whatsapp.com/1-million-is-so-2011 — the 2,277,845 open-socket count, CPU and memory snapshot, hardware, FreeBSD and Erlang versions, and kernel limits are from this post.
- Rick Reed (WhatsApp), "Scaling to Millions of Simultaneous Connections," Erlang Factory SF, March 30, 2012 — slides: https://www.slideshare.net/slideshow/scaling-to-millions-of-simultaneous-connections-by-rick-reed-from-whatsapp/52848143 ; talk page: https://www.erlang-factory.com/conference/SFBay2012/speakers/RickReed — the 200k starting point, 425k bottleneck, 1M / 2M / 2.8M progression, contention findings, and all BEAM, OTP, FreeBSD and application fixes are from this talk.
- Erlang/OTP documentation, `erlang` module reference (process priority and scheduling), Erlang/OTP. https://www.erlang.org/docs/22/man/erlang.html — for the rule that scheduling is preemptive and a process is preempted after consuming a set number of reductions.
