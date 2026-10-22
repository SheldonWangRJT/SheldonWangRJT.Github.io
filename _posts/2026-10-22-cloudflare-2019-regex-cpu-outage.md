---
layout: single
title: "One Regex, 82% of Traffic Gone: How Cloudflare's 2019 Backtracking Outage Burned Every CPU on Its Network"
description: "On July 2, 2019, a single Web Application Firewall rule containing a backtracking regular expression was deployed globally in seconds. Within minutes every CPU core serving HTTP traffic on Cloudflare's network was near 100 percent, traffic fell 82 percent at its worst, and customers worldwide saw 502 errors for 27 minutes. The regex was the trigger, not the cause: a removed CPU guard, a test suite that measured correctness instead of cost, and an emergency-speed deployment lane used for a routine change did the rest."
date: 2026-10-22 08:00:00 -0700
categories:
  - Backend Infra
tags:
  - Incident Recap
  - Cloudflare
  - WAF
  - regex
  - outage
excerpt: "One WAF rule, deployed globally in seconds, pushed every HTTP-serving CPU on Cloudflare's network toward 100 percent. Traffic fell 82 percent at its worst, for 27 minutes, because a backtracking regex met a removed guard and a deployment lane with no stages."
---

> [中文版 Chinese version](/backend%20infra/cloudflare-2019-regex-cpu-outage-zh/)

Here is the number: at its worst, **traffic through Cloudflare fell by 82 percent**. Not for one customer, not in one region — across a network spanning more than 180 cities, for 27 minutes, on July 2, 2019. Visitors to Cloudflare-fronted sites got a 502 error page instead of the site they wanted. Cloudflare had not had a global outage in six years.

The trigger was one regular expression inside one new Web Application Firewall rule. No attack, no hardware failure, no traffic spike caused it — Cloudflare's same-day post is explicit that this was not an attack. A routine change, made correctly according to the process that existed at the time, went global in seconds and then consumed, on every machine at once, the one resource every request needs: CPU.

This is the second entry in the 🔥 Incident Recap series. The Cloudflare postmortem, published ten days later by John Graham-Cumming, is unusually honest about something most postmortems avoid: it refuses a single root cause and instead lists **eleven converging vulnerabilities**. That list is the real story. The regex explains how CPU was burned. The other ten items explain why nothing — no guard, no test, no rollout stage, no fast rollback — stood between a badly written pattern and the whole internet-facing network.

## Background: a firewall that must move fast, on a network built to move fast

Cloudflare's WAF Managed Rules are a shared shield. A team of engineers constantly writes and updates rules that run on customer traffic at the edge: block this exploit pattern, flag that attack shape, lower false positives. In the 60 days before the outage, that team had handled **476 change requests — roughly one every three hours**. Speed is not a vanity metric here. When a serious vulnerability is disclosed and exploit code appears, the value of a WAF rule decays by the hour. Cloudflare's postmortem gives the example from May 2019: a rule pushed quickly to protect customers against a serious SharePoint vulnerability, ahead of a visible spike in exploitation attempts.

Two pieces of machinery make that speed possible, and both matter for the outage.

First, the delivery system. WAF rules, customer configuration changes and Cloudflare Workers code are distributed by **Quicksilver**, Cloudflare's own globally replicated key-value store, replicated across its more than 180 cities. The numbers from the postmortem: on average Quicksilver distributes about **350 changes per second**, and a change reaches every machine worldwide with a **p99 of 2.29 seconds**. From a dashboard click to global effect takes seconds. That is the product promise — and, on July 2, it was also the blast-radius guarantee. There was no propagation delay in which anyone could notice a problem and stop the next region.

Second, the execution engine. The WAF at the time was written in Lua and matched patterns with **PCRE**, a regular-expression library that uses backtracking and — in Cloudflare's words — had no mechanism to protect against a runaway expression. Hold both facts: patterns run on every relevant request, on the hot path, with no cost ceiling, on an engine whose worst-case cost is not bounded by the length of the input.

The specific change on July 2 was a rule aimed at cross-site scripting attacks, targeting inline JavaScript used in attacks. It was deployed in **simulate mode**: real customer traffic passes through the rule, matches are logged, but nothing is blocked, so the team can measure false-positive and false-negative rates before enforcing it. Simulate mode sounds safe. It is not free. As the postmortem puts it, even in simulate mode the rules actually need to execute — and this rule executed a very expensive pattern against live traffic, everywhere, at once.

## Timeline (all times UTC, July 2, 2019)

