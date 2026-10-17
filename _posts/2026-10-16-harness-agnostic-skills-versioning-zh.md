---
layout: single
title: "与 Harness 无关的 Skills：插件格式之争本质上是版本管理问题"
description: "SKILL.md 和 MCP 可以跨 harness 移植。Hooks、agents、commands、插件 manifest 都不行——而且没有任何 lockfile。解法是三层拆分：中立内容、生成的适配器、锁定的 bundle。"
date: 2026-10-16 17:40:00 -0700
categories:
  - AI Engineering
  - LLMs
tags:
  - Agent Skills
  - MCP
  - Plugins
  - Coding Agents
  - 中文
excerpt: "40 多个 harness 都能读同一个 SKILL.md，却没有两个对 plugin 的定义达成一致——而且没有任何 lockfile。"
---

> [English version](/ai%20engineering/llms/harness-agnostic-skills-versioning/)

每个自研 coding harness 的团队都会撞上同一堵墙。撞上的不是模型，是插件层。

你写了一个 Claude 插件——skills、hooks、MCP server、几个脚本——跑起来了。然后有人要 Codex 支持，再要 Muse Code，再要公司正在自研的、用来摆脱三个 vendor 重复付费的内部 harness。

这时你会发现，可移植性的故事只有两层深。再往下就断了。

## 到底什么能移植

能移植的只有两样。其余全是各家自己的。

**SKILL.md 能移植。** Agent Skills 是 Anthropic 在 2025 年 12 月发布的开放标准。Codex、GitHub Copilot、Cursor、Gemini CLI 和 40 多个产品都读它。按标准核心字段（`name`、`description`、正文）写的 skill，可以原样跨这些工具运行。

**MCP 能移植。** 工具协议是通用的。一份 2026 年 3 月的可移植性调研报告称，其 SDK 月下载量超过 9700 万。

![可移植性矩阵：只有 SKILL.md 和 MCP 能跨 harness 存活](/assets/images/posts/2026-10-16-harness-agnostic-skills-versioning-chart.png)

其余的不行：

| 组件 | 移植时会发生什么 |
|---|---|
| 插件 manifest | 重写——Claude、Codex、Gemini 各要各的 |
| Hooks | 重写——事件名、matcher、schema 全不同 |
| Agents / commands | 重写——没有自动导入的等价物 |
| 版本管理 | 不存在——没有 `version` 字段，没有 lockfile |

{% mermaid %}
graph TD;
  A["一个 canonical skill"] --> B["SKILL.md 核心"];
  A --> C["MCP server"];
  A --> D["Hooks"];
  A --> E["Agents 和 commands"];
  A --> F["插件 manifest"];
  B --> G["原样移植"];
  C --> H["能移植，配置不同"];
  D --> I["每个 harness 重写"];
  E --> I;
  F --> I;
{% endmermaid %}

版本管理的缺口是最大的。Agent Skills 标准里没有 `version` 字段。社区仓库自己往上贴：frontmatter 里的 `metadata.version`、registry JSON、changeset——每家团队各发明一套。

MCP 也没有 lockfile。主流安装方式是 `npx -y pkg@latest`，装的时候解析到什么就是什么。最近一次测试安装并启动了 12,915 个 MCP server，其中 41% 根本没响应。

现状就是：内容可移植，打包不可移植，版本管理不存在。

## 为什么自研 harness 被咬得最狠

自研 harness 意味着三个问题同时找上门。

你的 harness 得消费团队已经为 Claude 和 Codex 写好的内部 skills。你的用户需要拿到你测试过的那个确切版本，而不是今天早上他笔记本上 `latest` 解析到的版本。

而你的 RAG 管道必须索引一个稳定的东西。如果它索引的是 live repo，检索返回的就是 HEAD 碰巧是什么。"到底是哪个版本回答了这个问题" 就永远说不清了。

这是一个披着 AI 外衣的分发问题。代码分发我们早就用包管理器和 lockfile 解决了。Skill 就是代码——Markdown 加脚本加 server 配置加 CLI 依赖——理应得到同等待遇。

## 三层解法

{% mermaid %}
graph TD;
  L1["第一层：中立内容<br/>SKILL.md + 脚本 + 参考"] --> L2["第二层：生成的适配器<br/>一个生成器，全部 vendor manifest"];
  L2 --> L3["第三层：锁定的 bundle<br/>tarball + 带 digest 的 lockfile"];
  L3 --> H1["Claude Code"];
  L3 --> H2["Codex"];
  L3 --> H3["Gemini CLI"];
  L3 --> H4["自研 harness"];
  L3 --> R["RAG 索引"];
{% endmermaid %}

