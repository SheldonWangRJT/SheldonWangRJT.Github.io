---
title: "NVIDIA's Vera CPU Takes On x86 — and Rubin HPC Packs 50,000-Plus CUDA Cores"
description: 'At SC26 in Chicago, NVIDIA announced the Vera CPU rack-scale platform for scientific computing — 192 of its first fully custom data center CPUs in one liquid-cooled rack — plus the Rubin HPC GPU with more than 50,000 CUDA cores. It is the first major product news since Jensen Huang resigned, and it lands one day before NVIDIA reports earnings.'
date: 2026-11-16
permalink: /life/nvidia-vera-cpu-rubin-hpc-sc26/
tags:
  - NVIDIA
  - Vera
  - Rubin
  - HPC
  - Hardware
  - AI
excerpt: 'Four days after its CEO resigned, NVIDIA showed up at SC26 with a CPU that takes on Intel and AMD at their own game.'
---

> [中文版 Chinese version](/life/nvidia-vera-cpu-rubin-hpc-sc26-zh/)

![NVIDIA headquarters in Santa Clara, California.](/assets/images/life/2026-11-16-nvidia-vera-cpu-rubin-hpc-sc26/nvidia-hq-1200.jpg)

*NVIDIA headquarters in Santa Clara, California. Photo: Coolcaesar, via Wikimedia Commons (CC BY-SA 4.0).*

## What happened

NVIDIA used the SC26 supercomputing conference in Chicago on Monday, November 16, to unveil two pieces of hardware aimed squarely at scientific computing — and, not incidentally, at Intel and AMD.

The first is the **Vera CPU rack-scale platform**. Vera is NVIDIA's first fully custom data center CPU: **88 custom Olympus cores, 176 threads**, and SOCAMM2 LPDDR5X memory delivering up to 1.2 TB/s of bandwidth per chip. The rack packs **192 Vera CPUs** with about 300 TB of memory and 1 PB of storage into a fully liquid-cooled NVIDIA MGX design, tied together with Quantum-X800 InfiniBand networking and delivering more than 200 TB/s of aggregate peak memory bandwidth. The racks will be sold by Dell Technologies, HPE, Lenovo, and Supermicro starting in **early 2027**, and the HPC SDK 26.11 — compilers and libraries tuned for Vera — is available now.

The second is the **Rubin HPC GPU**, a new member of the Vera Rubin platform built for simulation and data processing in science, engineering, and analytics. NVIDIA says it carries **more than 50,000 CUDA cores on a single chip** — a record count, by its own claim — plus sparse data acceleration and seventh-generation NVLink. It is expected to be available in **2028**. NVIDIA published no price and no memory, FP64 throughput, or power figures.

