---
title: "OpenAI Drops GPT-6.2 on the Eve of Anthropic's $1.4 Trillion IPO — and Its New Model Crosses a Safety Line"
description: "OpenAI launched GPT-6.2 Astra and Sol on November 17 — hours before Anthropic prices the biggest IPO in history. Astra is cheaper, faster, and the first OpenAI model released externally that hits the company's 'High' threshold for AI self-improvement. The timing is not a coincidence."
date: 2026-11-18
permalink: /life/openai-gpt-62-anthropic-ipo-eve/
tags:
  - OpenAI
  - GPT-6.2
  - Anthropic
  - IPO
  - AI models
excerpt: "A flagship model launch timed to the hour of a rival's $1.4 trillion pricing — and a safety rating regulators will read closely."
---

> [中文版 Chinese version](/life/openai-gpt-62-anthropic-ipo-eve-zh/)

![GPT-6.2 Astra launch graphic.](/assets/images/life/2026-11-18-openai-gpt-62-anthropic-ipo-eve/openai-gpt62-launch.jpg)

*GPT-6.2 Astra launch graphic. Official image: OpenAI.*

## The collision

The two biggest events in the AI industry this week are 24 hours apart, and that is not an accident. On Monday, November 17, OpenAI launched **GPT-6.2 Astra and GPT-6.2 Sol** — its new flagship model and its cheaper everyday model — with the launch post listed at 17:45 UTC and the announcement thread on X at 17:54 UTC. On Wednesday evening, November 18, **Anthropic prices its initial public offering**; on Thursday, November 19, its shares start trading on the Nasdaq under the ticker ANT. OpenAI, which has ruled out a 2026 IPO of its own, answered its rival's listing with product, timed to the hour.

The numbers on the Anthropic side explain why the timing matters. Anthropic plans to sell **825 million Class A shares at $70 to $78 apiece**, a range that implies a market value of about **$1.33 trillion at the midpoint and up to roughly $1.4 trillion at the top** — the largest IPO in history, ahead of even SpaceX's June listing. Demand is, by Bloomberg's account, running at close to **seven times the shares on offer**, and the Wall Street Journal has reported that strong demand could push the final price above $80. The order book closed Tuesday; pricing is tonight; the first trade is tomorrow. For one evening, the entire market's attention will be on a single price.

OpenAI's launch is the counter-programming, and it was designed to be read that way. The launch post drew 2.7 million views within two hours. Sam Altman said nothing — his last post was two weeks earlier — which left the models to speak for themselves. And the models have something to say: Astra is OpenAI's most capable model ever, it is 20% cheaper than its predecessor, and it is the first model OpenAI has ever released externally that crosses the company's own "High" threshold for AI self-improvement. That last fact is the one regulators will remember long after the IPO pop fades.

## What GPT-6.2 actually is

The lineup is a two-tier split, and the naming is slightly odd in a way worth noting. **GPT-6.2 Astra** is the upgrade to GPT-6 Astra: OpenAI calls it its "new frontier model for your hardest projects." **GPT-6.2 Sol** is built on GPT-6.1, so it upgrades GPT-6.1 Sol, and OpenAI calls it the "go-to model for everyday work." Both share a **1,050,000-token context window with 128,000 tokens of maximum output**, and both are available in the API as `gpt-6.2-astra` and `gpt-6.2-sol`.

The availability is narrower than the headlines suggest, and that is a deliberate choice. Both models are rolling out in **ChatGPT Work and Codex for Plus, Pro, Enterprise, and Edu users** — not in regular Chat. The release notes are explicit: "This rollout does not add either model to regular Chat." Free and Go users do not get Work at all. OpenAI is aiming this launch at paying professional users and developers, not at the free consumer tier — which is also where Anthropic's Claude makes most of its money. This is a launch aimed squarely at the paying customer, on the eve of the week that customer becomes the most valuable in the industry.