**第一层：中立内容。** 每个 skill 家族一个 canonical 仓库。每个 skill 是 `SKILL.md`（只用标准核心字段，正文里不放 vendor 扩展）加 `scripts/`、`references/`、`assets/`。

脚本显式声明运行时：`uv run --with pinned==x.y.z`、`npx -y pkg@exact-version`，或者容器镜像 digest。不要裸 `python script.py`。不要裸 `npx pkg`。canonical 副本里不放 vendor 专属 frontmatter。

**第二层：生成的适配器。** 一个生成器读 canonical skill，产出各家 harness 的打包格式：`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`、`gemini-extension.json`，以及自研 harness 自己的 manifest。

适配器是构建产物，永远不要手写改。如果 vendor 改了 manifest schema，你只改一次生成器。有人手改了生成的适配器的那一刻，你就有了两个事实来源——可移植性故事就死了。

**第三层：锁定的 bundle。** 可交付单元是一个内容寻址的 bundle（tarball 或 OCI artifact）加 lockfile。每个 skill 按版本锁定。每个 MCP server 按精确版本和 digest 锁定。每个 CLI 依赖锁定。每个脚本运行时锁定。

Harness 安装的是一个 bundle 版本，而不是一个 repo。一个 `skills doctor` 命令校验已安装 bundle 的哈希与 lockfile 是否一致，不一致就大声报错。社区工具已经在往这个方向走：SurfacePin 锁定 MCP server 工具表面的精确哈希，静默漂移就让 CI 变红。

{% mermaid %}
graph LR;
  R["Skill 仓库"] --> G["生成器"];
  G --> B["Bundle v1.2.3 + lockfile"];
  B --> D["skills doctor：哈希校验"];
  D -->|通过| I["安装进 harness"];
  D -->|失败| X["大声拒绝"];
  B --> IDX["RAG 索引 bundle"];
  IDX --> A["回答带上 bundle 版本"];
{% endmermaid %}

RAG 层也一样：**索引锁定的 bundle，而不是 live repo。** 检索返回 skill、它的版本、它的依赖闭包。用户问"agent 为什么这么做"时，答案里包含 bundle 版本——就像 stack trace 里包含 build 号一样。

## 这个解法不解决什么

- **行为漂移。** 锁定的 bundle 保证文件相同，不保证模型行为相同。API 背后的模型更新仍会改变输出。在 provider 允许的地方，连模型版本一起锁。
- **Hook 语义。** 生成的适配器翻译的是打包格式，不是语义。一个依赖 Claude 专属工具名的 PreToolUse hook，在 Codex 里没有精确等价物。Hooks 保持最小化和 harness 中立，或者接受 per-harness hook 代码作为唯一被允许的例外。
- **标准可能还是会来。** 中立的 skill-bundle manifest（内容 + 依赖 + lockfile）是显而易见的下一个标准，而 Agentic AI Foundation 现在同时管理 MCP 和 Skills。如果它发布了，第二层会变薄。在那之前，先生成。

## 周一行动

1. 挑你最常用的 skill，尝试在一个干净容器里只凭 lockfile 从零重建它的精确 bundle。重建不出来，你就没有版本管理——你只有 vibes。先写 lockfile。
2. 把一个插件拆成中立内容 + 一个生成的适配器，并在 CI 里禁止手改生成的文件。
3. 发布一个 `skills doctor` 检查：已安装哈希 ≠ lockfile 哈希就失败，并把它做进 onboarding，而不是写进 wiki。

## 来源

- Agent Skills 开放标准：https://agentskills.io
- 跨平台 CLI 插件可移植性调研（2026 年 3 月）：https://github.com/joaquimscosta/arkhe-claude-plugins/blob/HEAD/docs/research/cross-platform-llm-cli-plugin-portability.md
- Claude Code 插件系统调研：https://github.com/ratel-ai/ratel-local/blob/HEAD/docs/research/claude-code-plugin-system.md
- Codex CLI 插件/skill 约定：https://github.com/fusengine/codex
- MCP server 可靠性测试（12,915 个 server，41% 无响应）：https://dev.to/alexar76/we-installed-12915-mcp-servers-and-started-each-one-41-never-answered-3heh
- SurfacePin MCP 表面锁定：https://github.com/yellowgram/surfacepin
- Meta Muse Code harness 发布（公开报道，2026 年 8 月 5 日）：https://siliconangle.com/2026/08/05/meta-takes-anthropic-openai-first-ai-coding-agent-muse-code/

*立场说明：本文讨论的是通用行业问题。文中提到的任何具体公司的 harness 均指公开报道过的产品。*
