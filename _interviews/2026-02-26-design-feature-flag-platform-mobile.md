---
title: "Design a Feature Flag Platform for Mobile Apps"
description: "System design question: build a feature flag platform for iOS/Android with real-time targeting, offline behavior, safe rollouts, and auditability."
date: 2026-02-26
category: system-design
permalink: /interviews/feature-flag-platform-mobile/
tags:
  - System Design
  - Feature Flags
  - Mobile Architecture
  - Rollout Strategy
  - Reliability
difficulty: Medium-Hard
excerpt: "Design a mobile feature flag platform that supports safe rollouts, dynamic targeting, offline defaults, and fast kill switches."
---

## 🎯 Problem

Design a feature-flag system used by multiple iOS apps. Requirements:

- Progressive rollout by percentage/cohort
- Rule targeting by app version, region, user segment
- Offline-safe behavior for app startup
- Instant kill switch for critical incidents
- Full audit trail for who changed what and when

## 🧱 High-Level Architecture

{% mermaid %}
flowchart TD;
    Admin["Flag Admin UI"]-->FlagAPI["Flag Config API"];
    FlagAPI-->FlagDB["Flag Store"];
    FlagAPI-->Audit["Audit Log"];
    Mobile["iOS App SDK"]-->CDN["Edge Config CDN"];
    CDN-->Mobile;
    Mobile-->Exposure["Exposure Events"];
    Exposure-->Analytics["Analytics Pipeline"];
{% endmermaid %}

## 🔑 Core Design Decisions

### 1) Edge-read, control-plane-write
- Control plane writes to DB and publishes config snapshots.
- Mobile SDK reads from CDN/edge for low latency and high availability.

### 2) Local cache + bootstrap file
- App ships with last-known-safe defaults.
- SDK persists last fetched config.
- If network fails, app still evaluates flags deterministically.

### 3) Deterministic bucketing
- Use stable hashing on `(user_id, flag_key)` for rollout consistency.
- Prevents users flipping in/out across sessions.

## 📦 SDK Contract

```swift
protocol FeatureFlagClient {
    func bool(_ key: String, defaultValue: Bool) -> Bool
    func variant(_ key: String, defaultValue: String) -> String
    func refresh() async
}
```

Evaluation order:
1. emergency override cache
2. targeted rule match
3. percentage rollout
4. default value

## 🚨 Failure Modes

- **Config service outage** -> use cached config + defaults
- **Bad rule publish** -> use rollback version immediately
- **Exposure event backlog** -> buffer and batch upload

## ✅ Interview Tradeoff Talking Points

- Strong consistency is unnecessary for reads; eventual consistency with fast propagation is enough.
- Keep evaluation client-side for latency, but keep rule authoring centralized.
- Add schema validation for rule safety before publish.

## 🧪 What interviewer wants to hear

- How you prevent "flag drift" between platforms
- How kill switches bypass normal cache TTL
- How to test targeting deterministically in CI