| Time (UTC) | Event |
|---|---|
| 13:31 | An engineer merges the pull request containing the rule change, after approval. |
| 13:37 | TeamCity builds the rules and the test suite passes. |
| 13:42 | Deployment begins automatically and the rule goes global. |
| About 13:45 | First PagerDuty page: a synthetic test finds a fault with the WAF, followed rapidly by end-to-end failures, a global traffic-drop alert, widespread 502 errors and CPU-exhaustion reports from PoPs worldwide. |
| 14:00 | The WAF is identified as the cause; an attack is ruled out. Live CPU data and `strace` confirm it. |
| 14:02 | The team decides to use the global terminate mechanism to disable the WAF Managed Rulesets worldwide. |
| 14:07 | After fighting through access problems (below), a team member executes the global WAF termination. |
| 14:09 | CPU and traffic levels are back to expected levels worldwide. |
| 14:52 | After negative and positive tests in a single city, with paying-customer traffic removed from that location, the WAF is re-enabled globally without the bad rule. |

Two notes on sources. Cloudflare's detailed postmortem says the termination was executed at 14:07 and that traffic and CPU were back to normal by 14:09; its same-day post compresses this into a termination that occurred at 14:09. This article follows the detailed postmortem for the sequence and treats 14:09 as the restored point — which is also where the widely cited **27 minutes** (13:42 to 14:09) comes from. The same-day post gives the 82 percent worst-case traffic drop; the detailed post quotes a leader in the room saying the company had lost 80 percent of its traffic. Both are Cloudflare's own numbers, at different precision.

## The cascade: one pattern, five amplifiers

{% mermaid %}
graph TD;
    A["Rule merged at 13:31 UTC"] --> B["Tests pass at 13:37 UTC"];
    B --> C["Global deploy at 13:42 UTC"];
    C --> D["Quicksilver reaches every city in seconds"];
    D --> E["Backtracking regex runs on live traffic"];
    E --> F["HTTP cores near 100 percent CPU"];
    F --> G["Front line servers return 502 errors"];
    G --> H["Traffic falls 82 percent at worst"];
    F --> I["Cloudflare Access also unavailable"];
    I --> J["Control panel access blocked"];
    J --> K["Global terminate executed at 14:07 UTC"];
    K --> L["CPU normal by 14:09 UTC"];
    L --> M["WAF re-enabled at 14:52 UTC"];
{% endmermaid %}

### Amplifier 1: backtracking turns a short string into unbounded work — on the hot path, per request

The offending expression is long, but the postmortem reduces its dangerous core to `` .*.*=.* `` — more precisely, the tail of the real pattern was `.*(?:.*=.*)`. Read it literally: match any number of characters, then any number of characters again, then a literal `=`, then anything.

The mechanism is the split problem. Two adjacent greedy `.*` terms can divide the same input in many different ways: the first can take all of it and the second none, or the first can give back one character, and so on. A backtracking engine tries one split, moves on, and when a later term fails it **goes back and tries the next split**. It does not memoize the failures. It re-walks them.

Cloudflare counted the steps, and the counts are the whole lesson:

- Matching `x=x` against `.*.*=.*` takes **23 steps** — for a three-character string.
- Matching `x=` followed by 20 copies of `x` takes **555 steps**.
- If the string is just 20 copies of `x`, with no `=` at all, the engine takes **4,067 steps** to conclude there is no match.
- Add a trailing semicolon to the pattern, giving `.*.*=.*;` — an easy thing to write if you want to match `foo=bar;` — and a failing match for that same 22-character string takes **5,353 steps**.

The growth is super-linear in input length, and the failing cases are the expensive ones, because the engine must exhaust every split before it can give up. Now place that cost where Cloudflare placed it: inside a WAF rule that executes against real request data, on every HTTP and HTTPS request the network serves, in simulate mode as well as blocking mode. An attacker does not need to craft this load. Ordinary traffic contains plenty of strings long enough, and non-matching enough, to make individual evaluations expensive, and the evaluations never stop arriving. Each request that enters the pattern holds a CPU core far longer than it should; cores saturate toward 100 percent; requests queue behind work that is mostly the engine re-trying splits that already failed.

That is why the visible symptom was 502, not slowness. The postmortem is precise: the 502 errors were generated by front-line Cloudflare web servers that **still had CPU cores available** but were unable to reach the processes that serve HTTP and HTTPS traffic. The serving processes were not crashed. They were busy — mathematically busy, doing provably useless work. A system does not need to be down to be unavailable; it only needs its shared bottleneck resource to be consumed by work that does not terminate quickly.

