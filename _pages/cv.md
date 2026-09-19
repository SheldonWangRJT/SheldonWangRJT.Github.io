---
layout: archive
title: "Xiaodan (Sheldon) Wang"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
header:
  overlay_image: https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80
  overlay_filter: 0.5
  caption: "Building agent systems that scale to billions"
---

{% include base_path %}

# Staff Software Engineer — Agentic Systems & AI Infrastructure

## 🎯 Executive Summary

**12+ years of industrial software engineering across iOS, Android, web, and backend at 3+ billion MAU scale — now building production AI agent systems at Meta.** 2+ years operating multi-agent architectures with self-improving feedback loops, schema-constrained handoffs, and agent infrastructure (versioning, CI reliability). Rated **Greatly Exceeds Expectations**; ranked **top 3 of 700+** engineers org-wide in coding contribution, driven substantially by AI-assisted development workflows.

### **Key Achievements:**
- 🤖 Built a **self-evolving 3-agent** Swift migration system (converter → brain → feeder learning loop)
- 💰 Shipped a codemod agent saving **$5M+/yr**; an AI exploration agent driving **0.01%+ revenue lift**
- 🏆 **Technical Excellence Award** winner at Snap Inc. (company-wide recognition)
- 📊 **Top-10 all-time** committer to the Snapchat iOS codebase; Facebook Monetization Swift contribution **ranked #1 in 2025**
- 🧪 Led **150+ A/B test** launches (up to 200k LOC in a single test)
- 👥 Mentored **5+ engineers to E5** promotion as tech lead

## 🤖 Agent & AI Systems Expertise

- **Multi-agent architecture & orchestration:** task-specialized subagent pipelines, schema-constrained handoffs, self-improving agent loops, node/graph-based scaling architectures; agent infrastructure (marketplace/plugin versioning, CI reliability tooling)
- **Applied agents:** combinatorial UI exploration agents, daily codemods (deadcode deletion, schema-sync), large-scale code migration agents
- **Familiar with** RAG architectures and retrieval-augmented pipelines
- **Languages:** Swift, Objective-C, TypeScript, PHP (Meta variant); OOP, protocol-oriented, functional paradigms
- **Tooling:** Cursor, Xcode, VSCode, GitHub, livegrep, macOS terminal/bash; SQLite and large-scale SQL querying in GCP
- **iOS depth:** Core Bluetooth, GCD, Core Data, Swift Concurrency, UIKit, MapKit, APNS, Core Location

## 💻 Technical Skills

### **Languages & Paradigms**
- **Expert:** Swift, Objective-C
- **Proficient:** TypeScript, PHP (Meta variant), Python, Shell scripting
- **Paradigms:** OOP, Protocol-Oriented Programming, Functional Programming

### **Agent & AI Systems**
- **Architecture:** Multi-agent pipelines, schema-constrained handoffs, self-improving feedback loops, node/graph-based scaling
- **Infra:** Agent marketplace versioning, plugin/dependency management, CI reliability tooling, deterministic + LLM-judgment hybrid flows
- **Familiar:** RAG architectures, retrieval-augmented pipelines

### **iOS Frameworks & Technologies**
- **Core:** UIKit, SwiftUI, Swift Concurrency, Combine, Core Data, Core Animation
- **Media:** AVFoundation, Photos, Camera, Core Image
- **System:** GCD, Core Bluetooth, Core Location, APNS, Push Notifications, MapKit
- **Tools:** Xcode, Instruments, LLDB, CI/CD pipelines

### **Engineering Practices**
- **Experimentation:** 150+ A/B test launches, metrics-driven development, SQL analytics
- **Architecture:** Modular architecture, large-scale refactoring, dependency injection, clean architecture
- **Leadership:** Cross-team initiative planning, incident response (P0/P1), engineer mentorship

## 💼 Professional Experience

### <i class="fab fa-meta" style="color: #0081FB;"></i> Meta Platforms, Inc. | June 2025 - Present
**Staff Software Engineer, Tech Lead** — Facebook Monetization (Facebook / Instagram)

Ramped extremely fast — Exceeds in H1 PSC, **Greatly Exceeds in H2 PSC**; ranked **top 3 of 700+** engineers org-wide in coding contribution.

**Agent Architecture & Infrastructure:**
- 🤖 Built a **self-evolving 3-agent** Swift migration system: Agent 1 (Converter) performs code conversion and emits key metrics; Agent 2 (Brain) consumes those metrics to open PRs improving Agent 1's prompts, skills, and MCPs; Agent 3 (Feeder) surfaces additional signals to trigger further learning
- 🔗 Designed a **3-layer subagent pipeline** for mobile UI verification — spec compiler, navigator, comparator — passing schematized data between layers to produce structured verdicts
- 🕸️ Pioneered a **node/graph-based agent architecture** for scaling, replacing traditional E2E test architecture entirely; now supports **100+ engineers'** workflows
- 📦 Contributed to core **agent marketplace infrastructure**: versioning system and plugin/dependency version management
- ⚖️ Architected agentic flows mixing deterministic Python scripting with non-deterministic LLM judgment, continuously tuning the stability-vs-scalability tradeoff