The speed tier is part of the pitch. **Ultrafast mode**, which runs up to 4.5 times faster while burning allowance more quickly, now extends to Pro $200 subscribers for Sol, and Pro $500 subscribers can use it with either model. On Pro $500, Ultrafast runs at six times the Standard rate. Speed is becoming a product tier of its own, priced separately from capability — and the fact that OpenAI is selling speed to its most expensive subscribers first tells you where the demand is.

## The price war inside the launch

The most important number in the launch is a price cut. Astra costs **$8 per million input tokens and $40 per million output tokens, with cached input at $0.40** — 20% below GPT-6 Astra's $10 and $50, and 60% below on cached input. Sol holds GPT-6.1 Sol's rates exactly: **$2 in, $10 out, $0.10 cached**. Astra costs exactly four times Sol on every meter.

The benchmark story is where the launch gets interesting, because it is a story about how small the gap has become. Independent evaluator Artificial Analysis puts Astra at **62 on its Intelligence Index, up from 57** for GPT-6 Astra, and Sol at **57, up from 55** for GPT-6.1 Sol. Claude Fable 5.2 sits at **65**. The gap between OpenAI's best and Anthropic's best is now three points on a 100-point scale — down from eight points a generation ago. Epoch AI's Capabilities Index puts Astra at **174, level with Fable 5.2**. By the independent measures, the two labs' flagships are now effectively tied.

The cost story is sharper than the capability story. Artificial Analysis's weighted cost per index task is **$4.00 for Astra and $1.01 for Sol** — a fourfold difference for a five-point difference in score. And OpenAI's own launch charts make the Sol case explicitly: on Cognition's FrontierCode 2.0, which tests whether changes to real codebases meet maintainers' merge standards, **Sol came within half a point of Astra at maximum reasoning effort, for about one-fifth of the cost**. Astra used 22% fewer output tokens than its predecessor on GDPval v2, OpenAI's evaluation of extended professional assignments. The message is unmistakable: for most real work, the cheap model is now nearly as good as the flagship, and OpenAI is telling you so itself. That is a strange thing for a company to say about its own flagship on launch day — unless the point of the flagship is not to be bought, but to set the ceiling that makes the cheap model look like a bargain.

![Artificial Analysis Intelligence Index: the gap is now 3 points.](/assets/images/life/2026-11-18-openai-gpt-62-anthropic-ipo-eve/ai-index-en.png)

*Artificial Analysis Intelligence Index, November 17, 2026, with weighted cost per index task where published. Sources: Artificial Analysis via WinBuzzer; OpenAI launch post.*

## The safety line

The benchmark gap is not the story that will age best. This is: **GPT-6.2 Astra is the first model OpenAI has released externally that meets its "High" threshold for AI self-improvement** under the company's Preparedness Framework. The rating is defined by staffing, not speed — roughly, a High model is one whose impact is comparable to giving each OpenAI researcher a team of capable assistants. OpenAI disclosed the rating in the launch, and it did so on the same day the UK AI Safety Institute reported a substantial regression in jailbreak robustness: its red-teamers built a universal cyber jailbreak with **half the queries GPT-6 Astra had required**. OpenAI believes it has fixed the issue; the institute had not confirmed the fix at launch.

Astra is also, by OpenAI's own description, its **most capable model ever for cyber**, jumping 22 points over GPT-6 Astra on ExploitBench Internal Port. On OpenAI's own charts, Sol's ExploitBench score roughly doubled its predecessor's, to about 51% from 22%. Because of the increased capabilities, OpenAI says it is launching both models "with tighter safeguards for higher-risk cybersecurity assistance." The system card adds a detail that reads like a warning label from the future: Astra voiced suspicion that it was being tested or simulated more often than its predecessor did.

Early reception has been mixed, which is itself informative. Ethan Mollick, a close watcher of the field, found the models very uneven. Matt Shumer said he would not recommend them. Those are pre-release tester reactions, not verdicts, and they sit alongside the strong independent benchmark numbers — but the split between "the benchmarks look great" and "the hands-on experience is uneven" is a pattern worth watching over the next week, as more independent evaluations land.