![NVIDIA's claimed Vera speedups over x86.](/assets/images/life/2026-11-16-nvidia-vera-cpu-rubin-hpc-sc26/vera-speedups-en.png)

*NVIDIA's claimed Vera speedups over x86. Source: NVIDIA Newsroom, November 16, 2026. These are the vendor's own tests; the x86 systems are unnamed in the release, and the company's performance brief lists a two-socket AMD EPYC 9755 system as the comparison point.*

## From Grace to Vera: how NVIDIA learned to build a CPU

Vera is NVIDIA's second data center CPU, and the difference between the two generations is the story. The first, Grace, was announced at GTC 2021 as NVIDIA's first Arm-based data center CPU — a chip the company was careful to position as a companion to its GPUs, not a rival to Intel's Xeon or AMD's EPYC. Grace debuted in 2023 as a 72-core Arm Neoverse design with LPDDR5X memory and a 900 GB/s NVLink-C2C link to the GPU, and the Grace Hopper Superchip that paired it with a Hopper GPU went into full production in May 2023. Nine supercomputers adopted the GH200 in 2024, and the JEDI system built on it topped the Green500 energy-efficiency list. Grace proved NVIDIA could build a credible server CPU and, more importantly, that supercomputing centers would buy one — but it was still, by design, the junior partner in a GPU system.

Vera changes the job description. The cores are no longer licensed Arm Neoverse cores; they are **88 custom Olympus cores** designed by NVIDIA itself, with two threads each — the first time NVIDIA has designed a CPU core from scratch for the data center. The memory bandwidth jumps to 1.2 TB/s per chip, and the CPU-to-GPU link rises to 1.8 TB/s of NVLink-C2C, double Grace's. And the packaging tells you who the customer is: eight Vera CPUs sit in each 1U tray, and the rack reuses the NVL72 chassis, power distribution, and cooling components from NVIDIA's AI systems. This is not a CPU that happens to sit next to a GPU. It is a CPU sold as a rack-scale system in its own right, for workloads that run on CPUs alone — climate models, molecular dynamics, weather forecasting — the workloads that have been x86 territory for decades.

The software arrives with the hardware, which is the part that decides whether a new CPU lives or dies. HPC SDK 26.11 ships now with Vera-optimized compilers and libraries, and NVIDIA also released a public beta of its next-generation Fortran compiler — a telling detail, because Fortran is still the language a large share of scientific code is written in, and a new CPU architecture without a good Fortran compiler is a paperweight to its target customers.

## The numbers NVIDIA wants you to see

NVIDIA's pitch for Vera is memory bandwidth and efficiency, not raw core count. In its own tests on OpenFOAM's motorBike Large airflow simulation, Vera delivered **1.9x the performance and 2.4x the performance per watt** of x86 systems. On the open-source Weather Research and Forecasting model, it claims **1.6x the performance and 2x the energy efficiency**.

That pitch is aimed at a real weakness in how scientific computing is measured. Most of the workloads Vera targets are memory-bound: the processor spends more time waiting for data than computing on it. The industry's headline benchmark, LINPACK, measures dense arithmetic and flatters machines built for it; the memory-bound HPCG benchmark tells a different story — on the November 2025 list, none of the top ten systems ran HPCG faster than about 3 percent of their LINPACK peak, by one calculation. Vera's bet is that the bottleneck that matters is moving data, not multiplying numbers, and that a CPU built around 1.2 TB/s of memory bandwidth per chip will win the workloads that actually run in production, even if it never tops a LINPACK chart.

Treat those numbers as a vendor benchmark, not a verdict: the release does not name the x86 chips, no independent measurements exist yet, and the first systems do not ship until early 2027. What is independently verifiable is the customer signal — the German Climate Computing Center (DKRZ) has selected Vera CPUs for its **HLRE-5 supercomputer**, alongside NVIDIA GB200 Grace Blackwell systems, built by Bull and expected in early 2028. The contract is worth €40 million including five years of support — a real, paid commitment from a national climate center, not a letter of intent.

NVIDIA also announced **Nemotron for Science** at the show: an open model package combining the Nemotron 3.5 Super VL model, the LitmusBench v0.2 chemistry dataset of nearly 50,000 questions, and post-training recipes — the software side of the same pitch, that AI agents plus fast simulation equal faster discovery. Ian Buck, NVIDIA's vice president of hyperscale and HPC, framed the week as science entering "the age of agents": software that can plan experiments, run code, and check results on researchers' own systems.

## Rubin HPC, decoded

Rubin HPC is the thinner announcement of the two, and the more revealing one about where NVIDIA thinks the market is going. It is a GPU in the Vera Rubin platform — named for astronomer Vera Rubin — but it is not the Rubin GPU built for AI training. That chip has 28,672 CUDA cores. Rubin HPC has more than 50,000, about three times as many as Hopper, according to Ian Buck's keynote — a record count for a single NVIDIA GPU, and at least 1.7 times the standard Rubin chip.

The core count is the headline, but the more interesting claim is the one NVIDIA has not explained. The chip adds what the company calls sparse data acceleration, aimed at four patterns that recur in scientific code: sparse matrix operations, stencil computations, sorting, and reductions. These are the kernels that dominate climate models, engineering simulation, genomic analysis, and financial risk modeling — and they are exactly the memory-bound workloads where throwing more arithmetic at the problem does nothing, because the cores spend their time waiting for data. NVIDIA says the design scales data movement together with compute so the cores spend their time computing rather than waiting. It has not said how.

That is why the missing numbers matter more than the published one. NVIDIA has released no memory capacity or type, no memory bandwidth, no FP64 throughput, and no power draw for Rubin HPC. For context, the standard Rubin GPU lists about 33 teraflops of FP64 and 288 GB of HBM4 memory — but Rubin HPC is tuned for different work, and without bandwidth and double-precision figures there is no way to compare it on simulation speed. A core count does not show how fast a code will run, and neither does an FP64 peak when the code waits on memory. Until NVIDIA publishes those figures and independent groups measure real kernels, more than 50,000 cores is a count, not a forecast. And with availability expected in 2028, the specifications can still change.

## Why this one matters

The timing is the story. This is NVIDIA's first major product announcement since **Jensen Huang resigned as CEO on November 12**, and it lands one day before the company's earnings report on November 17 — the first earnings call without Huang. The message to the market is unmistakable: the roadmap does not depend on one person. The person delivering it is also part of the message: Colette Kress, the chief financial officer, is serving as interim CEO, and it was Ian Buck — an engineering leader, not a caretaker spokesperson — who kicked off NVIDIA's week at SC26. The company is showing the bench, not just the roadmap.

The product story is just as pointed. NVIDIA has spent years selling GPUs that sit next to someone else's CPU. Vera changes that: NVIDIA now sells the CPU too, in a rack designed to run the simulation workloads that have been x86 territory for decades. Intel, notably, is pitching its own FP64-capable GPU at the same show — the two companies are now invading each other's home turf at the same time.

Rubin HPC is the longer bet and the thinner announcement: a 2028 product with a headline core count and no published specs is a roadmap marker, not hardware. But the direction is clear. NVIDIA is no longer just the AI training company. It wants the whole scientific computing stack — CPU, GPU, networking, and the software in between — and it is willing to say so the week its founder leaves.

What to watch next is straightforward. First, the earnings call on November 17: whether the company gives Vera and Rubin HPC any revenue framing, and how it talks about demand without Huang in the room. Second, the DKRZ HLRE-5 build, which is the first real-world test of whether Vera's memory-bandwidth pitch survives contact with production climate code. And third, the missing Rubin HPC numbers — memory bandwidth and FP64 throughput — which will decide whether the 50,000-core headline is a genuine step for simulation or just a big number on a slide. Until those appear, Vera is the announcement with evidence behind it, and Rubin HPC is the one with a promise.

*This post reflects the status as of the morning of November 16, 2026 (PT). Sources: NVIDIA Newsroom; NVIDIA Blog; StorageReview; AI Stock Wire; Unite.AI; ByteOrbital; Converge Digest; ServeTheHome; Tech Times.*

