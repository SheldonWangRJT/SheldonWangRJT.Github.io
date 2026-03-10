---
title: "🛝 Latency Budget Simulator"
description: "An interactive playground concept for visualizing where end-to-end API latency is spent and how optimizations change p95."
date: 2026-03-07
permalink: /playground/latency-budget-simulator/
---

## What This Playground Demonstrates

The simulator helps engineers understand end-to-end request latency as a budget split across network, application logic, cache, and database layers.

Instead of arguing about "the slow service," you can see exactly which segment dominates p95 and how each optimization changes total response time.

## Scenario Setup

| Segment | Baseline p95 (ms) |
|---------|-------------------|
| Client -> Edge | 40 |
| Edge -> API | 25 |
| API compute | 60 |
| Cache lookup | 15 |
| DB query | 90 |
| Serialization | 20 |
| Response transfer | 30 |

Baseline end-to-end p95 is the sum of segment contributions.

## Model Formula

Use a simple additive model for first-pass reasoning:

```text
end_to_end_p95 =
  client_edge +
  edge_api +
  api_compute +
  cache_lookup +
  db_query +
  serialization +
  response_transfer
```

Then apply modifiers for retries, jitter, and queueing effects in advanced mode.

## Suggested Interactions

- Adjust cache hit rate and watch DB latency contribution shrink.
- Add network jitter to evaluate resilience.
- Apply query optimization and compare before/after p95.
- Increase traffic burst multiplier and observe queue spillover.
- Toggle regional failover and compare additional network cost.

## Exploration Paths

### Path A: Quick Wins
1. Increase cache hit rate from 60% to 85%.
2. Cut DB p95 from 90ms to 55ms with indexing.
3. Recompute end-to-end latency and compare gain.

### Path B: Resilience Under Stress
1. Add jitter and packet loss.
2. Increase retry counts.
3. Validate whether p95 remains within SLO.

### Path C: Capacity Planning
1. Simulate burst traffic x2 and x4.
2. Add queue processing delay.
3. Identify threshold where user-facing SLO is breached.

## Visual Architecture

{% mermaid %}
flowchart LR;
    Client-->Edge;
    Edge-->API;
    API-->Cache;
    API-->DB;
    API-->Serializer;
    Serializer-->Client;
{% endmermaid %}

## Educational Prompts for Users

- Which segment is the largest absolute contributor today?
- If you can optimize only one segment this sprint, which yields the best SLO gain?
- At what burst level does the system need architectural change instead of tuning?

## Learning Goal

Latency optimization is highest leverage when you target dominant contributors first instead of micro-optimizing low-impact segments.

## Stretch Features

| Feature | Why It Matters |
|---------|----------------|
| p50/p95/p99 overlays | teaches percentile-aware decisions |
| "what changed" diffs | helps communicate optimization impact |
| cost-per-ms estimate | aligns engineering tradeoffs with budget |
| scenario presets | speeds up team onboarding |

## Next Iteration

- Add percentile curves (p50/p95/p99)
- Add traffic burst simulation
- Export comparison snapshots
