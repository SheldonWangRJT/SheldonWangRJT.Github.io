---
layout: single
title: "The Control Plane Ate Itself: How a Scaling Job and a Broken Backoff Took Down AWS us-east-1 for Seven Hours"
description: "On December 7, 2021, an automated capacity-scaling activity triggered a surge of connection attempts inside AWS's internal network that overwhelmed the NAT devices linking it to the main AWS network. Retries amplified the congestion, the failure blinded AWS's own monitoring, and recovery took until 2:22 PM PST — not because the fix was unknown, but because the deployment systems needed to apply it were themselves behind the congestion. The data plane never went down; the control plane did, and that distinction decided everything that followed."
date: 2026-11-05 08:00:00 -0800
categories:
  - Backend Infra
tags:
  - Incident Recap
  - AWS
  - us-east-1
  - outage
  - networking
  - control plane
excerpt: "At 7:30 AM PST on December 7, 2021, an automated scaling job triggered a connection surge that overwhelmed the network devices between AWS's internal network and its main network. Retries turned congestion into a self-sustaining storm, the outage blinded AWS's own monitoring, and the devices did not fully recover until 2:22 PM — while the data plane, and every running EC2 instance, never went down at all."
---

> [中文版 Chinese version](/backend%20infra/aws-us-east-1-2021-network-congestion-outage-zh/)

This is the fourth entry in the 🔥 Incident Recap series.

Start with the number that frames the whole incident: **6 hours 52 minutes**. That is the gap between 7:30 AM PST, when an automated capacity-scaling activity triggered the event, and 2:22 PM PST, when the networking devices at the heart of it fully recovered. But the number that matters more is a different one: **zero**. Zero running EC2 instances went down. Zero S3 objects became unreachable through the normal data path. Zero DynamoDB tables stopped serving. The largest cloud outage of 2021 did not take down the cloud. It took down the machinery that *manages* the cloud — and then, because that machinery includes the tools AWS uses to see and fix itself, it took down AWS's ability to respond to its own outage.

