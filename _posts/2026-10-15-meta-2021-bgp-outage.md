---
layout: single
title: "One Command, Six Hours of Silence: How Meta's 2021 BGP Outage Disconnected the World's Biggest Social Network"
description: "On October 4, 2021, a single routine maintenance command disconnected every Meta data center from every other one. Within minutes, Facebook, Instagram, WhatsApp and Messenger vanished from the internet for roughly six hours — while every server was still running. The outage was not a server failure; it was three coupled mechanisms amplifying one bad command."
date: 2026-10-15 08:00:00 -0700
categories:
  - Backend Infra
tags:
  - Incident Recap
  - Meta
  - BGP
  - DNS
  - outage
excerpt: "A single maintenance command disconnected every Meta data center from every other one. Minutes later the whole family of apps vanished from the internet for about six hours — with every server still running."
---

> [中文版 Chinese version](/backend%20infra/meta-2021-bgp-outage-zh/)

Here is the number that should make any infrastructure engineer pause: on October 4, 2021, **one routine maintenance command** disconnected every Meta data center from every other one — and within minutes, Facebook, Instagram, WhatsApp and Messenger disappeared from the internet for roughly six hours. Not degraded. Not slow. Gone, as if someone had pulled the cables out of every data center at once.

The servers were still running. The data was intact. Nothing had been hacked — Meta's own postmortem is explicit that there was no malicious activity and no evidence that user data was compromised. What broke was the layer underneath the servers: the network that tells the internet where those servers are, and the network that lets the servers talk to each other.

This is the first entry in the 🔥 Incident Recap series, and it is the right place to start, because the lesson is uncomfortable: the outage was not caused by one mistake. It was caused by one mistake passing through **three amplification mechanisms**, each of which was locally sensible and globally catastrophic. Fix any one of them and the incident is smaller; leave all three in place and a single command can delete a company from the internet.

## Background: what the backbone is, and what BGP and DNS do

Meta's platforms run on a private global backbone: a network the company built to connect all of its computing facilities, made of tens of thousands of miles of fiber-optic cable linking data centers around the world.

Those data centers come in two forms, per Meta's postmortem:

- **Massive compute-and-storage data centers** — huge buildings housing millions of machines that store data and run the heavy computational loads.
- **Smaller edge facilities** — the places where the backbone meets the broader internet and the people using the platforms. When you open an app, your request travels to the nearest edge facility, which then talks over the backbone to a large data center, which retrieves and processes the information and sends it back.

Two internet protocols sit on top of this physical network, and both matter for what happened:

- **DNS** is the internet's address book: it translates names like `facebook.com` into server IP addresses. Meta answers those translation queries with its own authoritative name servers, which live in the smaller edge facilities.
- **BGP (Border Gateway Protocol)** is how networks advertise their presence to each other. Meta's name servers occupy well-known IP addresses, and those addresses are advertised to the rest of the internet via BGP. If the BGP advertisement for an address is withdrawn, the rest of the internet has no route to it — the servers behind that address become unreachable, even if they are powered on and working perfectly.

Hold that last point, because it is the hinge of the whole incident: **reachability and health are different things**, and this outage is what happens when a system confuses them.

## Timeline (all times UTC, October 4, 2021)

| Time (UTC) | Event |
|---|---|
| ~15:40 | Cloudflare observes a peak of BGP routing changes from Meta's network — the trouble begins. |
| ~15:50 | `facebook.com` stops resolving on public DNS resolvers. |
| 15:58 | Meta stops announcing the BGP routes to its DNS prefixes. |
| 15:51–16:00 | Cloudflare opens an internal incident ("Facebook DNS lookup returning SERVFAIL"), initially worried its own resolver was broken. |
| Evening | Meta dispatches engineers onsite to data centers; physical and system security slows entry and access. |
| ~21:00 | Renewed BGP activity from Meta's network; peaks at 21:17. |
| ~21:20 | `facebook.com` resolves again on public resolvers. |
| ~21:28 | Meta appears reconnected to the global internet; services come back in stages. |

The DNS blackout window alone — roughly 15:50 to 21:20 UTC — is about five and a half hours, and full service restoration took longer. The commonly cited duration is roughly six hours.

## The cascade: one command, three amplifiers

Here is the fault-propagation chain, from the maintenance command to a global disappearance:

{% mermaid %}
graph TD;
    A["Routine maintenance command"] -->|"assess backbone capacity"| B["Backbone capacity system"];
    B -->|"audit tool bug, no block"| C["All backbone connections withdrawn"];
    C --> D["Data centers mutually disconnected"];
    D --> E["Edge DNS servers cannot reach data centers"];
    E -->|"health check, withdraw BGP"| F["All DNS BGP advertisements withdrawn"];
    F --> G["Internet cannot find Meta servers"];
    G --> H["Apps retry, 30x DNS query surge"];
    C --> I["Primary and out-of-band access down"];
    I --> J["Engineers dispatched onsite"];
    J -->|"physical security slows entry"| K["Backbone restored"];
    K -->|"staged restore, power and cache risk"| L["Services return over hours"];
{% endmermaid %}

