---
layout: single
title: "One Valid Config Change, 85% of the Network Down: Fastly's June 8, 2021 Outage and the Bug That Slept for 27 Days"
description: "On June 8, 2021, a single customer pushed a valid configuration change to Fastly's edge cloud, and a software bug that had slept since a May 12 deployment woke up: 85% of Fastly's network began returning errors. Detection took one minute; identifying the one guilty configuration among thousands took forty. The outage is a textbook case of fate-sharing in a multi-tenant edge network — one tenant's input, everyone's data path — and of why a bug can be both fully deployed and completely invisible for 27 days."
date: 2026-10-29 08:00:00 -0700
categories:
  - Backend Infra
tags:
  - Incident Recap
  - Fastly
  - CDN
  - configuration
  - outage
excerpt: "One customer pushed a valid configuration change. A bug deployed 27 days earlier woke up, and 85% of Fastly's network started returning errors. Detection took one minute; finding the one guilty configuration took forty — because a global symptom carries no clue about which input caused it."
---

> [中文版 Chinese version](/backend%20infra/fastly-2021-config-bug-outage-zh/)

Here is the number: **85 percent**. On June 8, 2021, 85% of Fastly's edge network began returning errors — not one customer's site, not one region, but nearly the whole network at once. The trigger was not an attack, not a traffic surge, not a bad deploy that morning. It was one customer pushing one *valid* configuration change, which woke up a software bug that had been sitting in Fastly's deployed code since May 12 — **27 days** of dormancy, ended by an ordinary, approved, correctly-formed input.

