---
title: 'NVIDIA Quietly Cut Rubin''s Shipping Specs — and Nobody Announced It'
description: 'ServeTheHome reported on October 31 that NVIDIA''s shipping Rubin GPU delivers 19.2 TB/s of HBM4 bandwidth, not the 22 TB/s it originally promoted — a 12.7% cut, with NVLink down 16.7% and the eight-GPU NVL8 system down 26%. The figures were revised in a September datasheet update with no announcement. The compute headlines did not change; the memory story did.'
date: 2026-11-01
permalink: /life/nvidia-rubin-spec-cut-shipping/
tags:
  - NVIDIA
  - Rubin
  - GPUs
  - AI Infrastructure
excerpt: 'NVIDIA''s defense is technically true — the original figures were labelled preliminary. But a quiet edit discovered by comparing web pages, landing just as the first Vera Rubin NVL72 systems reach hyperscalers, is exactly the kind of revision that should come with a changelog, not a diff.'
---

> [中文版 Chinese version](/life/nvidia-rubin-spec-cut-shipping-zh/)

*Spec figures below are NVIDIA's published preliminary figures versus its current shipping figures, as compiled by ServeTheHome on October 31, 2026, from NVIDIA's September datasheet update. These are published specifications, not benchmark results, and NVIDIA has not explained the changes.*

## What changed

The headline numbers of Rubin survive intact. Each Rubin GPU still carries **288 GB of HBM4** memory, and the compute figures NVIDIA leads with — **50 PFLOPS of sparse NVFP4 inference and 35 PFLOPS of NVFP4 training per GPU** — are unchanged. What moved is the plumbing around that compute: how fast data can actually be fed to it.

| | Preliminary | Shipping | Change |
|---|---|---|---|
| Rubin GPU HBM4 bandwidth | 22 TB/s | 19.2 TB/s | −12.7% |
| Rubin GPU NVLink (scale-up) | 3.6 TB/s | 3.0 TB/s | −16.7% |
| Rubin GPU scale-out networking | 0.4 TB/s | 0.45 TB/s | +12.5% |
| Vera Rubin NVL72 rack HBM bandwidth | 1,580 TB/s | 1,400 TB/s | −11% |
| Vera Rubin NVL72 rack NVLink | 260 TB/s | 216 TB/s | −17% |
| HGX Rubin NVL8 system HBM bandwidth | 176 TB/s | 130 TB/s | −26% |
| HGX Rubin NVL8 system HBM capacity | 2.3 TB | 2 TB | −13% |

ServeTheHome, which published the comparison on October 31, notes the revision was spotted by IT Home in NVIDIA's September update to its architecture datasheet — and that the timing coincides with the first Vera Rubin NVL72 systems becoming generally available at hyperscalers. In other words, the numbers changed at precisely the moment they stopped being a preview and started describing hardware customers can buy.

The per-pin arithmetic tells the story in one line. Eight HBM4 stacks at 2,048 bits each: the original 22 TB/s implied about 10.75 Gbps per pin; the shipping 19.2 TB/s implies 9.375 Gbps per pin. Still far above JEDEC's HBM4 standard ceiling of 8 Gbps per pin, but a meaningful step back from what was promoted.

## The NVL8 problem is worse — and messier

The eight-GPU HGX Rubin NVL8, the system most cloud providers and enterprises will actually deploy rather than the flagship 72-GPU rack, takes the biggest hit: bandwidth down 26% and capacity down from 2.3 TB to 2 TB. It also contains an inconsistency NVIDIA has not addressed. Eight GPUs at 19.2 TB/s each should deliver roughly 154 TB/s of aggregate bandwidth, not the 130 TB/s the HGX page lists. And some NVIDIA pages still show the original figures. As TweakTown and VideoCardz both note, the company's documentation is currently inconsistent with itself — which is a strange state for specifications that hyperscalers use to plan multi-billion-dollar cluster purchases.

That inconsistency is the strongest reason to treat this as more than a rounding correction. A single clean revision, explained once, would be unremarkable: preliminary specs change. A revision discovered by web-page archaeology, with different pages disagreeing and no explanation offered, leaves buyers to guess which number their capacity planning should use.

## Why bandwidth, specifically, matters

For training, interconnect and memory bandwidth are often the binding constraint long before raw compute is. A GPU that can compute faster than its memory can feed it spends cycles waiting. The cuts here do not make Rubin slow — 19.2 TB/s per GPU remains an enormous number, and the scale-out networking figure actually improved 12.5%, which helps the multi-node clusters where large training runs live. But the direction of travel matters for the competitive story: reports following the revision note that AMD's Helios platform, announced in July 2026, now leads Rubin on published per-GPU memory bandwidth and rack-scale bandwidth figures. Those are paper comparisons, not benchmarks, and neither side's numbers have been independently verified on shipping silicon. Still, a lead NVIDIA held on paper has narrowed or reversed on paper, and that is the kind of thing that shows up in procurement meetings before any benchmark does.

## The judgment

NVIDIA's defense, such as it is, is technically true: the original figures were labelled preliminary and "subject to change." Nobody is entitled to a preview number. But that defense misses why this story travelled. The revision was not announced; it was found, months after the September edit, by comparing saved pages. The company that sets the pace of the entire AI infrastructure market revised the specifications of its flagship product in silence, at the moment that product started shipping, and left its own pages disagreeing with each other.

The practical takeaway is narrow and useful. If you are evaluating Rubin systems, use the shipping figures — 19.2 TB/s per GPU, 1,400 TB/s per NVL72 rack, 130 TB/s per NVL8 system — and treat any capacity model built on the original 22 TB/s figure as overstated by roughly an eighth. And if you are NVIDIA, the lesson is cheaper than the bandwidth: a one-paragraph changelog costs nothing, and its absence is what turned a routine spec revision into a trust story. The hardware may be fine. The silence is the product decision worth criticizing.

## Sources

- ServeTheHome, "NVIDIA Updates Rubin GPU Specs as First Production Hardware Arrives," October 31, 2026: https://www.servethehome.com/nvidia-updates-rubin-gpu-specs-as-first-production-hardware-arrives/
- VideoCardz, "NVIDIA quietly cuts Vera Rubin specs, HBM4 bandwidth and NVLink 6 speeds now lower," October 2026: https://videocardz.com/newz/nvidia-quietly-cuts-vera-rubin-specs-hbm4-bandwidth-and-nvlink-6-speeds-now-lower
- TweakTown, "NVIDIA cuts Vera Rubin's memory bandwidth by up to 26%, and AMD's Helios now leads in memory bandwidth," October 2026: https://www.tweaktown.com/news/114304/nvidia-cuts-vera-rubins-memory-bandwidth-by-up-to-26-percent-and-amds-helios-now-leads-in-memory-bandwidth/index.html