Each arrow in that diagram is a mechanism worth understanding, because the timeline alone makes the outage look like bad luck. It was not bad luck. It was coupling.

### Amplifier 1: the guardrail had a bug — and it was the only guardrail

The triggering event, in Meta's words, was a command issued during routine maintenance with the intention of assessing the availability of global backbone capacity. It unintentionally took down all the connections in the backbone network, effectively disconnecting Meta's data centers globally.

Meta's systems were designed to audit commands like these to prevent exactly this kind of mistake. But a bug in that audit tool prevented it from properly stopping the command.

This is the first mechanism to take seriously, because it is not "an engineer typed the wrong thing." It is **a safety layer with a single point of failure inside the safety layer itself**. The audit tool was the control that stood between a routine command and a global outage, and nothing stood behind the audit tool: no second check, no blast-radius limit that would have capped the command's effect at, say, one region or a fraction of backbone links, no canary that would have applied the change to a small slice first and measured the result.

A guardrail that can fail silently is not a guardrail; it is a delay. The fix this mechanism demands is not "be more careful" — it is structural: commands whose blast radius is global must be subject to limits that do not depend on one tool's correctness. Concretely: hard caps on how much of the backbone one command can touch, staged rollouts even for read-only-sounding assessment commands, and tests of the audit tool itself against known-bad commands. Note what this mechanism does *not* fix: even a perfect audit tool cannot save you if the underlying system lets one command touch everything. Blast-radius limits and guardrail testing are complements, not substitutes.

### Amplifier 2: a locally sensible health check, executed by everyone at once

The second mechanism is the one that turned a backbone outage into a disappearance from the internet.

Meta's DNS servers are built to disable their BGP advertisements if they themselves cannot speak to the data centers, since that is an indication of an unhealthy network connection. In normal operation this is sensible: if one edge location is sick, it steps aside so the rest of the internet routes to healthy locations. The health check is *local* — each DNS server judges its own connectivity.

But in this outage the entire backbone was removed from operation. Every edge location's health check therefore answered the same way at the same time: unhealthy. Every location withdrew its BGP advertisements simultaneously. The end result, in Meta's words, was that the DNS servers became unreachable even though they were still operational — and the rest of the internet could no longer find Meta's servers.

This is a **correlated-failure / common-mode coupling**: a safety mechanism whose trigger condition is shared across all replicas. Each individual withdrawal was correct by its local rule; the global outcome was that the whole system withdrew itself. The mechanism that breaks this coupling is not "remove the health check" — the health check is genuinely useful when one site fails. It is to make the withdrawal decision *correlation-aware*: dampen or stagger withdrawals, require a quorum of independent signals, or keep advertising last-known-good routes when the failure is global rather than local. The design question is: what should a fleet do when *everyone* reports unhealthy at once? If the answer is "everyone steps aside," then your health check is a self-destruct button waiting for a correlated trigger.

There is a second-order effect worth naming. Cloudflare measured DNS resolvers worldwide handling **30x more queries than usual** during the outage, because apps and users do not accept an error for an answer: apps retried aggressively, users reloaded and relaunched. A total disappearance converts every client into a retry loop, and the retry storm loads the shared infrastructure — public DNS resolvers — that everyone else depends on. The blast radius of "we are unreachable" extends beyond your own systems.

Note also a subtlety Cloudflare's outside view captured: other Meta IP addresses *remained routed* during the outage. The servers were not all unreachable at the IP layer — but without DNS, clients could not discover those IPs, so the services were effectively unavailable anyway. DNS is the single rendezvous point, and when it goes, everything above it goes too.

### Amplifier 3: the recovery path ran through the failed system

The third mechanism is why six hours, not sixty minutes.

Once the backbone was down, Meta's engineers faced two obstacles, both stated in the postmortem: it was not possible to access the data centers through normal means because their networks were down, and the total loss of DNS broke many of the internal tools normally used to investigate and resolve outages. Primary *and* out-of-band network access was down.

So Meta sent engineers onsite to the data centers to debug the issue and restart the systems. That took time, because the facilities are designed with high levels of physical and system security: they are hard to get into, and once inside, the hardware and routers are designed to be difficult to modify even with physical access. Extra time went into activating the secure access protocols needed to get people onsite and able to work on the servers. Only then could the team confirm the issue and bring the backbone back online.

This is the **recovery-depends-on-the-patient** failure mode: the tools, the access path, and the investigation machinery all depended on the very network that had failed. A recovery path that shares fate with the system it recovers is not a recovery path. What breaks this coupling is a genuinely independent out-of-band channel — separate network, separate authentication, separate tooling — that is *tested* by actually using it in drills, not merely documented. Meta's postmortem is candid that the hardening slowed recovery, and frames it as a tradeoff worth making: greatly increased day-to-day security versus slower recovery from a hopefully rare event. That is a defensible tradeoff — but only if the cost side is priced honestly and the break-glass path is rehearsed, which is exactly what the incident revealed had not been done at this scale.

