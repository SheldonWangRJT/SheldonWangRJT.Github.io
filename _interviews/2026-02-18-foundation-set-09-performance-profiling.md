---
title: "Foundation Set 9: Performance & Profiling (25 Q&A)"
description: "Rapid-fire iOS performance interview questions: Time Profiler, memory graph, main-thread blocking, rendering and scrolling optimization."
date: 2026-02-18
category: foundation
permalink: /interviews/foundation-performance-profiling/
tags:
  - Foundation
  - Performance
  - Profiling
  - Instruments
  - Optimization
difficulty: Medium
excerpt: "25 practical Q&A on iOS performance bottlenecks and debugging strategy with Instruments."
---

## ⚡ Performance & Profiling - 25 Quick Q&A

### Q1: First step when app feels slow?
**A:** Measure before optimizing; reproduce with profiler.

### Q2: Which tool for CPU hotspots?
**A:** Time Profiler.

### Q3: Which tool for memory leaks?
**A:** Leaks + Memory Graph.

### Q4: Janky scrolling common cause?
**A:** Heavy work on main thread during cell rendering.

### Q5: Rule for main thread?
**A:** UI only; move expensive compute/IO off main.

### Q6: Why image decoding causes stutter?
**A:** Decode/compression cost at render time.

### Q7: Optimization for large image lists?
**A:** Predecode, resize, cache thumbnails.

### Q8: What is FPS target?
**A:** 60fps baseline (or 120fps on ProMotion devices where needed).

### Q9: What is overdraw?
**A:** Same pixel rendered multiple times due to layered views.

### Q10: How to reduce overdraw?
**A:** Flatten hierarchy, avoid unnecessary transparency.

### Q11: Symptoms of retain cycle?
**A:** Objects never deinit, memory grows over time.

### Q12: Typical retain cycle pattern?
**A:** Closures strongly capturing `self`.

### Q13: Fix?
**A:** `[weak self]` or ownership redesign.

### Q14: What's allocation churn?
**A:** Frequent object create/destroy causing CPU/memory pressure.

### Q15: How to reduce churn?
**A:** Reuse objects, pools, avoid redundant formatting/parsing.

### Q16: Why pagination helps list performance?
**A:** Bounds memory and network load.

### Q17: Startup optimization first lever?
**A:** Defer non-critical initialization.

### Q18: Cold start vs warm start?
**A:** Cold: fresh process launch; warm: app already resident.

### Q19: Why signposts useful?
**A:** Correlate code phases with profiler timelines.

### Q20: p50 vs p95 for perf metrics?
**A:** p95 reveals tail pain users actually feel.

### Q21: How to profile network impact?
**A:** Measure request count, payload size, serialization cost.

### Q22: How to avoid layout thrashing?
**A:** Cache heights, reduce repeated constraint recalculation.

### Q23: When not to micro-optimize?
**A:** If bottleneck is unknown or impact is negligible.

### Q24: Interview framing for optimization work?
**A:** Baseline -> hypothesis -> experiment -> measurable result.

### Q25: One-line principle?
**A:** Performance engineering is systems thinking + disciplined measurement.
