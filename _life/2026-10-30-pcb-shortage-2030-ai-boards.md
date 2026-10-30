---
title: 'The Shortage Has Moved Down the Stack: Now It Is the Circuit Board'
description: 'After memory, the AI boom is eating a cheaper, dumber component: the printed circuit board. A Nikkei Asia report carried by Tom''s Hardware and others says PCB lead times have doubled, some orders now take up to 30 months, an order placed today may not ship until late 2028, and a leading laminate supplier''s book is already full through 2030. The consumer hardware price spiral now has a second engine.'
date: 2026-10-30
permalink: /life/pcb-shortage-2030-ai-boards/
tags:
  - Hardware
  - Supply Chain
  - AI Infrastructure
  - PC
excerpt: 'First memory, then SSDs and GPUs. Now the board everything sits on: lead times up to 30 months, orders booked to 2030, and AI buyers outbidding PC makers for the most boring component in the machine.'
---

> [中文版 Chinese version](/life/pcb-shortage-2030-ai-boards-zh/)

*This post is based on a Nikkei Asia report as summarized by Tom's Hardware and several secondary outlets on October 29–30, 2026. The underlying figures come from unnamed industry managers, not published price lists — read the caveat at the end before treating any single number as gospel.*

## From memory to motherboards

If you have followed this site's supply-chain thread — memory eating half a mid-range phone's bill of materials on October 26, SK hynix sold out through 2029 on October 28 — the pattern was already clear: AI demand does not just raise prices, it reallocates physical capacity away from consumer hardware. This week the shortage moved one layer down the stack, to the component nobody thinks about until it is gone: the printed circuit board.

According to Nikkei Asia's reporting, as carried by Tom's Hardware:

- **Lead times have doubled** on a significant number of PCB products, and some orders now take **up to 30 months** to fulfill. One supplier said an order placed today would not ship until **late 2028**.
- A leading copper-clad laminate (CCL) supplier — CCL is the sheet of glass fibre, resin, and copper foil every board starts life as — has an order book **already filling through 2030**, despite plans to **triple capacity by 2028**.
- An American PC maker executive told Nikkei the company is "still struggling to secure enough PCB supplies to meet our needs," even while planning products for a year in which PC shipments may fall again.
- Nvidia has lined up partnerships with substrate makers **Ibiden, Samsung Electro-Mechanics, and Unimicron**, with Unimicron alone planning to grow capacity **2.5x over three years**.
- PCB industry pay for experienced engineers is reportedly up **20–30%**, as new plants struggle to staff up.

## Why AI servers eat boards first

AI servers do not use the same boards as your desktop. They use large, high-layer-count boards built from low-loss laminates and specialized glass fibre — and their buyers pay well and order in volume. When capacity is finite, the rational supplier serves the AI order first. This is the same mechanism as the memory story, one layer down: it is not that PC makers cannot afford boards, it is that they cannot get in line.

The upstream constraints rhyme too. Back in March, DigiTimes already reported CCL lead times at six months, with suppliers rationing through quotas and substrate makers short of glass fibre cloth and copper foil. Seven months later, the queue is measured in years, not months.

## A number to handle with care

One figure in this story deserves a warning label. Secondary coverage variously describes the CCL cost move since July as "at least twelvefold" (one Taiwanese PC maker's claim, per Hardware Busters) and as "a dozen price hikes since July" (per WCCFTech's rendering). A dozen separate hikes is not the same thing as a 12x price — and since laminate is only one input into a finished board, even a genuine 12x CCL move would not mean a 12x motherboard. The honest read: CCL costs have risen sharply and repeatedly since July, enough that suppliers are rationing and buyers are alarmed. The exact multiple is single-source, anonymous, and inconsistent across summaries. Do not quote "12x" without that sentence attached.

## The judgment

The significance is not any one lead time — it is that the bottleneck is no longer a single component. Memory, then SSDs and GPUs, now boards and laminates: the whole stack is tightening at once, and every layer's excuse is the same AI buyer outbidding the PC buyer. That kills the most common consumer strategy, which is waiting. Waiting worked when one component was spiking and the rest of the machine was stable. When boards take 30 months and a laminate supplier is booked to 2030, "prices will normalize next year" stops being a plan and becomes a hope — and Intel's own earnings call this same week said the same about memory into 2027.

Practical translation: if you need a PC or a GPU upgrade in the next year, the price you see today is more likely a floor than a ceiling. The 2027 build is not getting cheaper because the factory that would make it cheaper is busy building AI servers, and its order book already runs to 2030.

## Sources

- Nikkei Asia report as summarized by Tom's Hardware, via Hardware Busters, October 29–30, 2026: https://hwbusters.com/news/ai-servers-trigger-a-pcb-shortage-for-pc-makers-with-lead-times-stretching-to-30-months/
- WCCFTech, "AI Boom Triggers Massive PCB Shortage With Orders Booked Until 2030," October 30, 2026: https://wccftech.com/ai-boom-triggers-massive-pcb-shortage-with-orders-booked-until-2030/
- Mezha, "AI Boom Triggers PCB Shortages as Orders Stretch to 2030," October 29, 2026: https://mezha.ua/en/news/popit-na-shi-vzhe-sprichinyaye-deficit-plat-dlya-pk-316688/
- EnosTech, "Motherboard and GPU Prices Could Rise Further as PCB Shortages Continue Until 2030," October 30, 2026: https://www.enostech.com/motherboard-and-gpu-prices-rise-pcb-shortages/