**Applied Agent Impact:**
- 💰 Built **Craft Scout**, an AI exploration agent testing ad rendering across combinatorial dimensions (ad style × ad ID × device settings) — drove a **0.01%+ revenue lift** for Facebook
- 🧹 Built a daily-run **codemod agent** for deadcode deletion and schema-sync cleanup, saving **$5M+/year**
- 🔄 Led an Objective-C → Swift migration codemod covering **30k+ LOC in 3 months**
- ✅ Contributed to company-level CI post-commit hooks, reducing first-round CI failures by **60%+**

**Platform & Org Leadership:**
- 🛡️ Led ads post-rendering workflow reliability (Newsfeed, Permalink, Reels), protecting **$20–40M in revenue**
- 📉 Redesigned iOS/Android metrics reporting: **30% fewer events**, **10% smaller payloads** at billions-per-day scale
- 🚀 Drove org-wide Swift adoption from **5% to 50%** of new code; authored 10,000+ lines of new Swift in 4 months; aligned 150+ iOS engineers
- 🔓 Unblocked a cross-platform migration **stalled for 1.5 years, launching it in 3 months**

---

### <i class="fab fa-snapchat" style="color: #FFFC00;"></i> Snap Inc. | March 2019 - June 2025
**iOS Lead** — Snapchat (400M DAU, 800M MAU)

🏆 Memories Team iOS Lead | March 2020 - June 2025

- 👥 Led the team managing key pages serving **150+ million iOS DAU**
- 💰 Delivered cost-saving projects reducing media upload/retrieval/storage cost (S3/S4) by **$10M+ annually**
- 💾 Led rewrite of the entire backup stack onto a cross-platform TypeScript solution: 7 months dev, 11 months rollout; backup-incomplete rate 6% → 4.8%; **350M+ snaps processed daily**; WWAN upload data cut **40%**
- ⚡ Owned Memories playback latency across **4 billion monthly views**; improved P90 image viewing latency **40%** and P90 video viewing latency **60%** via prefetching
- 🏗️ Led the **Matcha project**: rewrote **200,000 lines** around proper dependency injection — 10 engineers, 30+ teams, 100+ libraries; won the company-wide **Technical Excellence Award**
- 📝 Built a story editor feature (0 to 1): **50M+ daily users**
- 🌱 Mentored **5+ engineers to E5 promotion**; led high-severity 'code red' P0/P1 incident responses

🕶️ Spectacles Team iOS | March 2019 - March 2020

- 🚁 Launched Snapchat's flying drone camera, **Pixy** (pairing, transfer, preview flows)
- 📷 Major contributor to **Spectacles V3** launch (dual cameras); rewrote the data transfer stack (BLE, Bluetooth Classic, WiFi)
- 🏭 Owned factory QC app code & release pipelines (China/Taiwan manufacturing)

---

### Earlier Experience

**<i class="fas fa-car" style="color: #1C69D4;"></i> BMW Technology Corporation** | May 2017 - March 2019 — *Senior iOS Engineer*
- Owned POI search and trip management; built a unified map-provider interface (HERE, Apple Maps) across markets
- Shipped the **first-gen in-car head unit** (Node.js/TypeScript) and a cross-platform after-sales tab (React Native); partnered with the ML team on personalized promotions

**<i class="fas fa-building-columns" style="color: #003C71;"></i> Citigroup** | April 2016 - May 2017 — *iOS Engineer, Payments Team*
- Owned cards, bill payments, and account management features; built calendar import/export and Apple Watch account summaries; integrated credit score reporting; prototyped Siri-based payments

---

## 🛠️ Personal Projects

- **NewsAI** — AI news aggregator/summarizer built for fun: multi-agent development with Cursor, Claude API for summarization, Vercel hosting, Neon serverless DB, MailerLite subscriptions
- **This site** — built with multi-agent development workflows, hosted on GitHub Pages, deployed via GitHub Actions

---

## 🎓 Education

**Master of Science in Electrical Engineering**  
University of Colorado Denver | Denver, CO

**Bachelor of Engineering in Electronics Engineering**  
Beijing Technology and Business University | Beijing, China

---

## 🌟 Why Work With Me?

### **Technical Excellence**
I don't just write code – I architect systems that scale. From 4 billion monthly video views to self-improving agent loops serving 100+ engineers, I've proven I can handle complexity at any scale.

### **Leadership That Delivers**
Leading 10-person teams across 30+ partner teams taught me that great code alone isn't enough. Communication, planning, and bringing people together around a shared vision – that's where impact happens.

### **Impact-Driven Mindset**
Every line of code should solve a real problem. Whether it's $5M+/yr in savings from a codemod agent or cutting latency by 60% for 150M daily users, I focus on measurable outcomes that matter to users and the business.

### **Continuous Learning**
Tech moves fast. I stay ahead by constantly learning – this blog's 3×/week bilingual deep-dives on LLMs and agents are proof. I bring that curiosity to every project.

---

## 📄 Download Resume

**Interested in working together?**

<a href="/files/Sheldon_Wang_Resume_2026.9.pdf" class="btn btn--primary btn--large" download>
  📥 Download Full Resume (PDF)
</a>

**Or reach out directly:**

📧 **Email:** [sheldon.wang777@gmail.com](mailto:sheldon.wang777@gmail.com)  
📱 **Phone:** 720.772.9666  
💼 **LinkedIn:** [linkedin.com/in/sheldonengineering](https://linkedin.com/in/sheldonengineering)

---

*Last Updated: September 2026*