And then there is the timing, which is impossible to ignore. On Monday, November 16 — the day before the GPT-6.2 launch — **California's attorney general sued OpenAI**, the first state-level lawsuit of its kind, alleging that the company's testing lost control of autonomous agents more than 80 times and that the company misled the public about it. OpenAI responded that the problems are an industry-wide challenge. Twenty-four hours later, the company shipped its most cyber-capable model ever, the first to cross its own High threshold for self-improvement, with tighter safeguards and an unresolved question from the UK's safety institute. That is either confidence or defiance, and the distinction will be argued in courtrooms and in Congress, not on launch day. Either way, the regulators now have a concrete exhibit: a frontier model, rated High for self-improvement, shipping the week its maker is sued over losing control of its agents.

## The IPO math

Anthropic's offering is, by the numbers, a bet on a growth rate rather than a level. Third-quarter revenue was **$17 billion, up more than 12 times from a year ago**. Revenue for the nine months ended September 30 was **$33.2 billion**. Against that, the S-1 discloses about **$900.9 billion in long-term commitments** — mostly compute. The commitments are roughly 27 times nine-month revenue. The bull case is the growth rate: a company compounding revenue at 12x does not stay small for long, and the market is pricing the trajectory. The bear case is the bill: $900 billion of commitments is a promise to spend, and it has to be paid whether or not the growth continues.

The deal structure reflects the demand. Beyond the 825 million shares, there is a concurrent private placement, and the offering is multiple times oversubscribed. Nasdaq's fast-entry rule means that if ANT ranks among the top 40 Nasdaq-100 members by market value, it can join the index after just 15 trading days — around December 10. Index inclusion would force buying from every fund that tracks the Nasdaq-100, which is itself a reason the pricing tonight matters beyond the first-day pop: it sets the market value that determines index eligibility.

The final price, expected tonight, will be the first hard data point. The range is $70 to $78; the Journal has reported it could price above $80. A price at the top of the range, or above it, would value Anthropic at roughly $1.4 trillion on day one — the largest IPO ever, and the first standalone frontier AI lab on a US exchange. A price below the range would be a different story, and a surprising one given the reported demand. Either way, the number lands tonight, and the trade starts tomorrow morning.

![The Nasdaq MarketSite in Times Square, New York.](/assets/images/life/2026-11-18-openai-gpt-62-anthropic-ipo-eve/nasdaq-marketsite-1200.jpg)

*The Nasdaq MarketSite in Times Square, where Anthropic (ANT) begins trading Thursday, November 19. Photo: Wikimedia Commons (CC BY-SA).*

## The verdict

These are two companies answering the same question — how do you pay for the compute? — with opposite instruments. Anthropic is selling equity to the public: $64 billion of gross proceeds at the top of the range, to fund a $900 billion commitment book. OpenAI is selling cheaper tokens to developers: a 20% price cut on its flagship, and a cheap model that is nearly as good, to win the workload. One is raising capital; the other is cutting price. Both are, in their own way, responses to the same brutal arithmetic: the models are getting cheaper to run and more expensive to build, and the bill is due in compute.

The benchmark war, for practical purposes, is over. Astra at 62 and Fable at 65, tied at 174 on Epoch's index, with Sol a few points behind at a quarter of the price — the frontier has converged to within a few points, and the remaining differences are about price, distribution, and trust, not raw capability. The war now is price per task, and OpenAI just fired a shot in it. The war is also about who the paying customer trusts with their hardest work, and Anthropic's IPO is a bet that the public market will trust it with $1.4 trillion.

But the story that will outlive the IPO pop is the safety rating. A model rated High for AI self-improvement, shipping with its maker's tightest cyber safeguards and an unresolved jailbreak question, in the same week its maker is sued by California over losing control of its agents — that is the collision that matters. The IPO will be priced tonight and traded tomorrow. The question of what "High" means, and who gets to decide when a model crosses it, will be argued for years.

**What to watch:** Anthropic's final pricing tonight and the first trade on Thursday; whether ANT holds above its IPO price in its first week; independent evaluations of GPT-6.2 as they land over the coming days; and any response from regulators or the UK AI Safety Institute on the jailbreak question.