What actually fixes this mechanism, and what does it not fix? A **linear-time engine** — Cloudflare committed to switching to RE2 or the Rust regex crate, both of which have runtime guarantees — attacks the root: instead of trying splits sequentially, a Thompson-style NFA simulation tracks many possible states at once, so matching time grows linearly with input length (Ken Thompson described the approach in a 1968 paper the appendix cites). That removes catastrophic backtracking for the patterns those engines support. It does **not** make every rule cheap: a linear engine still charges you per character per rule, thousands of rules still add up, and engines with guarantees typically give up some backtracking-only features such as backreferences — some patterns must be rewritten, not just recompiled. A **per-rule CPU budget**, the second fix, is complementary: it does not make the pattern fast, it makes its worst case survivable by cutting it off. Either fix alone leaves a hole the other covers.

### Amplifier 2: the CPU guard existed — and a refactoring removed it weeks earlier

Buried in the eleven-item list is the most quietly damning fact in the postmortem: **a protection that would have helped prevent excessive CPU use by a regular expression had been removed by mistake during a refactoring of the WAF weeks prior — a refactoring that was itself part of making the WAF use less CPU.**

Unpack the mechanism. The system was not designed without a guard. It had one, and then an unrelated-looking change — a cleanup aimed at efficiency — deleted it, and nothing noticed. No test failed, because no test was asserting the guard's presence or effect. No alert fired, because the guard's absence is silent until the day a runaway pattern arrives. This is a specific and common failure shape: **safety mechanisms are code too, and they regress like code**, but unlike a feature regression, a guard regression has no user-visible symptom in normal operation. It is invisible precisely when everything is healthy.

The fix is not "do not refactor." It is to treat guardrails as tested behavior: a test suite should include a known-bad, known-expensive pattern and assert that the system sheds or limits it, so that removing the guard turns a build red. Note the boundary: such a test protects the guard you remembered to test. It does not invent guards for failure modes nobody has imagined yet — which is why it has to be paired with the cost ceiling and the staged rollout below, not substituted for them.

### Amplifier 3: the test suite measured correctness, and the outage was a cost failure

The process, up to deployment, was followed correctly — the postmortem stresses this. A pull request was raised and approved; CI built the code and tested it; a Change Request was generated with a standard operating procedure, a deployment plan and a rollback plan. At 13:31 the PR merged. At 13:37 TeamCity built the rules and ran the tests, green. At 13:42 the change deployed automatically.

What did green mean? The WAF test suite tested that core WAF functionality works: unit tests for individual matching functions, then a huge collection of HTTP requests designed to check that attacks are **blocked** and legitimate requests are **let through**. What it did not do, in Cloudflare's words, was test for runaway CPU utilization by the WAF. Worse, examining logs from previous WAF builds showed **no increase in test-suite run time** with the new rule — the test corpus simply did not contain inputs that pushed this pattern into its expensive region, so even an informal "did the suite get slower" signal stayed flat.

This is a measurement-scope failure, not a diligence failure. The suite answered the questions it was built to answer — does the rule catch the right things, does it over-block — correctly. The outage lived in a question nobody had instrumented: **what does this rule cost, per request, in the worst case?** A rule can be perfectly correct and still be an outage, because correctness and cost are independent properties and production punishes whichever one you did not test. Cloudflare's fix — performance profiling for all rules in the test suite — closes exactly this gap, with one honest boundary: profiling catches expensive patterns **that your test inputs exercise**. Adversarial and accidental worst cases that no test input resembles can still slip through, which is again why the runtime CPU ceiling matters: tests reduce how often you need the ceiling; the ceiling bounds the damage when tests miss.

### Amplifier 4: a routine change was allowed to use the emergency lane — global, in one go, in seconds

Cloudflare knew how to stage a rollout. Its normal software process, described in detail in the postmortem, is a model of the form: build and test, generate a Change Request, get approval, then deploy to the **animal PoPs** — DOG, an internal-only PoP used by employees; then PIG, a PoP carrying a small subset of non-paying customer traffic; then three Canary PoPs around the world carrying paying and non-paying traffic — and only then, globally. The whole sequence can take hours or days.

WAF rules, by design, did not use that process, because of the need to respond rapidly to threats. The SOP for a rule change **specifically allowed it to be pushed globally**. And Quicksilver made global mean seconds: p99 2.29 seconds to every machine on Earth.

Now combine the three facts. The change was **non-emergency** — an XSS detection improvement, deployed in simulate mode to measure it — but it traveled in the **emergency lane**, with emergency speed and emergency blast radius, because the lane was defined by change *type* (a WAF rule) rather than by change *urgency*. There was no DOG stage where employee traffic would have burned first and paged the team while customers were untouched. There was no canary city where CPU would have spiked on a fraction of traffic and the deploy could have halted. The staged machinery existed in the same building, for the same network, and this class of change was exempt from it.