## The way back: why restoration was staged, not flipped

Once backbone connectivity was restored across the data center regions, everything did not simply come back. Meta knew that flipping services back on all at once could cause a new round of crashes due to a surge in traffic. Individual data centers were reporting dips in power usage in the range of **tens of megawatts**, and suddenly reversing such a dip could put everything from electrical systems to caches at risk.

So restoration was staged and carefully managed. What made that possible was preparation: Meta credits the "storm" drills it had been running for a long time, exercises that take a service, a data center, or an entire region offline on purpose to stress-test the infrastructure and software. Experience from those drills gave the team the confidence to bring things back online and manage the increasing loads — and services came back up without further systemwide failures.

But the postmortem contains an honest admission: while Meta had never previously run a storm that simulated the *global backbone* being taken offline, it would look for ways to simulate events like that going forward. The drills covered the failure modes they had imagined; the incident was the one they had not rehearsed. That gap — rehearsing component failures but not the correlated, global variant — is the precise shape of this entire outage.

## Lessons worth stealing

1. **Treat control-plane changes as production deploys, not maintenance.** A command that can touch the whole backbone deserves the same machinery as a code deploy: blast-radius caps, staged rollout, canary measurement, and rollback. "Routine maintenance" is a label, not a risk class.
2. **Your guardrail needs a guardrail.** An audit tool that silently fails to stop a catastrophic command is worse than no audit tool, because it creates false confidence. Test the safety layer itself against known-bad inputs, and never let one tool be the only thing between a command and global impact.
3. **Health checks must be correlation-aware.** Any mechanism that lets every replica withdraw, shed, or fail over at once is a self-destruct button waiting for a correlated trigger. Ask: what does this system do when *everyone* reports unhealthy simultaneously? If the answer is "everyone steps aside," redesign it — dampen, stagger, require quorum, or keep last-known-good advertisements.
4. **The recovery path must not share fate with the system it recovers.** If your out-of-band access, your internal tools, and your runbooks all depend on the network that just failed, you do not have out-of-band access. Build a truly independent break-glass path — and prove it works by using it in drills, not by documenting it.
5. **Rehearse the correlated failure, not just the component failure.** Storm drills that take one service or one region offline are necessary and were genuinely useful here. But the incident that actually happened was the global variant nobody had simulated. Your drill program should include at least one "everything fails at once" scenario, because that is the scenario where your coupling assumptions get tested.
6. **Price the security-vs-recoverability tradeoff explicitly.** Meta's hardening slowed its own recovery, and Meta defends the tradeoff. That is a legitimate position — but only if the cost is measured and the break-glass path is rehearsed. Security that you cannot bypass under controlled conditions during an emergency is security that will bill you in downtime.

## What the postmortem does not say

Honesty requires noting what Meta's public postmortem does *not* contain. It does not publish a detailed list of concrete fixes with dates — it says an extensive review process is underway and commits directionally to strengthening testing, drills, and resilience. It does not explain the audit tool's bug in technical detail. And it does not quantify user or business impact beyond the outage itself. That thinness is itself a data point: public postmortems are often better at explaining *what* happened than at committing to *what changes*. The lessons above are drawn from the mechanisms the postmortem does describe — the audit failure, the correlated BGP withdrawal, the recovery coupling, the staged restore — not from any fix list Meta published. When you read a postmortem, separate the mechanism evidence (strong here) from the remediation promises (thin here), and weight them accordingly.

## Sources

- Santosh Janardhan, "More details about the October 4 outage," Engineering at Meta, October 5, 2021. https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/ — primary source for the trigger (backbone capacity command, audit-tool bug), the DNS/BGP withdrawal mechanism, the loss of primary and out-of-band access, the onsite dispatch, the tens-of-megawatts power dips, the staged restoration, the storm drills, and the security-vs-recovery tradeoff. All mechanism claims in this article come from this post unless noted.
- Santosh Janardhan, "Update about the October 4th outage," Engineering at Meta, October 4, 2021 (updated Oct 5). https://engineering.fb.com/2021/10/04/networking-traffic/outage/ — primary source for the confirmation that there was no malicious activity and no evidence that user data was compromised.
- Cloudflare, "Understanding how Facebook disappeared from the Internet," October 4, 2021. https://blog.cloudflare.com/october-2021-facebook-outage/ — independent outside-view measurements: BGP routing-change peak around 15:40 UTC, DNS prefixes withdrawn by 15:58 UTC, `facebook.com` unresolvable ~15:50 UTC and resolving again ~21:20 UTC, renewed BGP activity ~21:00 UTC peaking 21:17 UTC, reconnection ~21:28 UTC, and the ~30x surge in DNS queries on public resolvers. Where Meta's account and Cloudflare's timestamps differ in granularity, this article follows Cloudflare for externally observed times and Meta for internal causation.
