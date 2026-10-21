---
layout: single
title: "Enterprise Agents Don't Fail on Retrieval. They Fail on Revision."
description: "MMEnterprise-Bench (Oct 20, 2026): the best model hits 83.3% on a single text record but 27.5% across multiple images and about one-third on conflicts — more retrieval buys recall, not resolution."
date: 2026-10-21 08:00:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - LLMs
  - Enterprise AI
  - RAG
  - Agents
  - Benchmarks
excerpt: "On MMEnterprise-Bench, GPT-5.6 Sol scores 83.3% on single-text questions, 27.5% on multi-image questions, and 32.5–36.3% on conflicts. The bottleneck is deciding which version wins."
---

> [中文版 Chinese version](/ai%20engineering/llms/enterprise-agents-conflict-bench-zh/)

![MMEnterprise-Bench: GPT-5.6 Sol accuracy by evidence type (k=10)](/assets/images/posts/2026-10-21-enterprise-agents-conflict-bench-chart.png)

## The result in one line

Enterprise agents do not mainly fail because they cannot find the record. They fail because the workspace disagrees with itself — and the model has to decide which version wins.

MMEnterprise-Bench, released as a preprint on October 20, 2026 (arXiv:2610.27911), tests exactly that situation: workplace records that are shared, corrected, and revised, with the old versions kept rather than overwritten.

## What was built

- **1,613 questions** over **30 simulated collaboration projects**, seeded from public papers and reports.
- **7,140 retrieval records** in one shared workspace corpus, including **1,415 visual records** (PDF pages, slides, and standalone images); the rest are chats, emails, meeting notes, trackers, reports, and documents.
- Three categories: **Evidence Reasoning (1,102 questions)** — extraction, attribution, computation, comparison, interpretation; **Conflict Resolution (424)** — 212 cross-source and 212 temporal; **Unanswerability (87)**, built by perturbing one entity or condition so no record supports an answer. In total, 1,526 questions are answerable and 87 are not.
- **10 proprietary and open-source multimodal LLMs** were evaluated.

Evaluation protocol matters for reading the numbers: a Qwen3-VL-Embedding retriever (2B by default; an 8B version was also released) ranks the 7,140 records, the top-k are presented ordered by timestamp and ID, and an LLM judge (GPT-5.6 Luna) compares each response with the reference answer. Accuracy is reported over all 1,613 questions.

## The cliff: same model, different evidence shape

For the strongest model, GPT-5.6 Sol, at the default k=10:

| Evidence shape | Accuracy |
|---|---|
| Single text record | 83.3% |
| 2+ text records | 51.5% |
| Single image record | 52.9% |
| Cross-source conflict | 36.3% |
| Temporal conflict | 32.5% |
| 2+ image records | 27.5% |
| Mixed text + image, 2+ records | 25.6% |

That is a 55.8-point gap between "the answer is in one clean text record" and "the answer spans multiple images" — for the same model, in the same benchmark, on the same day.

Overall, Sol reaches **52.6% at k=10** and **68.0% at k=50**. The best open-source model, Qwen3.5-27B, reaches 50.3% at k=50. Nobody is close to ceiling, and the errors concentrate exactly where real workplaces are messiest: Conflict Resolution scores 36.3% (cross-source) and 32.5% (temporal) at k=10, against 67.5% on plain extraction.

More retrieved records do lift the conflict scores — at k=50, Sol reaches 55.2% on cross-source and 56.1% on temporal conflicts — but they remain roughly 20 points below its extraction score at the same k (77.6%). Retrieval narrows the gap; it does not close it.

## Recall is not accuracy

The paper's most transferable finding is about the retrieval lever itself:

- Raising k from 50 to 100 lifts Evidence Recall@k from **57.0% to 64.8%** (2B retriever; 41.3% at k=10).
- Yet Qwen3.5-2B's overall accuracy **falls from 25.0% at k=50 to 22.2% at k=100** — more of the right evidence in context, worse answers.
- The larger 8B retriever adds recall (67.3% at k=100 vs. 64.8% for the 2B) but, in the authors' words, "not consistently accuracy."

For a frontier model, scaling k does help: Sol goes 52.6% → 68.0% → 75.9% across k=10, 50, 100 with the 2B retriever. So the honest statement is not "retrieval doesn't matter." It is: **retrieval scaling is model-dependent, and even where it works, conflict resolution stays the lowest slice.** If your dashboard only tracks recall, you will keep buying the lever that is easiest to measure.

## The unanswerability inversion

One more number worth stealing: on recognising that a question cannot be answered from the records, the overall leader is not the best model. At k=10, **Gemini 3.8 Flash scores 87.4% on Unanswerability vs. GPT-5.6 Sol's 65.5%**. The strongest reasoner is more willing to answer a question that has no supported answer. In an enterprise setting — a deadline, a figure, an approval — a confident obsolete or invented value is worse than an abstention.

## Caveats, stated plainly

- The projects are **simulated**: collaborative events were planned by an LLM and realised as synthetic chats, emails, and slides from public seed documents. This is not a measurement of any real company's deployment or worker outcomes.
- Scoring uses an **LLM judge** (GPT-5.6 Luna), not human grading of all 1,613 answers.
- Quality control was checked, not assumed: in a blind audit of 100 annotations by three annotators, 71% were rejected by no one and 29% by at least one; none of the 50 LLM-accepted items was rejected by any annotator, and all 29 human-rejected items had also been rejected by the LLM check.
- The headline slices above are at k=10 with the 2B retriever unless stated otherwise. Change k and the absolute numbers move — the ordering of the failure modes does not.

## What to do on Monday

1. **Build a 50-question conflict slice from your own revised documents** — 25 cross-source (same fact, different source) and 25 temporal (same fact, revised over time). This is the slice your general QA eval is hiding.
2. **Apply a 60% gate.** If your agent scores below 60% on that slice at your production k, freeze retrieval-budget and retriever-size increases. You do not have a retrieval problem yet; you have a precedence problem.
3. **Add an explicit version-precedence rule before you add context**: latest timestamp wins unless a named source outranks it, and require the answer to cite the record that superseded the old one. Test whether the rule, not the bigger k, moves the conflict slice.
4. **Track recall and conflict accuracy as two separate lines.** If recall rises two evals in a row while conflict accuracy is flat, stop spending on retrieval — that is the MMEnterprise-Bench pattern, reproduced in your own stack.
5. **Score abstention separately.** If your best model answers unanswerable questions more often than a cheaper model does, route low-evidence questions to the model that abstains better, not the one with the higher overall score.

## The debatable claim

Most enterprise RAG budgets are allocated backwards: the money goes to finding more evidence, while the failures come from adjudicating between evidence that was already found. Until an agent can show which version it believed and why, a larger context window is just a larger pile of contradictions.

Sources: MMEnterprise-Bench paper and project page (arXiv:2610.27911, released October 20–21, 2026).