Cloudflare's fix keeps the tradeoff explicit rather than pretending it away: staged rollouts for rules, in the same manner as other software, **while retaining the ability to do emergency global deployment for active attacks**. That retention matters. The lesson is not "never go global fast" — during an active exploitation wave, slow is also a failure. The lesson is that the fast lane must be **gated by urgency, not by category**, and entering it should be a conscious, logged decision, because its blast radius is the entire network in about two seconds.

There was one more accelerant. The rollback plan required **running the complete WAF build twice**, which took too long — so the documented way back was not the way back used. What actually recovered the service was not a rollback at all. It was the global terminate switch, which brings us to the last amplifier.

### Amplifier 5: the kill switch worked, but reaching it ran through the fire

At 14:00 the WAF was identified as the cause. At 14:02 the team proposed the global terminate — a mechanism built into Cloudflare to disable a single component worldwide. Executed, it worked essentially instantly: CPU dropped, traffic recovered by 14:09, and the rest of Cloudflare's protection mechanisms continued to operate.

Getting to it took five minutes that the timeline should not hide. Cloudflare uses its own products, and its **Access** service was down with everything else, so the team could not authenticate to its internal control panel. Some team members, once access was restored, discovered they had lost access anyway, because a security feature disables credentials that are not used frequently enough. Internal services such as Jira and the build system were also unreachable, and reaching them required a **bypass mechanism that was not frequently used** — the postmortem adds, pointedly, that this was another thing to drill on after the event. Customers hit the same wall from the outside: the Cloudflare Dashboard and API were unavailable because **they pass through the Cloudflare edge** — the thing that was down.

This is the same recovery-coupling shape as the Meta BGP outage covered in Incident Recap #1, in a different costume: the control path shares fate with the data path it controls. Authentication, internal tooling, the customer control plane and the bypass procedure all depended, directly or through disuse, on the network they were supposed to rescue. The terminate switch itself was well designed — a single component, disabled globally, with the rest of the protections left running. What failed was everything around the switch: identity, access and rehearsal.

The fixes Cloudflare listed map one-to-one onto that diagnosis: an emergency ability to take the Dashboard and API **off Cloudflare's own edge**, and — implicitly, in the "drill on it" admission — rehearsing the bypass until it is boring. Note what a terminate switch does **not** fix: it restores service by removing a protection. From 14:07 until the WAF was safely re-enabled at 14:52, the network ran without the Managed Rulesets. A kill switch buys time and availability at the price of the very protection the component exists to provide; it is a tourniquet, not a cure, and the 45 minutes of testing in a single city before re-enabling is what a responsible tourniquet release looks like.

## What Cloudflare changed — and the limits of each change

The postmortem's remediation list, with status as published on July 12, 2019:

1. **Re-introduce the excessive-CPU protection that was removed.** Done at publication. Bounds a runaway rule, but only as well as its threshold and its own resistance to being refactored away again.
2. **Manually inspect all 3,868 rules** in the WAF Managed Rules for other backtracking risks. Inspection complete at publication. Necessary, and inherently one-off: it cleans the existing corpus, it does not govern the next rule.
3. **Add performance profiling for all rules to the test suite.** ETA July 19, 2019. Moves cost from unmeasured to measured — for inputs the suite exercises.
4. **Switch to RE2 or the Rust regex engine**, both with runtime guarantees. ETA July 31, 2019. Removes catastrophic backtracking structurally, at the price of rewriting patterns that relied on backtracking-only features.
5. **Stage rule rollouts like other software**, retaining emergency global deployment for active attacks. Changes the default blast radius from "everywhere in seconds" to "one PoP, then a few, then everywhere" — while deliberately keeping the dangerous lane available, gated by urgency.
6. **An emergency path to take the Dashboard and API off the edge**, plus **automating status-page updates**. The first decouples the customer control plane from the failing data plane; the second addresses two quieter items on the eleven-cause list — the first global-traffic-drop alert fired too slowly, and the status page was not updated quickly enough.
7. **Longer term: port the WAF off the Lua implementation** to the new firewall engine, for speed and another layer of protection.

Read as a set, the fixes are defense in depth done correctly: engine guarantees bound the pattern, a CPU ceiling bounds the rule, profiling bounds what ships, staging bounds where it ships, and a decoupled control plane bounds how long recovery takes. No single item claims to prevent recurrence alone — which is exactly right, because the outage was not a single failure.