That is the shape of this incident, and it is why it belongs in this series. The Meta BGP outage (entry #1) locked engineers out of their own data centers. The Cloudflare regex outage (entry #2) was a single bad pattern amplified by eleven converging causes. The Fastly outage (entry #3) was one valid config change waking a latent bug in shared code. This one is a fourth shape: a feedback loop that fed on itself, in a network whose job was to connect the two halves of AWS — and a guardrail, the clients' retry backoff, that had worked for years and silently failed to engage on exactly this day.

## Background: AWS is two networks, and the bridge between them is load-bearing

The official postmortem, published by AWS on December 10, 2021, opens with an architecture fact most AWS customers never need to know. The majority of AWS services, and all customer applications, run in the **main AWS network**. But AWS also runs an **internal network** that hosts foundational services: monitoring, internal DNS, authorization services, and parts of the EC2 control plane. The two networks are connected by multiple geographically isolated networking devices that provide additional routing and network address translation (NAT), so services can communicate between the internal network and the main network.

Three properties of that design decide everything that follows.

First, **the internal network is foundational, not auxiliary**. Internal DNS is the phone book every service consults. Authorization is the gate every control-plane call passes through. Monitoring is the eyes of the operations team. The EC2 control plane is the machinery that creates, describes, and terminates instances. These are not services that can be degraded gracefully for a few hours; they are services other services assume are always there.

Second, **the bridge is a shared, finite resource**. The NAT and routing devices between the two networks have a capacity, and every cross-network connection consumes some of it. AWS says it scales that capacity significantly and uses multiple geographically isolated devices — that is real redundancy, and it matters for the story, because the outage was not a single device failing. It was the *aggregate* connection load exceeding what the devices could handle. Redundancy across devices does not help when the load itself is the problem and it is spread across all of them.

Third, **the internal network's clients are numerous and automated**. The "large number of clients inside the internal network" in AWS's account are not people at keyboards. They are services, agents, and control-plane components that open connections to the main network constantly, as part of their normal operation. When something changes their connection behavior, the change is not one client misbehaving — it is a population shifting at once.

Hold those three facts and the incident reads as an almost mechanical consequence of its trigger.

## Timeline (all times PST, December 7, 2021)

| Time (PST) | Event |
|---|---|
| 7:30 AM | An automated activity to scale capacity of one of the AWS services hosted in the main AWS network triggers unexpected behavior from a large number of clients inside the internal network. A surge of connection activity overwhelms the networking devices between the internal network and the main AWS network. |
| 7:30–7:33 AM | Route 53 APIs become impaired. EC2 APIs begin showing increased error rates and latencies at 7:33 AM. Support Contact Center case creation is impaired from 7:33 AM. |
| 7:30 AM onward | Congestion immediately impacts real-time monitoring data for AWS's internal operations teams. Operators lose visibility and fall back to logs. |
| 8:22 AM | AWS is able to start updating the Service Health Dashboard, after the congestion had impaired its failover to the standby region. |
| 9:28 AM | Teams complete moving internal DNS traffic away from the congested network paths. DNS resolution errors fully recover. Several impacted services improve, but congestion is not resolved and monitoring is still not visible to operators. |
| 12:35 PM | During mitigation, operators disable event delivery for EventBridge to reduce load on the affected network devices. |
| 1:15 PM | EC2 API error rates and latencies begin to improve as congestion eases. |
| 1:34 PM | Congestion significantly improves. |
| 1:35 PM | API Gateway begins seeing recovery; most container-related API error rates return to normal. |
| 2:22 PM | All network devices fully recover. Console access fully restored. |
| 2:25 PM | Support Contact Center case creation recovers. |
| 2:30 PM | Route 53 APIs recover. |
| 2:35 PM | EventBridge event delivery re-enabled. |
| 2:40 PM | Launches of new EC2 instances recover — the last EC2 API capability to come back. |
| 4:28 PM | STS fully recovers. |
| 4:37 PM | API Gateway largely recovers. |
| 4:41 PM | Amazon Connect resumes normal operations. |
| 5:00 PM | Fargate API error rates begin returning to normal. |
| 6:40 PM | EventBridge elevated event-delivery latency ends as the backlog is processed. |

Two notes on reading this table, because the postmortem's numbers reward care. First, "network devices fully recovered at 2:22 PM" and "the incident was over at 2:22 PM" are not the same claim. STS did not fully recover until 4:28 PM, API Gateway until 4:37 PM, and EventBridge was still chewing through its backlog until 6:40 PM. The network recovered at 2:22; the *services* recovered over the following four hours, each on its own tail. Second, the 9:28 AM DNS milestone is the most commonly misread timestamp in the incident. DNS errors fully recovered at 9:28 — and congestion did not. A reader who stops at 9:28 has the story backwards: the DNS move was the first successful mitigation, not the end of the incident.

## The cascade: a scaling job, a surge, and a loop that fed itself

{% mermaid %}
graph TD;
    A["Automated scaling activity in main network"] -->|"triggers unexpected behavior"| B["Many internal-network clients change behavior"];
    B -->|"surge of new connections"| C["NAT and routing devices overwhelmed"];
    C -->|"delays and errors between networks"| D["Services retry and open more connections"];
    D -->|"more load on the same devices"| C;
    C -->|"monitoring data stops flowing"| E["Operators lose real-time visibility"];
    E -->|"diagnosis falls back to logs"| F["DNS errors identified as a large traffic class"];
    F -->|"DNS traffic moved off congested paths"| G["DNS errors recover at 9:28 AM"];
    G -->|"load reduced but loop continues"| C;
    C -->|"top sources isolated and heavy services disabled"| H["Congestion improves at 1:34 PM"];
    H -->|"devices fully recover"| I["All network devices recovered at 2:22 PM"];
{% endmermaid %}

The diagram has a loop in it, and the loop is the incident. Everything else is a consequence of the loop, or an attempt to break it.

## Mechanism 1: retry amplification — congestion that manufactures its own load

The postmortem's causal sentence is worth quoting in full, because it contains the whole mechanism: *"This resulted in a large surge of connection activity that overwhelmed the networking devices between the internal network and the main AWS network, resulting in delays for communication between these networks. These delays increased latency and errors for services communicating between these networks, resulting in even more connection attempts and retries. This led to persistent congestion and performance issues on the devices connecting the two networks."*

Unpack the loop step by step, because each step is a distinct failure of a distinct assumption.

**Step one: the surge.** An automated scaling activity — AWS does not say which service was being scaled — triggered "unexpected behavior from a large number of clients inside the internal network." The surge is in *connection activity*, not in bytes. That distinction matters. NAT devices do connection tracking: each new connection consumes state on the device. A surge of new connections is the most expensive possible kind of load for a NAT device, because it is not just throughput — it is state creation, at a rate the device's tables and processors were not sized for. The devices were "overwhelmed," in AWS's word, by the rate of new connections, not by the volume of data flowing through established ones.

**Step two: delay becomes error.** Once the devices are overwhelmed, communication between the networks slows down and starts failing. A service in the main network calls internal DNS, or an authorization service, or a control-plane API — and the call is slow, or it times out, or it errors. From the caller's point of view, the dependency is not answering.

**Step three: the caller retries — and retries are new connections.** This is the step that converts a surge into a storm. A well-behaved client that gets an error retries. A client whose connection attempt timed out opens a *new* connection to retry. Every retry adds load to exactly the devices that are already overwhelmed, which makes the next attempt more likely to fail, which produces more retries. The offered load is no longer the original surge plus normal traffic; it is the original surge plus normal traffic plus the retry traffic generated by the failures, growing as long as the failure rate stays high. The system is now manufacturing its own load. That is why the congestion was *persistent*: it was not a spike that passed, it was a new equilibrium, held in place by the retry loop. As long as clients kept retrying faster than the devices could drain the queue, the congestion sustained itself.

**What breaks the loop.** Two things, and only two: reduce the offered load, or increase the capacity to drain it. AWS did both, slowly, over hours — isolating the top sources of traffic to dedicated network devices (shedding load from the shared devices), disabling some heavy network traffic services (shedding load outright), and bringing additional networking capacity online (increasing drain). The DNS move at 9:28 AM was the first load-shedding step: internal DNS was a large traffic class, and moving it off the congested paths removed a chunk of offered load. It helped several services. It did not break the loop, because the remaining load — the retry traffic from everything else — was still above what the devices could drain.

**What does not break the loop.** Adding capacity alone, without load shedding, is a race against the retry amplifier: every unit of new capacity can be consumed by retries as fast as it appears, because retries are generated by failure, and failure persists until the queue drains. And waiting it out does not work either, because the loop is self-sustaining — the load does not decay on its own while the failure rate stays high. The loop has to be actively broken, by removing load or by stopping the retries. This is the same lesson as the Cloudflare and Fastly incidents in this series, in a different costume: a system whose failure mode increases its own load will not recover by itself.

## Mechanism 2: the backoff that did not back off — a latent bug in a years-old code path

The most important paragraph in the postmortem is the one about prevention, and it is also the most carefully worded. AWS writes that its networking clients *"have well tested request back-off behaviors that are designed to allow our systems to recover from these sorts of congestion events, but, a latent issue prevented these clients from adequately backing off during this event. This code path has been in production for many years but the automated scaling activity triggered a previously unobserved behavior."*

Read that precisely, because it is a three-part claim.

**The guardrail existed and was tested.** Backoff — waiting longer between retries when failures pile up, instead of hammering the failing dependency — is the standard defense against exactly the retry-amplification loop described above. AWS says its clients' backoff behaviors are "well tested." That is not marketing language in context; it is the statement that makes the next clause a surprise rather than a negligence finding. The defense was real, and it had worked.

**The guardrail had a latent hole, and this trigger found it.** A "latent issue" in a code path that "has been in production for many years" prevented the clients from "adequately backing off." The scaling activity "triggered a previously unobserved behavior" — a behavior of the clients, in response to the scaling event, that no previous congestion event had produced. Put together: the backoff logic handled the failure modes it had been tested against, and the scaling trigger put the clients into a state the backoff logic did not recognize as a backoff situation — most plausibly a state in which the clients kept opening *new* connections (the "unexpected behavior" and the "large surge of connection activity") rather than retrying existing requests in a way backoff could throttle. Backoff throttles retries of requests; it does not necessarily throttle the creation of new connections by a client population that has been triggered into a new behavior. If the failure mode is "clients open connections at a rate the devices cannot track," a per-request backoff timer is the wrong-shaped defense, and it fails open.

**The boundary AWS draws, and the one it does not.** AWS says it is "developing a fix for this issue" and expects to deploy it "over the next two weeks," and that it has "also deployed additional network configuration that protects potentially impacted networking devices even in the face of a similar congestion event." Two distinct remediations, and the distinction is the mechanism lesson. The code fix addresses the latent backoff hole — the clients will back off in this situation next time. The network configuration protects the devices *even if* a similar congestion event recurs — a device-side defense that does not depend on client behavior being correct. The second one is the more interesting of the two, because it is a defense in depth: it assumes clients may misbehave again, and bounds the damage at the device instead of trusting the clients. But note what neither fix does: neither adds a bulkhead between the internal network's clients and the shared NAT devices at the *architectural* level. The fix makes the known hole smaller; it does not remove the shared-fate structure in which one population's connection surge can overwhelm the bridge for everyone. And AWS is explicit that the fix was not yet deployed at publication — the postmortem promises it within two weeks, and the article cannot verify from the postmortem alone that it landed on schedule.

There is also an honesty boundary here that this article will keep visible, as it did for Fastly. AWS never names the service whose scaling activity triggered the event, never describes the latent backoff issue in technical detail, and never gives connection counts or device capacity numbers. The mechanism above — a connection-rate surge overwhelming NAT state, retries amplifying it, backoff failing to engage on a new-connection path — is the author's reconstruction from AWS's own causal sentences and from how NAT devices and backoff behave. It is consistent with every sentence AWS published and contradicts none of them. But the exact bug is not in the postmortem, and this article will not pretend otherwise.

## Mechanism 3: the outage blinded the people fixing it — observability shared fate with the failure

The second loop in this incident is organizational, and it is the reason the first loop burned for seven hours. *"This congestion immediately impacted the availability of real-time monitoring data for our internal operations teams, which impaired their ability to find the source of congestion and resolve it. Operators instead relied on logs to understand what was happening."*

The monitoring system lived in the internal network — the same network whose bridge to the main network was congested. The tool AWS uses to see congestion was itself behind the congestion. This is fate-sharing at the observability layer: the failure took out the instrument that measures the failure. The operators were not blind in the absolute sense — they had logs, and the logs were what identified the elevated internal DNS errors — but logs are a forensic instrument, not a real-time one. They tell you what happened; they do not show you what is happening now, at the rate you need to steer a mitigation. Diagnosis that should have taken minutes took the time it takes to comb logs and correlate by hand.

The DNS move is the payoff of that slow diagnosis, and also its limit. Once the logs showed elevated internal DNS errors, the teams moved internal DNS traffic away from the congested paths, and by 9:28 AM DNS resolution errors fully recovered. But the postmortem is explicit that *"monitoring data was still not visible to our operations team so they had to continue resolving the issue with reduced system visibility."* The DNS fix restored a service; it did not restore observability. The team kept working the rest of the incident — isolating top traffic sources, disabling heavy services, adding capacity — with reduced visibility, which is to say, with less ability to tell whether each action was working.

**Why recovery took seven hours when the DNS fix took two.** The postmortem gives three reasons, and each is a mechanism, not an excuse. First, the monitoring blindness just described: limited ability to understand the problem. Second, *"our internal deployment systems, which run in our internal network, were impacted, which further slowed our remediation efforts"* — the machinery used to deploy fixes and configuration changes was itself behind the congested bridge, so every remediation action was slower to apply than it would have been on a healthy day. The incident damaged the repair tools. Third, *"because many AWS services on the main AWS network and AWS customer applications were still operating normally, we wanted to be extremely deliberate while making changes to avoid impacting functioning workloads"* — the system was half-healthy, and a careless change to the bridge could have taken down the half that was still working. Deliberation was correct; it was also slow. The seven hours are the sum of those three: blind diagnosis, impaired repair tools, and justified caution about a half-healthy system.

**What the communication failure adds.** The same fate-sharing hit the customer-facing side. The congestion impaired the Service Health Dashboard's ability to fail over to its standby region, so AWS could not update the dashboard until 8:22 AM — nearly an hour after onset — and when it did, it used a single global banner, which AWS itself says "makes it difficult for some customers to find information." The Support Contact Center, which also relies on the internal network, could not create cases from 7:33 AM to 2:25 PM. The pattern is the same at every layer: the internal network was a shared dependency of the production systems, the repair systems, and the communication systems, and the incident degraded all three at once. The remediation AWS promises — a new Service Health Dashboard version and "a new support system architecture that actively runs across multiple AWS regions" — is aimed at exactly this: making the communication path independent of the region that is failing.

## What actually broke, service by service — and what did not

The postmortem's service-impact section is the clearest statement of the control-plane/data-plane split, and it is worth reading as a table rather than a narrative, because the pattern is the point.

| Service / capability | Impact | What kept working |
|---|---|---|
| EC2 APIs (launch, describe) | Increased error rates and latencies from 7:33 AM; improving 1:15 PM; new launches recovered 2:40 PM | Running EC2 instances unaffected |
| RDS, EMR, Workspaces | Could not create new resources (blocked on EC2 launches) | Existing resources ran |
| Elastic Load Balancers | Increased provisioning times for new LBs; delayed instance registration | Existing load balancers remained healthy |
| Route 53 APIs | Impaired 7:30 AM–2:30 PM; no DNS changes possible | Existing DNS entries and answers to DNS queries not impacted |
| AWS Console login | Login failures during the event | Fully restored 2:22 PM |
| STS (OIDC third-party IdP) | Elevated latencies; login failures for services using STS, e.g. Redshift | Full recovery 4:28 PM |
| CloudWatch | Monitoring delays; a small amount of monitoring data not captured and may be missing from some metrics | — |
| S3 and DynamoDB (direct) | Not impacted | Data-plane access normal throughout |
| S3 / DynamoDB via VPC Endpoints | Impaired | Direct access unaffected |
| Lambda | APIs and function invocation operated normally throughout | — |
| API Gateway | Increased error rates; servers got into a state needing replacement; recycling blocked until EC2 APIs recovered; largely recovered 4:37 PM, low errors and throttling for hours after | — |
| EventBridge | Elevated errors, improved 9:28 AM; event delivery disabled 12:35 PM, re-enabled 2:35 PM; elevated delivery latency until 6:40 PM on backlog | — |
| Fargate / ECS / EKS | Increased API error rates and latencies; terminated or failed tasks could not restart; most APIs normal 1:35 PM; Fargate API errors normal from 5:00 PM; Insufficient Capacity Errors for 4 vCPU task sizes for hours after | Existing tasks and pods continued operating normally |
| Amazon Connect | Elevated failure rates for calls, chats, tasks; normal operations resumed 4:41 PM | — |

Two patterns deserve emphasis, because they are the transferable lessons.

**The control-plane/data-plane split held — and that is why the outage was survivable.** The data plane is the path that serves traffic: EC2 instances running, S3 serving objects, DynamoDB answering queries, Lambda executing functions, existing load balancers balancing. The control plane is the path that *changes* things: launching instances, creating resources, changing DNS, registering targets, issuing credentials. During the incident, the data plane was essentially fine and the control plane was badly degraded. That split is a deliberate architectural property — the data plane does not depend on the internal network for every request — and it is the reason the outage, for all its breadth, did not take down the internet. But the split was incomplete in one direction that mattered: the control plane depended on the internal network, and the internal network's bridge was a single shared choke point. A cleaner split would have given the control plane its own independent path to its dependencies, or at least a bulkhead so that a connection surge from one client population could not starve the bridge for everyone else.

**Recovery had a dependency loop of its own.** API Gateway is the sharpest example. Its servers "eventually got into a state where they needed to be replaced in order to serve requests successfully," and replacement "normally happens through an automated recycling process, but this was not possible until the EC2 APIs began recovering." The service that needed new instances could not get them, because the service that provisions instances was down. Fargate had the same shape: terminated tasks could not restart until the EC2 control plane recovered, and then the backlog of restarts itself caused elevated error rates and Insufficient Capacity Errors for hours after the network recovered. Recovery from a control-plane outage is not a return to normal; it is a second surge — every queued creation, restart, and registration arriving at once against a system that has just come back. EventBridge's backlog, processed until 6:40 PM, is the same shape in the eventing layer. The incident's tail, from 2:22 PM to 6:40 PM, is the cost of that second surge, and it is why "network devices fully recovered" is not the end of the incident.

## What AWS changed — and the limits of each change

1. **Disabled the triggering scaling activities immediately, and will not resume them until all remediations are deployed.** This is mitigation by removing the input, the same shape as Fastly disabling the triggering configuration. It is fast and it is incomplete: the system is safe only as long as the activity stays off, and the activity is presumably something AWS wants to do again. The postmortem says systems "are scaled adequately so that we do not need to resume these activities in the near-term" — a statement about headroom, not a fix.
2. **Fix the latent backoff issue, expected to deploy within two weeks.** Removes this hole in client backoff. It does not remove the class: the next previously-unobserved client behavior, triggered by the next automation, is unaffected by fixing this one. A backoff fix is a patch to an instance of a failure mode, not a control on the class.
3. **Deploy additional network configuration that protects the impacted networking devices even in a similar congestion event.** This is the device-side defense in depth, and it is the most structurally interesting remediation in the postmortem: it bounds the damage at the device rather than trusting client behavior. What it does not by itself do is add capacity or add a bulkhead — protection against overload is not the same as isolation between client populations, and the postmortem does not describe per-population isolation on the bridge.
4. **New Service Health Dashboard version and a multi-region support system architecture.** Aimed at the communication fate-sharing: the dashboard and the support system should not depend on the region that is failing. This fixes the *communication* failure. It does not fix the internal-network bridge, and it should not be read as doing so.

## Lessons worth stealing

1. **A failure mode that increases its own load will not recover by itself.** Retries are load. When the failure rate rises, retry traffic rises with it, and a system that was merely overloaded becomes self-sustainingly congested. Any retry policy needs a load budget and a backoff that actually engages under the failure modes you have — and you must test the backoff against the failure modes you have *not* seen, because the untested one is the one that will arrive.
2. **Backoff is a guardrail, not a guarantee — and it can fail open silently.** AWS's clients had well-tested backoff, and a latent issue prevented it from engaging. The lesson is not "backoff does not work"; it is that a client-side grace mechanism is only as good as its coverage of the states the client can actually enter. Audit the states, not just the timer values. And put a device-side defense behind the client-side one, because clients will eventually misbehave in a way you did not predict.
3. **Your observability must not share fate with the system it observes.** If your monitoring, your alerting, and your deployment tooling all depend on the same network, the same DNS, or the same control plane as the system that fails, the failure blinds you and disarms your repair tools at the same time. Monitoring and remediation paths need an independent route to the systems they watch — out-of-band, cross-region, or at minimum on a path that cannot be congested by the failure it is meant to detect.
4. **The control-plane/data-plane split is the most valuable bulkhead you have — finish it.** The split is what kept this outage survivable: running workloads never went down. But the control plane's own dependencies were not split with the same care. Map every dependency of your control plane, and ask what happens to each one when the control plane's own network is congested. A control plane that cannot be reached, repaired, or observed during its own outage is a control plane with a single point of failure wearing a redundancy costume.
5. **Recovery has a second surge — plan for it.** Queued launches, restarts, registrations, and backlogged events all arrive at once when the control plane returns. The incident does not end when the root cause is fixed; it ends when the backlog drains. Size your recovery for the backlog, not just for steady state, and expect elevated errors for hours after the headline recovery time.
6. **A half-healthy system constrains its own repair.** When the data plane is still serving traffic, every remediation must be weighed against the risk of breaking what still works. That deliberation is correct and it is slow. The way to buy speed is not to deliberate less in the moment, but to have pre-approved, pre-tested remediation runbooks — including load-shedding actions like the DNS move — so that the careful path is also the fast path.
7. **"Previously unobserved behavior" is not an excuse; it is the normal shape of latent bugs.** A code path in production for many years, well-tested backoff, a trigger nobody had seen — and still a seven-hour outage. Longevity is not evidence of coverage. If your confidence in a guardrail rests on "it has worked for years," ask what states it has actually been exercised in, and what a new trigger could put it into that no previous event did.

## What the postmortem does not say

This is the article's honesty ledger. AWS's postmortem does not disclose: which service's scaling activity triggered the event; the technical details of the latent backoff issue (no code, no fault description beyond "a latent issue prevented these clients from adequately backing off"); connection counts, device capacities, or the magnitude of the surge; how the top sources of traffic were identified or which services were disabled during mitigation; whether the promised backoff fix was deployed within the two-week window; or any customer-impact counts beyond the service-level descriptions. Contemporary reporting added user-visible detail — the affected consumer services, the warehouse and logistics impact inside Amazon itself — but this article's discipline is primary sources, so those details are not presented here as established fact; the AWS numbers above are the whole quantitative record this article relies on.

The contrast with the other entries in this series is instructive. Cloudflare published the offending regex and counted its steps. Fastly published a timeline and stayed silent on the bug. AWS publishes the architecture, the causal loop, and the service-by-service impact with unusual granularity — and stays silent on the trigger's identity and the bug's internals. The depth is real where it exists: the retry-amplification mechanism, the monitoring blindness, the three reasons recovery was slow, and the long service tail are all stated plainly enough to learn from. The silence is also real, and it is in the same place it always is: the exact fault, in the exact code, that turned a routine scaling activity into a seven-hour outage. A reader who wants that lesson will not find it here, and this article would rather say that than invent it.

What AWS does say, and what is worth keeping, is the sentence that frames the whole postmortem's attitude toward its own systems: the clients had well-tested backoff, the code path had run for years, the trigger was previously unobserved — and the congestion happened anyway. The standard this series holds every postmortem to is the one Fastly stated and AWS demonstrates: a failure is not unforeseeable because its trigger was specific. If the combination space is combinatorial, if your clients can enter states your backoff does not cover, and if your observability shares fate with your failure, the class was foreseeable even when the instance was not.

## Sources

- Amazon Web Services, "Summary of the AWS Service Event in the Northern Virginia (US-EAST-1) Region," December 10, 2021. https://aws.amazon.com/message/12721/ — primary source for everything quantitative in this article unless noted: the two-network architecture and the NAT/routing devices between them; the 7:30 AM PST automated scaling trigger and the connection surge; the retry-amplification causal chain; the immediate impact on real-time monitoring and the fallback to logs; the 9:28 AM internal DNS move and its limits; the three reasons remediation progressed slowly; the 1:34 PM congestion improvement and 2:22 PM full device recovery; the latent backoff issue and the two-week fix expectation; the device-protecting network configuration; the service-by-service impact times (EC2 APIs from 7:33 AM, launches recovered 2:40 PM; Route 53 APIs 7:30 AM–2:30 PM; Console restored 2:22 PM; STS full recovery 4:28 PM; API Gateway largely recovered 4:37 PM; EventBridge delivery disabled 12:35 PM, re-enabled 2:35 PM, latency until 6:40 PM; Fargate API errors normal from 5:00 PM; Amazon Connect normal 4:41 PM; Support Contact Center impaired 7:33 AM–2:25 PM); the Service Health Dashboard failover impairment and 8:22 AM update; and the promised new dashboard version and multi-region support architecture.
- Sections labeled as analysis — the NAT connection-state account of why a connection surge is the expensive load class, the retry-amplification equilibrium, the backoff-shape argument about new connections versus request retries, the observability fate-sharing account, the control-plane/data-plane split reading of the service table, and the recovery second-surge account — are the author's reasoning from the postmortem's facts and from standard networking and distributed-systems architecture, not AWS's statements. Where AWS is silent (the triggering service, the backoff bug's internals, surge magnitudes, the identities of disabled services, fix-deployment confirmation), the article says so rather than filling the gap.
