---
layout: single
title: "What Does a Harness Buy? Mostly Tokens — and a Bill"
description: "Liu and Han held the model fixed and swapped Claude Code, OpenCode and mini-SWE-agent on SWE-bench Verified: swapping flipped as many tasks as rerunning, cost differed up to 3x, and the only effect that beat noise was a loss."
date: 2026-10-26 07:55:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Coding Agents
  - Harness Engineering
  - Benchmarks
  - SWE-bench
excerpt: "Swap the harness under a fixed model and you flip 13% of tasks. Rerun the same harness and you also flip 13%. The harness does not decide the score — it decides the bill, by up to 3x."
---

> [中文版 Chinese version](/ai%20engineering/llms/harness-buys-tokens-zh/)

Every week a coding-agent vendor announces a pass-rate gain from a harness change: a new system prompt, typed file tools, automatic compaction, a smarter loop. Leaderboards then rank the resulting model-plus-harness combinations as if they were models. On October 23, Artificial Analysis launched Coding Agent Index v2.0 on exactly that basis — model-plus-harness scores across 290 tasks. A paper from Shandong University, widely debated in the coverage that followed on October 23–24, asks the prior question: if you hold the model fixed and swap only the harness, how much of that score was ever the harness?

The paper is *What Does a Harness Buy? Tokens, Mostly* (arXiv:2610.04433, submitted October 3, 2026), by Yangze Liu and Zhongyi Han of Shandong University. Its answer is in the title, and the method is what makes it hard to dismiss: the authors did the one control most harness comparisons skip — they reran identical configurations to measure how much a score moves when nothing changes at all.

## The setup

- **Harnesses, as shipped, versions pinned:** Claude Code 2.1, mini-SWE-agent 2.4.6 (a single bash tool, no context management beyond a hard stop), and OpenCode 1.18.
- **Models:** five open models — Qwen3.6-35B-A3B, Qwen3.8-27B, DeepSeek-V4-Flash, GLM-5.3-Flash, and HY4-Preview — plus Claude Opus 5 as an anchor inside Claude Code only.
- **Benchmark:** SWE-bench Verified, split into a 45-task hard subset (the two hardest difficulty bands, where a harness should matter most) and a 447-task pool, which is what gives the study the statistical power to bound a small effect.
- **Billing:** every arm priced under one price list from its own token counts, so cost comparisons are apples-to-apples.

## Finding 1: swapping the harness flips as many tasks as rerunning it

On the 45 hard tasks, swapping the harness flipped 13% of tasks at the median. Rerunning the *same* harness also flipped 13%. The spread across the three harnesses was two to five tasks out of 45 for every model, and rerunning one harness moved it by up to three. Worse for leaderboard purposes, the tasks a harness won in one run were not the tasks it won in the next — the "wins" do not replicate.

On the 447-task pool, Claude Code and mini-SWE-agent — the heaviest and the lightest harness — were equivalent within five points on both models run there. The paper's conclusion puts the resolution precisely: at the discordance observed, 45 tasks catch a 12.9-point gap only half the time and nothing at 80% power, while 447 tasks resolve about 5.2 points. Most published harness gains — a vendor in the paper's introduction advertises 2.4 points — sit below even the 447-task resolution.