## Lessons worth stealing

1. **Cost is a correctness property on the hot path.** A pattern, query or rule that returns the right answer too slowly is wrong in production. Test worst-case cost — with inputs designed to be hostile to the implementation, not just representative of traffic — or accept that production will run that test for you.
2. **Guardrails regress silently; test the guard, not just the system.** If a CPU ceiling, a rate limit or a circuit breaker matters, your suite needs a case that goes red when it is removed. A refactoring that "only cleans up" is precisely the change most likely to delete a guard nobody remembered.
3. **Deployment speed is blast radius.** A system that propagates a change to every machine in 2.29 seconds has also decided that a bad change is everywhere in 2.29 seconds. Speed is a feature for the changes you want and a multiplier for the ones you do not — so the rollout needs stages even when, especially when, propagation does not.
4. **Gate the fast lane by urgency, not by category.** "WAF rules go global" was a category rule that let a non-emergency, simulate-mode measurement change take the emergency path. Keep the emergency lane; make entering it a deliberate decision with a name attached.
5. **Simulate mode is still production execution.** Any mode that runs real code against real traffic spends real CPU, real memory and real tail latency. "It does not block anything" limits one kind of harm — wrong decisions — and none of the resource harm.
6. **The kill switch is only as good as the path to it.** A global terminate that works in seconds still cost five minutes because authentication, internal tools and the bypass all shared fate with the outage or with disuse. Build the switch, decouple its access path, and drill the bypass until it is routine — an unrehearsed bypass is a rumor, not a procedure.
7. **Prefer engines with guarantees for untrusted-pattern work.** Where patterns are written quickly, by many hands, against arbitrary input, a backtracking engine makes every author one `.*.*` away from an outage. A linear-time engine removes a whole failure class structurally instead of relying on every author never making that mistake.

## What the postmortem does not say

Cloudflare's detailed postmortem is one of the strongest public examples of the genre — it publishes the offending regex, counts its steps, lists eleven contributing causes and dates its fixes. Its limits are worth naming anyway. It does not quantify customer impact beyond the traffic drop and the 502 window: no count of affected customers or requests, and no revenue or SLA-credit figure. It does not explain how the CPU protection came to be removed beyond "by mistake during a refactoring," or why review and tests did not catch that removal — the mechanism of the guard's disappearance is asserted, not reconstructed. And its fix ETAs (July 19 and July 31, 2019) are stated as plans in a post published July 12; the post itself does not confirm their completion. As with the Meta postmortem in this series, weight the mechanism evidence — which here is exceptionally strong — separately from the remediation promises.

There is a final, almost literary detail the postmortem opens with. Its author, John Graham-Cumming, had been a Cloudflare *customer* during the company's 2010 outage, and had written to its CEO demanding to know where his DNS had gone — receiving, and praising, a long and transparent technical reply. Nine years later he was the employee writing the transparent post. The through-line is the actual product lesson underneath all the mechanism talk: the companies whose postmortems you can learn this much from are the ones that decided, in advance and in writing, that this is how they explain themselves. That decision, like a staged rollout or a tested guardrail, has to be made before the day it is needed.

## Sources

- John Graham-Cumming, "Details of the Cloudflare outage on July 2, 2019," Cloudflare Blog, July 12, 2019. https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/ — primary source for everything above unless noted: the timeline from 13:42 deployment through 14:07 termination and 14:52 re-enablement, the offending regular expression and the step counts (23 steps for `x=x`; 555 for `x=` plus 20 `x` characters; 4,067 for a non-matching 20-character string; 5,353 for the failing semicolon variant), the Quicksilver figures (more than 180 cities, about 350 changes per second, p99 2.29 seconds), the 476 change requests in 60 days, the simulate-mode execution detail, the DOG / PIG / Canary software process versus the global WAF SOP, the eleven converging causes including the CPU protection removed during refactoring, the Access and credential obstacles to the global terminate, the 3,868-rule inspection, and the dated remediation list.
- Matthew Prince, "Cloudflare outage caused by bad software deploy (updated)," Cloudflare Blog, July 2, 2019. https://blog.cloudflare.com/cloudflare-outage/ — same-day primary source: the outage starting at 1342 UTC, the confirmation that it was not an attack, the worst-case traffic drop of 82 percent, the decision at 1402 UTC to issue a global termination on the WAF Managed Rulesets, and the re-enablement at 1452 UTC after review and testing of the rollback. Where the same-day post and the detailed postmortem compress the 14:07–14:09 termination window differently, this article follows the detailed postmortem and says so in the timeline notes.
