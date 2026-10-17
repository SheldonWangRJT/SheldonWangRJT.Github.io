---
layout: single
title: "Harness-Agnostic Skills: The Plugin Format War Is a Versioning Problem"
description: "SKILL.md and MCP port across harnesses. Hooks, agents, commands, and plugin manifests don't — and nothing has a lockfile. The fix is a 3-layer split: neutral content, generated adapters, pinned bundles."
date: 2026-10-16 17:40:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Agent Skills
  - MCP
  - Plugins
  - Coding Agents
excerpt: "40+ harnesses read the same SKILL.md. Zero agree on what a plugin is — and nothing has a lockfile."
---

> [中文版 Chinese version](/ai%20engineering/llms/harness-agnostic-skills-versioning-zh/)

Everyone building an in-house coding harness hits the same wall, and it is not the model. It is the plugin layer.

You write a Claude plugin — skills, hooks, MCP servers, a few scripts — and it works. Then someone asks for Codex support, then Muse Code, then the internal harness your company is building to stop paying three vendors for the same tokens. And you discover the portability story is two layers deep and then stops.

## What actually ports

The good news is real. Agent Skills (the `SKILL.md` format) is an open standard published by Anthropic in December 2025, and it has been adopted by OpenAI's Codex, GitHub Copilot, Cursor, Gemini CLI, and 40+ other products. A skill written to the standard's core fields — `name`, `description`, body — runs unchanged across them. MCP is the same story: the tool protocol is universal, with 97M+ monthly SDK downloads reported in a March 2026 cross-platform portability survey.

![Portability matrix: only SKILL.md and MCP survive across harnesses](/assets/images/posts/2026-10-16-harness-agnostic-skills-versioning-chart.png)

Everything below that line is per-vendor:

- **Plugin manifests.** Claude Code uses `.claude-plugin/plugin.json` plus a marketplace registry. Codex uses `.codex-plugin/plugin.json` (and `plugin.toml` in some docs) plus its own marketplace. Gemini CLI uses `gemini-extension.json`. Three manifests for the same bundle.
- **Hooks.** All three harnesses have hooks. None share event names, matchers, or schemas. Codex documents six hook events; Claude Code's `hooks.json` is a different shape; Gemini's extension hooks are a third.
- **Agents and commands.** Claude Code's subagent Markdown files and slash commands have no auto-import equivalent in Codex or Gemini. Each needs a hand rewrite.
- **Versioning.** This is the worst gap. The Agent Skills standard has no `version` field. Community repos bolt one on via `metadata.version` in frontmatter plus a registry JSON plus changesets — every team invents its own. MCP has no lockfile either: the dominant install pattern is `npx -y pkg@latest`, which resolves to whatever is newest at install time. A recent test that installed and started 12,915 MCP servers found 41% never answered at all.

So the state of the art is: portable content, unportable packaging, no versioning.

## Why this bites hardest for in-house harnesses

If you are building your own harness — to consolidate vendors, to control cost, to keep code in-house — you inherit all three problems at once. Your harness needs to consume the same internal skills your teams already wrote for Claude and Codex. Your users need a bundle that is exactly the version you tested, not whatever `latest` resolved to on their laptop this morning. And your RAG pipeline — the thing that retrieves the right skill at the right time — has to index something stable. If it indexes the live repo, retrieval returns whatever HEAD happens to be, and "which version answered that question" becomes unanswerable.

This is a distribution problem wearing an AI costume. We solved it for code with package managers and lockfiles. Skills are code — Markdown plus scripts plus server configs plus CLI dependencies — and they deserve the same treatment.

## The 3-layer fix

**Layer 1: neutral content.** One canonical repo per skill family. Each skill is `SKILL.md` (standard core fields only — no vendor extensions in the body), plus `scripts/`, `references/`, `assets/`. Scripts declare their runtime explicitly: `uv run --with pinned==x.y.z`, `npx -y pkg@exact-version`, or a container image digest. No bare `python script.py`, no bare `npx pkg`. No vendor-specific frontmatter in the canonical copy.

**Layer 2: generated adapters.** A single generator reads the canonical skill and emits each harness's packaging: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `gemini-extension.json`, and the in-house harness's own manifest. Adapters are build artifacts, never hand-edited. If a vendor changes its manifest schema, you change the generator once. The moment someone hand-edits a generated adapter, you have two sources of truth and the portability story is dead.

**Layer 3: pinned bundles.** The shippable unit is a content-addressed bundle — a tarball or OCI artifact — plus a lockfile: every skill pinned by version, every MCP server pinned by exact version and digest, every CLI dependency pinned, every script runtime pinned. The harness installs a bundle version, not a repo. A `skills doctor` command verifies the installed bundle hash against the lockfile and fails loudly on drift. Community tooling is already pointing this way: SurfacePin locks exact hashes of an MCP server's tool surface and fails CI on silent drift.

And the RAG layer: **index the pinned bundle, not the live repo.** Retrieval returns the skill, its version, and its dependency closure. When a user asks "why did the agent do that," the answer includes the bundle version — the same way a stack trace includes the build.

## What this does not solve

- **Behavioral drift.** A pinned bundle guarantees the same files, not the same model behavior. Model updates behind the API still move outputs. Pin the model version too, where the provider allows it.
- **Hook semantics.** Generated adapters translate packaging, not semantics. A PreToolUse hook that gates on a Claude-specific tool name has no exact Codex equivalent. Keep hooks minimal and harness-neutral, or accept per-harness hook code as the one sanctioned exception.
- **The standard may still arrive.** A neutral skill-bundle manifest (content + deps + lockfile) is the obvious next standard, and the Agentic AI Foundation now stewards both MCP and Skills. If it ships, Layer 2 gets thinner. Until then, generate.

## Monday actions

1. Pick your most-used skill. Try to rebuild its exact bundle from scratch in a clean container from a lockfile. If you can't, you don't have versioning — you have vibes. Write the lockfile first.
2. Split one plugin into neutral content + one generated adapter. Ban hand-edits to the generated file in CI.
3. Ship a `skills doctor` check that fails when installed hash ≠ lockfile hash, and make it part of onboarding, not a wiki page.

## Sources

- Agent Skills open standard: https://agentskills.io
- Cross-platform CLI plugin portability survey (Mar 2026): https://github.com/joaquimscosta/arkhe-claude-plugins/blob/HEAD/docs/research/cross-platform-llm-cli-plugin-portability.md
- Claude Code plugin system research: https://github.com/ratel-ai/ratel-local/blob/HEAD/docs/research/claude-code-plugin-system.md
- Codex CLI plugin/skill conventions: https://github.com/fusengine/codex
- MCP server reliability test (12,915 servers, 41% never answered): https://dev.to/alexar76/we-installed-12915-mcp-servers-and-started-each-one-41-never-answered-3heh
- SurfacePin MCP surface locking: https://github.com/yellowgram/surfacepin
- Meta's Muse Code harness launch (public reporting, Aug 5 2026): https://siliconangle.com/2026/08/05/meta-takes-anthropic-openai-first-ai-coding-agent-muse-code/

*Framing note: this post discusses a general industry problem. Any mention of a specific company's harness refers to publicly reported products only.*
