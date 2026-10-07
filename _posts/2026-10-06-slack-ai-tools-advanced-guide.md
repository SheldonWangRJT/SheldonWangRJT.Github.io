---
layout: single
title: "Slack AI for Power Users: Built-In AI, Agents, and Building Your Own Apps"
description: "An engineer's map of Slack's three AI layers — built-in Slack AI, agents like Agentforce and Slackbot, and the Bolt/APIs for building your own AI apps, hooks, and slash commands."
date: 2026-10-06 19:45:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Slack
  - AI Agents
  - LLM
  - MCP
  - Bolt
excerpt: "Slack now has three distinct AI layers. Knowing which one you're actually using — and where the API seams, ack deadlines, and rate limits are — is the difference between a demo and a tool your team relies on."
---

> [中文版 Chinese version](/ai%20engineering/llms/slack-ai-tools-advanced-guide-zh/)

Your company just turned on Slack, and within a week someone asks: "Can it summarize this channel? Can I ask it questions? Can we hook our own model into it?" Those are three different questions about three different layers of the product. Slack's AI surface is not one thing — it's a stack, and each layer has a different owner, a different permission model, and a different ceiling. This is the map I wish I'd had on day one.

## Layer 1: Built-in Slack AI — what you already pay for

Since the plan changes that began rolling out on July 17, 2025, core Slack AI features are bundled into paid plans instead of sold as a separate add-on (Business+ went from $12.50 to $15 per user/month on annual billing in the same move). The tiering matters:

- **Pro**: conversation and thread summaries, AI huddle notes.
- **Business+**: everything in Pro, plus AI search answers, daily recaps, translations, file summaries, and workflow generation.
- **Enterprise+**: everything above, plus enterprise search across connected apps.

Two of these deserve an engineer's attention. **Search answers** are retrieval over your workspace — ask a question, get an answer grounded in messages and files you have permission to see. **Enterprise search** extends that retrieval across connected systems. Both are strictly permission-trimmed: the model only sees what the asking user can see. That's the right architecture, and it's also the ceiling — you don't choose the model, you don't add tools, and you can't change the retrieval behavior.

The other built-in worth knowing is the reimagined **Slackbot**. Announced at Dreamforce 2025 as a personalized agent — grounded in your conversations, files, calendar, and connected apps, always within your permissions — it began rolling out to Business+ and Enterprise+ customers in January 2026. Treat it as the reference implementation of what Salesforce thinks an in-Slack agent should feel like: a sidebar assistant that answers, drafts, and acts. If your users are happy with it, Layer 1 may be all you need. If they start asking for *your* data, *your* tools, or *your* model — keep reading.

## Layer 2: Agents in Slack — someone else's agent, your workspace

**Agentforce in Slack** became generally available in January 2025: Salesforce customers can deploy Agentforce agents into channels and DMs, where they answer questions and run actions against Salesforce data. Around it, the Slack Marketplace now hosts third-party agents from vendors like Anthropic, Perplexity, Notion, and Writer. You install them like apps; pricing is set by each vendor.

The interesting part for engineers isn't the agents themselves — it's the plumbing Salesforce built to feed them, because you can use it too:

- **Real-Time Search (RTS) API**: query Slack's conversational data on demand, permission-trimmed to the requesting user, instead of bulk-exporting and indexing messages yourself. No local copy of the corpus, no stale index.
- **Slack MCP server**: Slack's hosted Model Context Protocol server (at `mcp.slack.com`) gives any MCP-compatible client — Claude, ChatGPT, Cursor, Perplexity — a standardized set of tools to search, read, and post in Slack, authenticated via OAuth as the user, behind a workspace admin approval flow.

Both were announced in closed beta in October 2025 ahead of Dreamforce and reached general availability on **February 17, 2026**. The security model is the point: an external agent connected through MCP acts *as you*, sees only what you can see, and operates inside Slack's audit and app-approval controls. Compare that with the pre-2026 pattern — a bot token with broad history scopes, quietly reading everything — and you can see why Salesforce rebuilt the access path.

## Layer 3: Build your own — Bolt and the assistant app pattern

When you need your own model, your own tools, or your own data, you build an app. Slack's framework is **Bolt** (JavaScript, Python, Java), and for AI apps there's a specific surface: **Agents & AI Apps**, which puts your app in the assistant container — the same sidebar UI Slackbot uses. It requires a paid plan, and Bolt's `Assistant` class wires up the lifecycle:

- `assistant_thread_started` — a user opens a thread with your app. Greet them, save the thread context, and set **suggested prompts** (up to 4) via `assistant.threads.setSuggestedPrompts`. The context tells you which channel the user was looking at, so prompts can be contextual: "Summarize this channel" only makes sense when there *is* a channel.
- `assistant_thread_context_changed` — the user switches channels mid-conversation. Persist the new context (Bolt's default store stashes it in message metadata) or your answers will quietly be about the wrong channel.
- `message.im` — the user sends a message in the thread. This is where your LLM call happens.

Two more `assistant.threads.*` methods round out the UX: `setStatus` shows a live status line ("is thinking…", "is searching the runbook…") while you work, and `setTitle` names the thread for the history tab. For the reply itself, Slack now has real **streaming**: `chat.startStream` opens a message, `chat.appendStream` appends chunks (markdown text chunks, and `task_update` chunks that render agent tool calls as task cards), and `chat.stopStream` seals it. Streaming isn't cosmetic — a 20-second agent run with visible progress gets tolerated; the same run behind a silent spinner gets abandoned.

The mental model: the assistant thread is a session, channel context is ambient state you must track explicitly, and every turn is ack-fast-then-work — which brings us to the sharpest edge in the whole platform.

## Slash commands that call an LLM: the 3-second rule

A slash command like `/ask` or `/summarize` is the cheapest possible AI entry point — no app home, no assistant container, just a POST to your server with the command text, user, channel, a `trigger_id`, and a `response_url`. Slack's own docs ship an `/ask-code-assistant` example in exactly this shape.

The constraint that shapes everything: **your server must acknowledge within 3,000 milliseconds**, or the user sees an `operation_timeout` error. No LLM on earth answers a real question in 3 seconds once you add retrieval. So every production slash-command AI app uses the same deferred pattern:

1. `ack()` immediately — an empty 200, or a small ephemeral "Working on it…".
2. Do the slow work asynchronously: assemble context, call the model.
3. Deliver the answer afterwards, either by POSTing to the `response_url` from the original payload or by calling `chat.postMessage` yourself (which also gives you threading control via the first message's `ts`).

Decide visibility deliberately: responses default to `ephemeral` (only the invoker sees them); set `response_type: "in_channel"` when the answer belongs to the whole channel. One structural quirk to design around: custom slash commands can't be invoked inside message threads, so if your users live in threads, a command is the wrong surface — use a mention or the assistant container instead.

## Events and hooks: the trigger fabric

Slash commands are pull. The rest of Slack AI is push, and the trigger fabric has three pieces:

- **Events API**: subscribe to `app_mention` to wake your agent when it's @-mentioned in a channel, and to `message.*` events for ambient triggers (a message in an incidents channel, a specific emoji reaction used as a "summarize this" signal — reaction events are a genuinely good low-friction UI). Acknowledge deliveries fast and make handlers idempotent; Slack retries deliveries it doesn't see acknowledged, and duplicate events are a fact of life.
- **Incoming webhooks**: the one-way push path. Any system — CI, monitoring, a cron job, another agent — can POST a JSON payload to a webhook URL and land a message in a channel. This is how agent *results* get announced: the analysis runs wherever it runs, and the webhook is just the last hop into the conversation.
- **Socket Mode** deserves a footnote: for internal tools behind a firewall, your app can receive events over an outbound WebSocket instead of exposing a public HTTP endpoint. It removes the "I need a public URL to build a Slack bot" blocker for internal deployments.

Put together, the event-driven agent architecture looks like this: events wake a stateless handler; the handler assembles context via the Web API (or RTS); the model reasons; results go back as threaded messages, workflow steps, or webhook posts. Slack is the event bus and the UI; your infrastructure is the brain.

## Workflow Builder: AI without (much) code

Between "built-in" and "build your own" sits Workflow Builder. It now has a native **Generate AI response** step: you write a prompt in plain language, attach Slack content or variables from earlier steps as knowledge sources, preview-test it, and the step returns a grounded AI response inside the workflow. Combined with the **Summarize channel** step and prompt-based workflow generation, a non-engineer can build, say, a Friday 8 a.m. workflow that summarizes five project channels and posts progress/blockers/next-steps to an exec channel — no code at all.

When the built-in step isn't enough — you need your own model, your own retrieval, or a call into an internal system — you drop to **custom steps**: define a function in your app manifest (typed input/output parameters), implement it with `app.function("your_step_id", ...)` in Bolt, and end every execution with `complete({ outputs })` or `fail({ error })`. Once deployed, that function appears in Workflow Builder as a step anyone can wire into a workflow. Slack's own tutorial for this pattern is an AI code assistant: the custom step fetches the message, calls an LLM, and completes with the answer. This is the right granularity for a platform team: engineers ship governed, testable AI primitives; everyone else composes them.

## The tradeoffs that actually bite

**Latency budget.** The 3-second ack is just the visible tip. Real budget: context fetch (one or more API round trips) + model time-to-first-token + streaming. Design for perceived latency — status lines and streaming — not just total time.

**Context assembly is the product.** An answer is only as good as the messages you fetched. Thread replies are cheap and precise; channel-wide questions need search or history reads, and history reads are where the next trap lives.

**Rate limits, including the nasty one.** Slack tiers its Web API methods (roughly: Tier 2 ≈ 20+ req/min, Tier 3 ≈ 50+, Tier 4 ≈ 100+), `chat.postMessage` is limited to about 1 message per second per channel, and 429s come with a `Retry-After` you must honor. The nasty one: since Slack's May 2025 rate-limit changes, `conversations.history` and `conversations.replies` are capped at **1 request per minute** for apps distributed outside the Slack Marketplace — while internal, customer-built apps keep Tier 3 (50+/min). The same Q&A bot can be perfectly viable as an internal app and unusable as a distributed one. Check which bucket you're in before you architect around history pagination.

**Permissions are the security model.** Bot tokens see only channels the bot is a member of — that's a feature: channel membership *is* your access control. Request least-privilege scopes (`channels:history`, `chat:write`, `assistant:write` for the assistant APIs), and prefer user-context access (MCP/RTS) when the agent should never see more than the asker. Every scope you add is a standing grant; treat the manifest review like a code review.

**Data handling.** For built-in Slack AI, Slack states customer data is not used to train its LLMs, and your workspace retention settings bound what the features can reach. The moment you ship messages to your own model endpoint, *you* own that data flow — retention, residency, and redaction become your problem, and your security review will (correctly) ask where channel text goes. Keep prompts and fetched context out of your logs by default.

**Workflow vs. custom app.** Choose the workflow when the logic is linear, the author is a non-engineer, and governance matters more than UX. Choose a custom app when you need streaming, tool use, multi-turn state, your own model, or an assistant-pane presence. Choose both when you can: app-grade primitives, workflow-grade composition.

## Walkthrough: a mention-triggered Q&A agent

Minimal viable version, ~30 lines of Bolt for JavaScript. Someone @-mentions the app in a channel; the app reads the thread, answers in-thread:

```js
app.event('app_mention', async ({ event, client, say, logger }) => {
  const threadTs = event.thread_ts ?? event.ts;
  try {
    // Context: the thread the mention lives in.
    // (The bot must be a member of the channel.)
    const { messages } = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
      limit: 50,
    });

    const question = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const context = messages.map((m) => m.text).join('\n');

    const answer = await askLLM({ question, context }); // your model call

    await say({ text: answer, thread_ts: threadTs });
  } catch (e) {
    logger.error(e);
  }
});
```

Everything else is scaling this skeleton: swap `conversations.replies` for RTS search when the question spans channels; add `assistant.threads.setStatus` and `chat.startStream` when you move it into the assistant container; add citations (message permalinks) so answers are checkable; add a 👍/👎 reaction listener as your eval signal. The architecture doesn't change — trigger, context, model, threaded reply — only the fidelity of each stage does.

## Bottom line

Slack's AI stack rewards the same discipline as any other platform: know which layer you're in. Use built-in AI and Slackbot first — they're already paid for and permission-correct. Reach for MCP/RTS when external agents need your workspace context. Build with Bolt when you need your own model or tools, respect the 3-second ack, and check your rate-limit bucket before you fall in love with a history-heavy design. The teams that get value out of Slack AI won't be the ones with the cleverest prompts; they'll be the ones whose context assembly and permission model were right.

*Facts in this article were checked against Slack/Salesforce documentation and announcements as of October 6, 2026; plan inclusions and feature availability change frequently — verify before you budget around them.*
