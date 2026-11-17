---
title: "[Update] Microsoft 365 Outage: A Bug Dormant Since July, and Two Ordinary Events That Woke It"
description: "Microsoft's preliminary post-incident report traces last week's nearly 24-hour Microsoft 365 outage to three factors: a latent Windows defect shipped in July, a routine Teams failover, and 14% of gateway capacity already offline. The cascade took down more than 80% of gateway servers in under two hours."
date: 2026-11-17
permalink: /life/microsoft-365-outage-root-cause-update/
tags:
  - Microsoft
  - Microsoft 365
  - Outage
  - Cloud
  - Infrastructure
excerpt: "Update: the outage we covered on November 13 now has a root cause — three failures, each harmless alone, that lined up on the same day."
---

> [中文版 Chinese version](/life/microsoft-365-outage-root-cause-update-zh/)

![Microsoft's Redmond campus.](/assets/images/life/2026-11-17-microsoft-365-outage-root-cause-update/msft-campus-1200.jpg)

*Microsoft's Redmond campus. Photo: Atomic Taco, via Wikimedia Commons (CC BY-SA 2.0).*

**Update:** this post follows up our November 13 coverage, [Microsoft 365 Went Down Worldwide — and Stayed Down](/life/microsoft-365-outage-nov-12/), with the root cause Microsoft has now published.

## What happened

Microsoft has published its preliminary post-incident report on the global Microsoft 365 outage of November 12–13, and the explanation is more unsettling than a single bug. The incident ran from **November 12 at 16:20 UTC to November 13 at 16:10 UTC — 23 hours and 50 minutes** — knocking out mailbox access and delaying email across Outlook, Exchange Online, Teams, and Copilot. The report, dated November 15 and shared with administrators, names **three factors** that "together caused a global outage for the networking gateway that fronts many Microsoft 365 services." A final report, with the full list of repairs, is due **November 20**.

The three factors:

1. **A defect dormant since July.** A fix prepared specifically for Microsoft 365's networking gateway servers carried a latent bug: lock contention inside an internal Windows process that could exhaust CPU and memory under certain load conditions. Microsoft deployed it starting in July and observed no issues for more than three months.
2. **A routine Teams failover.** About 15 hours before the outage, at 01:07 UTC on November 12, automated failover moved Teams traffic from an alternative gateway onto the primary gateway that also serves Exchange Online. Microsoft calls this part of normal operations. It raised load and changed the traffic mix on the affected servers.
3. **Capacity already missing.** Nearly **14%** of the gateway's server capacity was out of service from an unrelated issue the day before. Microsoft says that alone caused no impact — there was enough headroom.

![Microsoft 365 outage: three small failures, one global cascade.](/assets/images/life/2026-11-17-microsoft-365-outage-root-cause-update/msft-outage-cascade-en.png)

*The cascade, step by step. Source: Microsoft preliminary post-incident report (November 15, 2026), via Computer Weekly and BleepingComputer.*

## How a small bug became a global outage

The mechanism is the interesting part, and it is the part Microsoft's own engineers would recognize from every cascade failure in the textbooks. Automatic traffic redirection — the system designed to keep users on healthy servers — became the amplifier. When the latent defect froze a server, its load moved to surviving neighbors, which then hit the same defect under the heavier load, and froze in turn. **In less than two hours, more than 80% of the servers behind the affected gateway were unresponsive.** The safeguards meant to stop a failure spreading between regions did not contain it.

Charles Lamanna, Microsoft's executive vice-president for Copilot, agents and platform, apologized for the impact in a post on X, confirming the lock-contention defect and the cascade. Microsoft stressed two things: the incident was a technical failure with **no sign of malicious activity** — not a cyberattack, and not related to AI agents — and the defect was specific to its Microsoft 365 gateway servers, not to Windows in general or to desktop PCs.

## Why this one matters

Each of the three factors, on its own, was defensible. A fix that ran clean for four months. A failover that is literally standard procedure. A 14% capacity loss with headroom to spare. The outage happened because all three lined up on the same day — and because the system's own resilience mechanism, automatic redirection, turned a local failure into a fleet-wide one. That is the classic shape of a cascade failure, and it is why the report is worth reading even if you never touch Exchange: the pattern shows up in power grids, airlines, and every cloud.

The report also leaves the biggest question open. It does not address why the isolation systems that were supposed to contain a regional failure did not work — the preliminary findings describe the cascade, not the failure of the containment. That is presumably what the final report on November 20 has to answer, along with the full repair list. This was, by one count, the **fourth major Microsoft 365 outage this year** tied directly to the company's own changes and maintenance — which makes the repair list, not the apology, the thing to watch.

*This post reflects the status as of the morning of November 17, 2026 (PT). Sources: Microsoft preliminary post-incident report (November 15, 2026); Computer Weekly; BleepingComputer; Ars Technica; Windows Forum.*
