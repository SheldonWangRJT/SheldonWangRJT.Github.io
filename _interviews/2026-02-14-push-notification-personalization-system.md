---
title: "Design a Push Notification Personalization System"
description: "System design: architect a personalization pipeline for mobile push notifications with ranking, throttling, and safety controls."
date: 2026-02-14
category: system-design
permalink: /interviews/push-notification-personalization-system/
tags:
  - System Design
  - Push Notifications
  - Personalization
  - Ranking
  - Messaging Platform
difficulty: Medium-Hard
excerpt: "Design a push personalization system that improves engagement without notification spam or policy violations."
---

## 🎯 Problem

Build a service that sends personalized notifications at the right time and frequency.

Goals:
- increase open/engagement rates
- avoid spam and fatigue
- honor user preferences and compliance rules

## 📐 Architecture Sketch

{% mermaid %}
flowchart TD;
    Events["User Events"]-->FeatureStore["Feature Store"];
    FeatureStore-->Ranker["Notification Ranker"];
    Campaign["Campaign Rules"]-->Ranker;
    Ranker-->Policy["Policy & Frequency Guard"];
    Policy-->Scheduler["Send-Time Scheduler"];
    Scheduler-->Provider["APNs/FCM Gateway"];
    Provider-->App["Mobile App"];
{% endmermaid %}

## 🔑 Decision Points

### Rule engine vs ML ranking
- Start with rule+score hybrid for explainability.
- Move to learned ranking when data quality is strong.

### Frequency capping
- Global cap (e.g., max 3/day)
- Per-category cap (promo vs transactional)
- Cooldown after dismissals

### Quiet hours and timezone correctness
- Store timezone per user
- Schedule send windows locally
- Fall back safely when timezone unknown

## 🧪 Scoring Inputs

- recency/frequency of relevant activity
- previous open/click behavior
- content category affinity
- predicted fatigue signal

## 🚨 Failure/Safety Controls

- provider outage -> retry queue with dedupe key
- malformed payload -> validation gate before send
- runaway campaign -> emergency campaign kill switch

## 📊 Metrics

- delivery rate
- open rate / click-through
- unsubscribe and disable-notification rate
- complaint rate / negative feedback

## ✅ Interview Tip

Say explicitly: optimizing opens alone can hurt long-term retention; include negative-signal metrics in objective function.
