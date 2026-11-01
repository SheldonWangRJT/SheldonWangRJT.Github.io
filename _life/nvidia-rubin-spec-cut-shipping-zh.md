---
title: '英伟达悄悄下调了 Rubin 的量产规格——而且没有发布任何公告'
description: 'ServeTheHome 10 月 31 日报道：英伟达量产版 Rubin GPU 的 HBM4 带宽是 19.2 TB/s，而非最初宣传的 22 TB/s，下调 12.7%；NVLink 下调 16.7%，八卡 NVL8 系统下调 26%。这些数字是在 9 月的一次数据表更新中改掉的，没有任何公告。算力 headline 没变，变的是内存故事。'
date: 2026-11-01
permalink: /life/nvidia-rubin-spec-cut-shipping-zh/
tags:
  - NVIDIA
  - Rubin
  - GPUs
  - AI Infrastructure
excerpt: '英伟达的辩护在技术上成立——最初的数字确实标注了 preliminary。但一个靠对比网页存档才被发现的悄悄修改，恰好落在首批 Vera Rubin NVL72 系统交付超大规模客户的时刻，这种修改本该配一份 changelog，而不是一个 diff。'
---

> [English version](/life/nvidia-rubin-spec-cut-shipping/)

*以下规格数字为英伟达最初公布的 preliminary 数字与当前量产数字的对比，由 ServeTheHome 于 2026 年 10 月 31 日根据英伟达 9 月的数据表更新整理。这是公布规格，不是实测成绩，英伟达尚未解释修改原因。*

## 改了什么

Rubin 的 headline 数字完好无损。每颗 Rubin GPU 仍搭载 **288 GB HBM4** 显存，英伟达主打的算力数字——每颗 GPU **50 PFLOPS 稀疏 NVFP4 推理、35 PFLOPS NVFP4 训练**——也没有变。变的是算力周围的“水管”：数据能以多快的速度喂给算力。

| | 最初公布 | 量产版 | 变化 |
|---|---|---|---|
| Rubin GPU HBM4 带宽 | 22 TB/s | 19.2 TB/s | −12.7% |
| Rubin GPU NVLink（scale-up） | 3.6 TB/s | 3.0 TB/s | −16.7% |
| Rubin GPU scale-out 网络 | 0.4 TB/s | 0.45 TB/s | +12.5% |
| Vera Rubin NVL72 机柜 HBM 带宽 | 1,580 TB/s | 1,400 TB/s | −11% |
| Vera Rubin NVL72 机柜 NVLink | 260 TB/s | 216 TB/s | −17% |
| HGX Rubin NVL8 系统 HBM 带宽 | 176 TB/s | 130 TB/s | −26% |
| HGX Rubin NVL8 系统 HBM 容量 | 2.3 TB | 2 TB | −13% |

ServeTheHome 在 10 月 31 日发表了这份对比，并指出这次修改是 IT Home 在英伟达 9 月更新的架构数据表中发现的——而时间点恰好是首批 Vera Rubin NVL72 系统开始向超大规模客户普遍供货的时刻。换句话说，这些数字恰恰在它从“预览”变成“可以买到的硬件描述”的那一刻被改掉了。

单看每引脚速率，一行就能讲清：8 颗 HBM4 堆叠、每颗 2,048 位宽，最初的 22 TB/s 意味着每引脚约 10.75 Gbps，量产版 19.2 TB/s 意味着 9.375 Gbps。仍然远高于 JEDEC 的 HBM4 标准上限 8 Gbps，但比当初宣传的明显后退了一步。

## NVL8 的问题更严重——也更混乱

八卡 HGX Rubin NVL8 才是大多数云厂商和企业真正会部署的系统，而不是旗舰 72 卡机柜，而它受到的打击最大：带宽下调 26%，容量从 2.3 TB 降到 2 TB。它里面还有一个英伟达尚未解释的不一致：8 颗 GPU 每颗 19.2 TB/s，加起来应该是约 154 TB/s，而不是 HGX 页面上写的 130 TB/s。而且英伟达的部分页面至今仍显示最初的数字。TweakTown 和 VideoCardz 都指出，公司的文档目前自相矛盾——而这些规格正是超大规模客户用来规划数十亿美元集群采购的依据。

这个不一致恰恰是这件事不止于“四舍五入修正”的最有力证据。一次干净利落、有解释的修改，本来没什么可说的：preliminary 规格本来就会变。但一次靠网页考古才被发现的修改，几个月后才曝光，不同页面互相打架、又没有任何解释，留给买家的只有猜测：容量规划到底该用哪个数字。

## 为什么偏偏是带宽重要

对训练来说，互联和显存带宽往往远早于原始算力成为瓶颈：一颗算得比显存喂得快的 GPU，大量时间都在空等。这里的下调并不会让 Rubin 变慢——单卡 19.2 TB/s 依然是天文数字，而且 scale-out 网络带宽反而提高了 12.5%，这对大型训练任务所在的多节点集群是有利的。但方向本身对竞争叙事很重要：后续报道指出，AMD 在 2026 年 7 月发布的 Helios 平台，在公布的单卡显存带宽和机柜级带宽数字上如今领先于 Rubin。这些都是纸面比较，不是实测，双方的数字都还没有在量产芯片上得到独立验证。即便如此，一个纸面上的领先缩小乃至反转，会先于任何 benchmark 出现在采购会议上。

## 判断

英伟达的辩护——如果这算辩护的话——在技术上成立：最初的数字标注了 preliminary、“subject to change”。没有人有权要求一个预览数字永不改变。但这个辩护错过了这件事为什么会传开：修改没有公告，是几个月后靠对比存档页面才被发现的。整个 AI 基础设施市场节奏的制定者，在旗舰产品开始出货的那一刻悄悄修改了它的规格，还让自家页面互相矛盾。

实际结论很窄、也很有用：如果你在评估 Rubin 系统，请用量产数字——单卡 19.2 TB/s、NVL72 机柜 1,400 TB/s、NVL8 系统 130 TB/s——并把任何基于最初 22 TB/s 建的容量模型视为高估了约八分之一。而如果你是英伟达，教训比带宽便宜得多：一段 changelog 不花一分钱，它的缺席才是把一次常规规格修改变成信任故事的原因。硬件本身可能没问题，沉默才是值得批评的产品决策。

## 来源

- ServeTheHome, "NVIDIA Updates Rubin GPU Specs as First Production Hardware Arrives," October 31, 2026: https://www.servethehome.com/nvidia-updates-rubin-gpu-specs-as-first-production-hardware-arrives/
- VideoCardz, "NVIDIA quietly cuts Vera Rubin specs, HBM4 bandwidth and NVLink 6 speeds now lower," October 2026: https://videocardz.com/newz/nvidia-quietly-cuts-vera-rubin-specs-hbm4-bandwidth-and-nvlink-6-speeds-now-lower
- TweakTown, "NVIDIA cuts Vera Rubin's memory bandwidth by up to 26%, and AMD's Helios now leads in memory bandwidth," October 2026: https://www.tweaktown.com/news/114304/nvidia-cuts-vera-rubins-memory-bandwidth-by-up-to-26-percent-and-amds-helios-now-leads-in-memory-bandwidth/index.html