A vendor's own harness on its own model bought nothing either: DeepSeek's harness on DeepSeek-V4-Flash passed 21 of 45 hard tasks, the same as Claude Code and one fewer than mini-SWE-agent, at the top of the bill rather than the bottom (1.04 CNY per trial against Claude Code's 0.98).

## Finding 2: the one effect that beats noise is a loss

OpenCode trailed by 8 to 9 points on Qwen3.8-27B on the large pool — the only harness gaps that cleared the noise, and they all point the same way: toward a harness *losing*. Half of that gap sat in runs its output cap cut short before a patch was written. Every other named harness failure is the same species: a hard stop at the context window with no compaction, a crash at the step cap, a search tool that could not run offline.

The authors' summary deserves quoting because it reframes where harness engineering pays: "What a harness buys, on this evidence, is fewer ways to lose a task, and a bill, not pass rate." And: "Every harness effect we could measure is a way to lose a task the model would otherwise solve."

A year-old Claude Code release (1.0.100) makes the same point from the other side: it passed within one task of current control runs at 0.44x the list-price cost, because it did not enable extended thinking by default. A year of harness releases moved the bill, not the score.

## Finding 3: the bill is set at the first call

With the same model, the same tasks, and one price list, cost per task differed by up to 3x across harnesses. The driver is not what tools return — per call, the three harnesses hand the model about the same amount of text. It is the fixed preamble of system prompt, tool schemas, and message wrapper that each harness re-sends on *every* step:

![Harness preamble tokens resent on every step: mini-SWE-agent 829, OpenCode 7,025, Claude Code 16,581](/assets/images/posts/2026-10-26-harness-buys-tokens-preamble.png)

- Claude Code: **16,581 tokens**
- OpenCode: **7,025 tokens**
- mini-SWE-agent: **829 tokens**

On GLM-5.3-Flash, where step counts were similar, that per-step weight is the whole story: 1.81 CNY per trial under Claude Code, 0.97 under mini-SWE-agent, 0.56 under OpenCode. On DeepSeek-V4-Flash the terms trade off instead — mini-SWE-agent took 141 steps to Claude Code's 104, its transcript grew with each one, and the lightest harness ended up moving the most tokens. The three numbers that carry between vendors, the authors argue, are the first call, the growth per step, and the step count.

Caching does not rescue the ranking: 96 to 99% of input tokens in every arm were already cache hits, and repricing each model's tokens under the other vendor's price list kept the harness order unchanged. The cache-hit price scales the bill; it does not reorder it.

## The one lead: thinking is a model-and-harness property

The single interaction the authors say they would chase is with explicit reasoning. Switching thinking off on Qwen3.6-35B-A3B cost mini-SWE-agent 11 points (p = .04) and moved Claude Code and OpenCode by less than the noise. On HY4-Preview, the same switch *inside Claude Code* cost 11 points — as much as the widest harness gap on that model — and cut output tokens by more than half. Dependence on thinking, in other words, belongs to the model-and-harness pair, not to the model alone. That is a genuinely useful warning against porting an effort setting from one harness to another and expecting the same behaviour.

## Caveats, stated plainly

- **One benchmark.** All headline results are SWE-bench Verified; a one-model check on Terminal-Bench 2.1 is only a transfer check, and general-purpose agents may be a different regime.
- **The closed frontier is mostly absent.** The three-harness ladder stops at HY4-Preview; Claude Opus 5 ran in Claude Code only, so the paper cannot say whether a closed frontier model shows the same gaps.
- **Offline conditions are a harness variable too.** OpenCode's shipped search tools cannot run offline, which is itself one of the "ways to lose" the paper counts — fair as a product observation, worth remembering when reading the size of its deficit.
- **This does not contradict co-training results.** Microsoft Research's Self-HPO (October 19) reported +7 points (57.8% to 64.8% average resolve rate) when an agent rewrote its own harness *and the model was then RL-trained inside it*. Swapping a harness buys nothing; training a model into a harness is a different claim, and the two results together draw the line precisely.

## What to do on Monday

1. **Discount any harness gain under 5 points to a tie** unless it was measured on 400+ tasks with a rerun control next to it. At 45 tasks, a comparison catches a 13-point gap only half the time — a 2–3 point vendor claim on a small task set is not evidence, it is a coin flip with a marketing department.
2. **Price the preamble before the pilot.** Log the first-call token count of any harness you evaluate. If it carries more than roughly 10,000 fixed tokens into every step, require deferred tool loading or a trimmed tool surface before rollout — that fixed cost, multiplied by your step count, is up to a 3x bill difference at identical scores.
3. **Spend harness engineering on loss prevention, in this order:** output-cap recovery (the single measured score effect in the study), compaction before the context hard stop, and tools that fail loudly instead of silently offline. Audit what share of your failed runs end in truncation or caps; if it is above 5% of failures, fix that before touching prompts.
4. **Never port a thinking/effort setting across harnesses untested.** The same on/off switch was worth 11 points in one model-harness pair and nothing in two others. Re-run your own 30–50 task slice after any harness *or* effort change, twice — once is not a measurement.

The thesis I would defend: a harness is not a capability layer, it is a reliability and cost layer. It does not win tasks the model would otherwise lose; it loses tasks the model would otherwise win, and it sets what every step costs. Buy it, benchmark it, and staff it accordingly.

## Sources

- Liu & Han, *What Does a Harness Buy? Tokens, Mostly*, arXiv:2610.04433 — https://arxiv.org/abs/2610.04433v1 (full text: https://arxiv.org/html/2610.04433v1)
- Artificial Analysis, Coding Agent Index v2.0 launch coverage (October 23, 2026) — https://aicoder.com/news/news-20261023-artificial-analysis-coding-agent-index-v2-frontiercode
- Microsoft Research Self-HPO coverage (October 19, 2026) — https://explainx.ai/blog/self-hpo-harness-policy-optimization-coding-agents-microsoft-research-2026
