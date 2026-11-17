---
title: 'Google''s Fourth TPU in a Year Takes Aim at NVIDIA — and at the Customers NVIDIA Can''t Serve'
description: 'Google announced TPU 8tx and TPU 8i Max on November 9, completing four TPU systems in a single year. One keeps data encrypted while AI works on it; the other doubles memory bandwidth for giant context windows. Both are vendor claims with no independent benchmark and no ship date beyond "2027" — and Bloomberg Intelligence still thinks the business could top $135 billion by 2028.'
date: 2026-11-09
permalink: /life/google-tpu-8tx-8i-max/
tags:
  - Google
  - TPU
  - AI Chips
  - NVIDIA
  - AMD
  - Cloud
excerpt: 'Four TPU systems in one year is a first for Google. The catch is in the fine print: these are new systems, not new chips — and none of the performance numbers has been independently tested.'
---

> [中文版 Chinese version](/life/google-tpu-8tx-8i-max-zh/)

![Google's eighth-generation TPU portfolio: 8t, 8i, 8tx and 8i Max](/assets/images/life/2026-11-09-google-tpu-8tx-8i-max/tpu-lineup.jpg)

*Google's eighth-generation TPU portfolio: 8t, 8i, 8tx and 8i Max. Image: Google.*

## What Google announced

On Monday, November 9, Google expanded its eighth-generation TPU portfolio with two new systems: TPU 8tx, built for secure and confidential inference, and TPU 8i Max, built for massive context windows. With the TPU 8t (training) and TPU 8i (reasoning) introduced at Google Cloud Next in April, that makes four TPU systems in a single year — a first for the company, according to Amin Vahdat, Google's SVP and chief technologist for AI and infrastructure, who wrote the announcement on Google's blog.

The timing is not subtle. It lands on the same morning NVIDIA's stock is falling on its board investigation, and it is the most aggressive move yet in Google's campaign to sell its custom AI chips to other companies, not just use them internally for Gemini. Alphabet shares rose in premarket trading on the news while NVIDIA fell, according to early market reports.

## A decade of TPUs

Four systems in a year sounds like a sprint, but it is the payoff of a project that started more than a decade ago. Google began designing its first custom AI accelerator in 2013, after projecting that voice search over neural networks would force it to double its entire data-center compute capacity. The first TPU entered production in 2015 and was disclosed at Google I/O 2016 — a 28 nm chip delivering roughly 92 TOPS at 75 watts, which powered Search, translation, and the AlphaGo match before the world knew it existed. TPU v2, announced in 2017, was the first generation that could train models, and Google began renting TPUs through Google Cloud in 2018.

The climb since then has been steady: Trillium (TPU v6e), announced in May 2024, delivered 4.7 times the peak compute of v5e per chip. Ironwood (TPU v7), unveiled in April 2025 as the first TPU built specifically for inference, delivers 4,614 FP8 TFLOPS per chip with 192 GB of HBM3e memory, in pods scaling to 9,216 chips. Broadcom co-designs the chips and supplies them under agreements running to 2031.

The customer list is what turned an internal project into a business. In October 2025, Anthropic agreed to use up to one million TPUs in an expansion worth tens of billions of dollars. In February 2026, The Information reported that Meta — NVIDIA's biggest customer — signed a multibillion-dollar deal to rent TPUs, and was separately negotiating to buy chips outright for its own data centers from 2027. Google Cloud's revenue grew 82% in the June 2026 quarter to $24.8 billion. For ten years the answer to "can I buy a TPU?" was no; in 2026, for a few customers, it became yes.

## The two systems

**TPU 8tx — the lockbox.** It is built on the same silicon as the TPU 8t, paired with 5th Generation AMD EPYC processors as host CPUs — AMD confirmed in its own announcement that 8tx is the first cloud TPU system with hardware-enforced confidential computing. Normally data is encrypted at rest and in transit, but must be unlocked in memory while a computer processes it. Google says 8tx keeps sensitive data and model weights protected and isolated even while in active use, so regulated enterprises and governments can run frontier models and autonomous agents against their most sensitive data. It also adopts the low-latency Boardfly network from the 8i, which Google says delivers up to 2x lower latency than TPU 8t with a near-zero performance penalty, and it supports small-scale training — fine-tuning, distillation and reinforcement learning — without moving private data between clusters.

**TPU 8i Max — the memory play.** It attacks what Google calls the memory wall: when dozens of AI agents reason across a whole codebase or hours of video at once, memory bandwidth becomes the bottleneck. Google's fix is to put two low-latency TPU 8i chips on a single package, delivering double the compute, double the SRAM and double the HBM bandwidth of TPU 8i, while fitting twice the silicon into the existing rack footprint. For reference, a single TPU 8i pairs 288 GB of high-bandwidth memory with 384 MB of on-chip SRAM.

The eighth-generation baseline, from April: TPU 8t offers up to 2.7x better training performance and TPU 8i up to 80% better inference price-performance than the previous generation, per Google. The TPU business now serves nearly 100 customers, including frontier labs, trading firms, retailers and universities; Bloomberg names Apple, Meta and Oracle among them.

## The memory wall, explained

The 8i Max exists because of a shift in what AI workloads actually do. A chatbot answering one question needs the model's weights and a small working memory. An agent reasoning across an entire codebase, or dozens of agents reasoning across hours of video at once, needs something else: a KV cache — the stored keys and values of everything the model has already read — that grows with every token of context. When the cache gets large enough, the bottleneck stops being how fast the chip can multiply numbers and becomes how fast it can read the cache back. That is the memory wall: compute waiting on memory.

Doubling the chips in a package attacks the wall in two ways: it doubles HBM bandwidth, so the cache can be read twice as fast, and it doubles the on-chip SRAM — the fastest, closest memory — so more of the working set never leaves the chip. Packaging two chips together also keeps them closer than two chips connected over a network, which is why Google can claim the latency stays low. None of this is new — NVIDIA's NVL72 rack does the same with 72 GPUs and NVLink — but it is the first time Google has sold it as a TPU product aimed at a specific workload.

## Confidential computing: what the lockbox actually is

The 8tx's pitch — data stays encrypted while AI works on it — sounds like magic, and the mechanism is worth understanding, because it defines both what the product can do and what it cannot. The gap it closes is called data-in-use: data is encrypted at rest on disk and in transit over the network, but the moment a computer processes it, the data is decrypted in RAM and GPU memory. Anyone with access to the host — a compromised hypervisor, a rogue cloud administrator, a memory-dump attack — can read it in plaintext.

Confidential computing closes that gap with a hardware Trusted Execution Environment (TEE): a region of the CPU or GPU whose memory is encrypted with keys the silicon itself generates and holds, which the host can never see. AMD calls its version SEV-SNP, Intel calls its TDX, and NVIDIA added a confidential-computing mode starting with its Hopper-generation GPUs. The host can still schedule the VM, starve it, or kill it — but it cannot read its memory, and the CPU will sign a report, called an attestation, saying what firmware and image the VM launched with. A remote party checks that signature before releasing any key or secret. That signed report is the whole product: trust you can verify, rather than a privacy policy you have to take on faith.

The overhead is real but small: published measurements on H100 confidential computing put the GPU throughput cost at roughly 4–8%, and NVIDIA says up to 98% of unsecured performance. What a TEE does not cover matters too: it does not stop side-channel attacks or the host watching network traffic, and it cannot prove what the code inside the enclave does with your prompts — only which code is running. Google's claim is narrower than "the first confidential AI chip": 8tx is the first cloud TPU system with hardware-enforced confidential computing. NVIDIA's Hopper and Blackwell have had it for years. The wedge is that it is a TPU, in Google's cloud, for customers who would rather not buy NVIDIA at all.

## The fine print

Read the announcement carefully and the caveats stack up fast:

- **Systems, not chips.** Google is explicit about this distinction, and it matters. Neither new product is new silicon. The 8tx reuses 8t silicon; the 8i Max repackages two existing 8i chips. What Google is selling is packaging speed — the ability to reconfigure around existing chips in months rather than waiting years for a new die.
- **No ship date beyond "2027."** The blog post gives no availability date. Vahdat told Bloomberg the systems will be available next year. No price, no named customer, no region.
- **No independent numbers.** Every performance figure — the 2x latency cut, the doubled compute and bandwidth, the 2.7x training gain — is Google's own claim about its own hardware. No independent benchmark, no third-party audit, no customer result has been published for either system. Google cites state-of-the-art price-performance on industry-standard InferenceX and AgentX benchmarks for its vLLM-TorchTPU stack, but those are software-stack results on existing hardware, not tests of the two new systems.
- **The $135 billion is an estimate.** Bloomberg Intelligence estimates Google's direct TPU hardware and software sales could top $135 billion by 2028, up from an estimated $12 billion in 2026, with TPUs priced about 30% below NVIDIA GPUs. That is a forecast, not revenue — and it assumes Google can convert internal capacity into external sales at a pace it has never demonstrated.

![Bloomberg Intelligence estimate: Google TPU hardware and software sales](/assets/images/life/2026-11-09-google-tpu-8tx-8i-max/tpu-sales-en.png)

*Bloomberg Intelligence estimate, via Bloomberg News, November 9, 2026. Chart: this site.*

The software push is real, and it is the part with dates attached: Google open-sourced TorchTPU last month so PyTorch code and Hugging Face models run natively on TPUs; it is open-sourcing TPU Sync, a model-state layer for TPU clusters; Cloud Pathways on GKE and GKE dynamic slicing are now generally available. The message is that TPUs are becoming as easy to use as general-purpose hardware — the historic objection to buying them.

## The $135 billion arithmetic

Twelve billion dollars in 2026 to more than $135 billion in 2028 is an eleven-fold increase in two years — a growth rate no chip business has ever sustained, including NVIDIA's. It assumes three things at once: that Google can manufacture TPUs at that scale, that customers like Anthropic and Meta will keep buying at that pace, and that Google will choose to sell capacity externally rather than keep it for Gemini. The first runs into Broadcom's production ramp; the second runs into the fact that Anthropic's million-TPU deal is an agreement to use, not a fixed purchase order; the third runs into Google's own history — for a decade, TPUs were the moat, and Google kept the moat. The 30% price gap to NVIDIA GPUs is the most concrete part of the estimate, and the most fragile: NVIDIA can cut prices. Treat $135 billion as a scenario, not a forecast — the number you get if everything goes right, twice in a row.

## The other side of the same day

NVIDIA did not spend the morning standing still. It also announced on November 9 an expanded sovereign AI collaboration with Korea's Ministry of Science and ICT, centered on Rebellions' R200 processors linked through NVLink Fusion, with deployment at SK Telecom expected in 2028. The hardware split is deliberate: NVIDIA GPUs handle prefill, Rebellions NPUs handle decode. NVLink Fusion — NVIDIA's interconnect, opened to third-party chips — is the strategic tell: if Google's pitch is "our chips are cheaper," NVIDIA's answer is "our interconnect is the platform everyone builds on."

## The judgment

The honest way to read this announcement is as a packaging story, not a silicon story. Google's real advantage is not that it designed a better chip this year — it didn't; it repackaged two it already had. Its advantage is that it can ship a purpose-built system for a specific customer problem (encrypted inference, giant context) in months, while a new chip takes years. That is a genuine capability, and the confidential-compute wedge is well chosen: it is a market of governments and regulated enterprises that NVIDIA's general-purpose GPUs do not natively serve, and where "your data never leaves its lockbox" is a purchasing criterion, not a feature bullet.

But none of it is proven yet. No price, no customer, no benchmark, no date tighter than "2027." The $135 billion figure is doing a lot of work for a business that did an estimated $12 billion this year. Google has earned the right to be taken seriously as a chip vendor — four systems in a year, nearly 100 customers, and a software stack that finally meets developers where they are. It has not yet earned the $135 billion. The difference between those two sentences is what 2027 is for.

*Sources: Google blog, "Introducing TPU 8tx and TPU 8i Max," by Amin Vahdat, November 9, 2026 (blog.google); Bloomberg News, November 9, 2026, via JournalArta and abloominst-247 (Bloomberg Intelligence $135B estimate, ~30% price gap, 2027 availability, Alphabet/NVIDIA premarket moves, Apple/Meta/Oracle as customers); Pulse2, November 9, 2026; AI Weekly, November 9, 2026 (5th Gen AMD EPYC hosts, 8i Max specs); WebProNews, November 9, 2026 (AMD's confidential-computing announcement, 9 a.m. PT broadcast); Chris Abraham, November 9, 2026 (NVIDIA–Korea sovereign AI, Rebellions R200, NVLink Fusion, SK Telecom 2028). Additional sources for the expanded sections: AI Wiki / Clarigital (TPU history: 2013 voice-search projection, v1 2015 28 nm, 92 TOPS, 75 W, AlphaGo 2016, v2 2017, Cloud TPU 2018, Trillium v6e May 2024 4.7x v5e, Ironwood v7 April 2025 4,614 FP8 TFLOPS, 192 GB HBM3e, 9,216-chip pods, Broadcom co-design and agreements to 2031, Anthropic up to one million TPUs October 2025, Meta multibillion-dollar rental February 2026, Google Cloud +82% June 2026 quarter to $24.8B); Ajay K. / Cohere / DEAI / System Hardening (confidential computing: AMD SEV-SNP, Intel TDX, NVIDIA Hopper CC, attestation, 4–8% overhead per ETH Zurich, NVIDIA up to 98%, TEE limitations).*