This is the third entry in the 🔥 Incident Recap series, and it is in some ways the most unsettling of the three so far. The Meta BGP outage (entry #1) had a dramatic, fully explained mechanism: a bad command withdrew the network's own routes and locked the engineers out of their own data centers. The Cloudflare regex outage (entry #2) had a published offending pattern, counted step-by-step, and eleven converging causes. Fastly's outage has something stranger: a postmortem that is admirably fast and honest about its timeline, and almost completely silent about the bug itself. Fastly never published what the bug was, what the configuration contained, or which customer pushed it. What it did publish — the timeline, the percentages, the recovery sequence, and the remediation direction — is enough to reconstruct the *shape* of the failure with precision, and to name exactly where the published record stops. That boundary matters, and this article keeps it visible throughout: facts from Fastly's post are stated as facts; everything else is labeled as analysis.

## Background: a CDN is a shared machine with per-customer steering

Fastly's own description, carried on the same post, is short: its edge cloud platform helps popular digital businesses deliver fast, secure, and scalable online experiences. Unpack what that means mechanically, because the whole outage lives in the architecture.

A content delivery network puts servers — points of presence, or POPs — close to users, and serves cached content from them instead of sending every request back to the customer's origin servers. Two properties of that design decide this incident:

First, **the edge is shared**. Every POP runs the same edge software for every customer. Your site's traffic and another company's site traffic pass through the same code, on the same machines, separated by configuration, not by hardware. Configuration is what makes one shared fleet behave like thousands of different front doors: each customer's service definition tells the edge how to route, cache, and transform requests for that customer.

Second, **a configuration change is a production deployment**. When a customer pushes a config change, it is not a note filed somewhere — it is input that the edge fleet will act on, globally. The config has to reach the POPs and take effect there, because a CDN that serves stale configuration is a CDN serving the wrong site behavior. Speed of config propagation is a feature customers pay for. It is also, as June 8 showed, a blast-radius decision: whatever a new configuration does, it does everywhere, quickly.

Hold those two facts together and the incident's central paradox dissolves. How can one customer's change break 85% of a network that serves thousands of customers? Because the change did not break that customer's site. It exercised a bug in the *shared* code path — code every customer's traffic flows through — and the bug's effect was not scoped to the customer whose input triggered it. The input was per-tenant. The fault was in the commons.

## Timeline (all times UTC, June 8, 2021)

| Time (UTC) | Event |
|---|---|
| May 12, 2021 | Fastly begins a software deployment that introduces the bug. |
| Early June 8 | A customer pushes a valid configuration change that includes the specific circumstances that trigger the bug. |
| 09:47 | Initial onset of global disruption. |
| 09:48 | Global disruption identified by Fastly monitoring — within one minute. |
| 09:58 | Status post published. |
| 10:27 | Fastly Engineering identifies the customer configuration. |
| 10:36 | Impacted services begin to recover. |
| 11:00 | Majority of services recovered. |
| 12:35 | Incident mitigated. |
| 12:44 | Status post resolved. |
| 17:25 | Permanent bug-fix deployment begins. |

One reconciliation note, because Fastly's own numbers need care. The post's headline claim is that "within 49 minutes, 95% of our network was operating as normal." 09:47 plus 49 minutes is 10:36 — the moment the timeline says impacted services *began* to recover, not the moment recovery completed. The timeline's own markers for broader recovery are later: majority of services at 11:00, incident mitigated at 12:35. These are not contradictions so much as different thresholds — network operating normally versus services recovered versus incident mitigated — but they should not be collapsed into a single "fixed in 49 minutes" story. The honest reading is: the triggering input was neutralized within about 49 minutes of onset, most services were back by about 11:00, and the incident was not declared mitigated for nearly three hours. All three numbers are Fastly's; the article keeps them separate.

## The cascade: one input, a shared fault, a global symptom

{% mermaid %}
graph TD;
    A["May 12 deploy ships a latent bug"] --> B["Bug sleeps for 27 days"];
    B --> C["June 8 customer pushes a valid config change"];
    C --> D["Config reaches the edge fleet worldwide"];
    D --> E["Bug fires on the shared code path"];
    E --> F["85 percent of network returns errors"];
    F --> G["Users see error pages everywhere at once"];
    F --> H["Monitoring detects disruption in 1 minute"];
    H --> I["40 minutes from onset to identifying the config"];
    I --> J["Triggering config disabled"];
    J --> K["Services begin recovering at 10:36 UTC"];
    K --> L["Majority recovered by 11:00 UTC"];
    L --> M["Incident mitigated at 12:35 UTC"];
    M --> N["Permanent fix deploy begins at 17:25 UTC"];
{% endmermaid %}

The diagram is deliberately simple, because the failure itself is simple at the top level. The depth is in *why* each arrow was possible. That is where the quality bar for this series sits: not a retelling of the timeline, but the mechanism behind each step.

### Amplifier 1: fate-sharing — one tenant's input, everyone's data path

The mechanism that turns a single configuration change into an 85% outage is fate-sharing through shared code. In a multi-tenant edge, the isolation boundary is supposed to be the configuration: your config steers your traffic, mine steers mine, and neither should be able to affect the other. That boundary holds for *correct* code. A bug in the code that *interprets* configuration is not inside any tenant's boundary — it sits underneath all of them. When the triggering configuration arrived, it did not corrupt one customer's routing. It drove the shared interpreter into a failure mode, and every request that passed through that code path after that point hit the same fault, regardless of which customer it belonged to.

This is the precise sense in which the outage was "broad and severe" without any single customer doing anything wrong. The customer did not push a malformed change; Fastly stresses that it was valid. Validity is judged by the config system — shape, schema, permissions — and the change passed all of it. The fault was not in the input. It was in what the shared code *did* with a particular valid input. A system whose blast radius is defined by its shared code paths, not by its tenant boundaries, will always have this failure mode available: any tenant, by accident, can supply the input that finds it.

Note what this amplifier does *not* claim. Fastly does not say the bug crashed processes, corrupted caches, or took POPs offline — and this article does not invent that detail. The observable, published fact is narrower and sufficient: the network returned errors at 85% scale. The mechanism that explains the scale is the shared code path; the internal fault itself is undisclosed, and the "What the postmortem does not say" section below says so plainly.

### Amplifier 2: why 27 days — a latent bug is a bug whose trigger has not been tried yet

A bug introduced on May 12 that first fires on June 8 is not a bug that "appeared" on June 8. It was live in production for 27 days, executing on every request that reached its code path, and returning correct results for all of them — because none of those requests carried the specific configuration circumstances it mishandled. Latency of this kind is normal, not mysterious, once you count the input space.

A CDN edge code path does not have one input. It has the cross product of customer configurations: thousands of customers, each with many settings, each setting with many values, in combinations that change every day as customers push changes. Testing can cover the code paths, and it can cover representative configurations. It cannot enumerate the cross product — the space is combinatorial, and every customer change adds new combinations that no test suite has ever run. A bug that fires only on one specific combination is therefore *untestable by enumeration* and *invisible to ordinary traffic* at the same time. The 27 quiet days are not evidence the deployment was safe. They are evidence that the triggering combination had not occurred yet. That is the exact sentence Fastly's SVP of Engineering, Nick Rockwell, wrote in a different form: "Even though there were specific conditions that triggered this outage, we should have anticipated it."

The word "valid" sharpens the point. If the change had been malformed, validation might have caught it — malformed input is the failure mode config systems are built to reject. A valid change that triggers a platform bug bypasses every input-side guard by design, because the guards exist to judge the input, and the input is fine. The failure lives one layer down, in the platform's handling of an input class its tests never exercised. This is why "the customer pushed a valid change" is not a defense of the platform or an accusation of the customer. It is the precise description of a class of failure that input validation cannot prevent: correct input, incorrect handling.

### Amplifier 3: detection in one minute, identification in forty — a global symptom carries no address

The timeline's most instructive gap is between 09:48 and 10:27. Monitoring caught the disruption within one minute — error rates spiking everywhere, simultaneously. It then took 39 more minutes to identify the customer configuration. Why is finding the cause forty times slower than seeing the effect?

Because a global, simultaneous symptom has *no locality signal*. If one POP fails, you look at that POP. If one region degrades, you look at the region. If error rates jump everywhere at the same instant, the failure is in something global — shared software, or shared input — and "everywhere" tells you nothing about *which* global input. The search space is every recent change to anything global: software deploys, and every customer configuration change pushed anywhere in the fleet, in the window before onset. The symptom does not point at a customer; it points at a *class* (global input), and the team had to correlate onset time against config-push timestamps, isolate candidate changes, and confirm which one reproduced the fault — while the network was down and every minute of searching was a minute of outage.

This asymmetry is structural, not a criticism of the team on the day. Detection scales with monitoring: one threshold, one alert, one minute. Attribution scales with the number of candidate global inputs, and it requires a different kind of tooling — a complete, timestamped, queryable log of config changes fleet-wide, and a way to test a suspect config against the current code without pushing it to production again. The forty minutes is the time that tooling and process took in June 2021. Any edge operator reading this should ask: if one of our customers pushes the next triggering config tomorrow, how many minutes from "errors everywhere" to "this config, this customer"? That number, not the detection number, is the recovery budget that matters.

### Amplifier 4: disabling the config recovered service in nine minutes — and was not a fix

From identification at 10:27 to recovery beginning at 10:36 is nine minutes, and the mechanism is worth stating exactly: removing the triggering input stops the bug from firing. The bug is still in the code. The code path is still shared. But with the specific configuration circumstances gone, no request carries the combination that fires it, and the fleet returns to correct behavior on the inputs it is actually receiving. That is why mitigation did not require a code deploy, and why it could be fast once the config was identified: the lever was data (the config), not code.

The boundary is equally exact, and Fastly's timeline shows it. A disabled configuration is a *revoked input*, not a repaired system. The customer whose change was disabled cannot re-enable it without re-triggering the outage. The bug remains deployable against any future configuration that recreates the circumstances. That is why the permanent fix is a separate event, hours later — deployment of the actual code fix began at 17:25, after the incident was mitigated — and why "mitigated at 12:35" and "fix deployment began at 17:25" are different milestones that must not be merged. Mitigation buys back availability by shrinking what the system is allowed to do. The fix restores the full capability. Confusing the two is how a team declares victory at 10:36 and gets surprised by the same bug class later.

### Amplifier 5: the long tail — edge recovery is not system recovery

The last mechanism in the timeline is the gap between "services begin to recover" (10:36), "majority recovered" (11:00), and "mitigated" (12:35). This section is analysis, not Fastly's claim: Fastly does not explain the gap in its post. But the shape is familiar from every CDN incident, and it follows from what a CDN *is*.

When the edge stops returning errors, the system is not back to its pre-outage state. During the outage, cached content expired or was bypassed; when traffic returns, a larger-than-normal share of requests misses the cache and goes to origin servers, which then absorb a surge they were not sized for while the edge refills. Error rates can recover while latency stays elevated and origins stay hot, and the operator cannot honestly call the incident mitigated until that second wave settles. The timeline's two-hour tail is consistent with that second phase, and it is the reason the honest recovery metric is "mitigated," not "first service recovered." Any incident report that quotes only the first recovery number is quoting the beginning of recovery as if it were the end.

## What Fastly changed — and the limits of each change

Fastly's post lists its short-term actions and its longer-term direction. Read each against the mechanism above, including what it does not fix:

1. **Deploy the permanent bug fix across the network.** Began 17:25 on June 8. Removes *this* bug. It does not remove the class: the next latent bug in shared code, triggered by the next untested config combination, is unaffected by fixing this one. A bug fix is a patch to an instance, not a control on the class.
2. **Conduct a complete postmortem of processes and practices, and figure out why QA did not detect the bug.** This is the right investigation, and its target is the amplifier-2 problem: testing code paths is not testing the config cross product. Note the boundary: the June 8 post *promises* this investigation; it does not publish its findings. A reader in 2026 cannot verify from this post what QA changed, because the post is the incident summary, not the follow-up.
3. **Evaluate ways to improve remediation time.** This targets the amplifier-3 gap: the forty minutes from detection to identification, and the machinery (config-change attribution, suspect-config testing) that determines it. Faster remediation does not prevent the next trigger; it bounds how long the next trigger burns.
4. **Build greater resiliency from the ground up on WebAssembly and Compute@Edge isolation.** This is the structural bet, and it deserves a precise reading. Isolation contains *execution faults*: if one tenant's code runs in its own WebAssembly sandbox, a fault in that tenant's code cannot crash the shared process or corrupt a neighbor's state. That is a real containment improvement over a shared-process model. What it does *not* by itself fix is the June 8 shape: a bug in the platform's own handling of configuration, below or beside the tenant sandbox, with a global distribution channel. Isolation bounds tenant-versus-tenant damage. It does not bound platform-versus-everyone damage, and it does not solve config-combination testing or attribution speed. Fastly's phrasing is careful — "build greater resiliency," not "prevent recurrence" — and the article keeps that care.

Read as a set, the remediation is honest about its shape: fix the instance, investigate the testing gap, shorten the next recovery, and invest in containment for a related but distinct fault class. What is missing, relative to the Cloudflare postmortem in this series, is a control aimed directly at the config blast radius itself — staging config changes, canarying a config to a subset of POPs before global effect, or scoping a single customer's config so its failure cannot propagate through shared code. Fastly's post does not mention any of these, and this article does not attribute them to Fastly. They are the obvious next questions for any operator running the same architecture, and they are listed here as questions, not as Fastly's commitments.

## Lessons worth stealing

1. **In a multi-tenant system, the blast radius is defined by shared code, not by tenant boundaries.** If all tenants flow through one interpreter, one validator, or one config handler, a bug there is a global bug with a per-tenant trigger. Audit your shared paths first; they are where one customer's accident becomes everyone's outage.
2. **Valid input is the dangerous input class.** Malformed input gets rejected by guards built for it. Valid input that a platform bug mishandles passes every gate, because the gates judge the input and the input is fine. Your testing has to cover platform behavior on valid-but-unusual combinations, not just rejection of invalid ones.
3. **A latent bug's quiet period proves nothing.** 27 days of correct behavior is not 27 days of evidence of safety; it is 27 days in which the triggering combination did not occur. Treat "it has run fine for weeks" as no information about combinatorial coverage, and say so explicitly when someone cites it.
4. **Detection speed and attribution speed are different budgets — measure both.** One minute to detect and forty to attribute is a normal shape for a global symptom, and the forty is the number that determines outage length. If you only dashboard detection time, you are measuring the easy half. Instrument config-change attribution: timestamped, queryable, testable without production pushes.
5. **Mitigation by removing input is fast and incomplete — label it as such.** Disabling a config, a rule, or a feature restores availability by shrinking capability. Report it as mitigation, keep the bug open, and do not let the recovery timestamp swallow the fix timestamp.
6. **Recovery has two phases; quote the second one.** Edge-up is not system-up. Cache refill, origin surge, and the long tail to "mitigated" are part of the incident, and quoting only the first recovery number understates the outage to everyone downstream of you.
7. **Isolation contains tenants; it does not contain the platform.** WebAssembly sandboxes, process separation, and per-tenant workers are real defenses against noisy-neighbor execution faults. They do not fix bugs in the platform layer that interprets tenant input, and they do not fix global distribution of that input. Name which layer each defense protects before claiming coverage.

## What the postmortem does not say

This section is the article's honesty ledger, and it is longer than usual because Fastly's post is shorter than usual. The post does not disclose: what the bug was (no code, no fault description beyond "software bug"); what the customer configuration contained; which customer pushed it; how many customers or requests were affected (only the 85% network figure); why QA missed it (promised as a future investigation, findings not in this post); or whether the promised follow-up actions were completed (the post's fix ETAs are a deployment start time, not a completion confirmation). Contemporary reporting filled some gaps with user-visible detail — the error pages, the list of well-known affected sites — but this article's discipline is primary sources, so those details are not presented here as established fact; the Fastly numbers above are the whole quantitative record this article relies on.

The contrast with Incident Recap #2 is the point, not a complaint. Cloudflare published the offending regex, counted its evaluation steps, listed eleven converging causes, and dated its fixes. Fastly published a timeline, two percentages, an apology, and a direction. Both posts are honest; they are honest at different depths, and the depth difference itself is information. A postmortem's depth determines how much the rest of the industry can learn from it. Fastly's teaches the architecture lesson — shared code, global config, attribution time — with unusual clarity. It does not teach the bug lesson, because the bug is not in it. A reader who wants the second lesson will not find it here, and this article would rather say that than invent it.

There is one more thing worth saying about the post, because it is the reason the incident is remembered fondly in engineering circles despite its severity. Rockwell's closing line — "Even though there were specific conditions that triggered this outage, we should have anticipated it" — refuses the most tempting sentence in incident writing: *the conditions were specific, so the outage was unforeseeable.* Specificity of trigger is not unforeseeability of class. Every latent-bug outage has specific conditions; that is what "latent" means. The sentence is the whole lesson in one line: you do not get to call a failure unforeseeable because you can describe, after the fact, the exact combination that caused it. If the combination space is combinatorial and your testing does not cover it, the class was foreseeable even when the instance was not. That is the standard this series will hold every postmortem to, including Fastly's own.

## Sources

- Nick Rockwell, "Summary of June 8 outage," Fastly Blog, June 8, 2021. https://www.fastly.com/blog/summary-of-june-8-outage — primary source for everything quantitative in this article unless noted: the May 12 deployment introducing the bug, the June 8 valid customer configuration change, the 85% of the network returning errors, detection within one minute, the full UTC timeline (09:47 onset, 09:48 detection, 09:58 status post, 10:27 configuration identified, 10:36 recovery beginning, 11:00 majority recovered, 12:35 mitigated, 12:44 status resolved, 17:25 fix deployment beginning), the "within 49 minutes, 95% of our network was operating as normal" claim, the short-term actions, the WebAssembly / Compute@Edge isolation direction, and the closing "we should have anticipated it" line. Fastly's status post of 09:58 UTC is referenced by the blog; the status incident page itself was not retrievable at research time, so no claim in this article depends on it.
- Sections labeled as analysis — the fate-sharing mechanism, the combinatorial account of the 27-day dormancy, the detection-versus-attribution asymmetry, the input-removal account of mitigation, the cache-refill account of the recovery tail, and the boundary drawn around WebAssembly isolation — are the author's reasoning from the blog's facts and from standard CDN architecture, not Fastly's statements. Where Fastly is silent (the bug's internals, the configuration's contents, affected-customer counts, QA findings), the article says so rather than filling the gap.
