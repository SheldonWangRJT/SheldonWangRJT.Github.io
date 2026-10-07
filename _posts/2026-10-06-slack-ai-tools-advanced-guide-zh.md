---
layout: single
title: "Slack AI 高级玩法：内置 AI、Agent 与自建 AI 应用"
description: "从工程师视角拆解 Slack 的三层 AI 体系：内置 Slack AI、Agentforce 与 Slackbot 等 agent 层，以及用 Bolt 和 API 自建 AI 应用、hook 与命令的完整路径。"
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
  - 中文
excerpt: "Slack 的 AI 不是一个功能，而是三层：内置 AI、agent 层、自建应用层。每层的权限模型、能力上限和坑完全不同——搞清楚自己在哪一层，是把 demo 做成生产工具的前提。"
---

> [English version](/ai%20engineering/llms/slack-ai-tools-advanced-guide/)

公司刚切到 Slack，不出一周就会有人连着问三个问题："能帮我总结一下这个频道吗？""能直接问它问题吗？""能不能接我们自己的模型进去？"听起来像一件事，其实是三层完全不同的东西。Slack 的 AI 表面是一个栈：每一层的负责人不同、权限模型不同、天花板也不同。这篇文章把这个栈讲清楚——包括接口在哪、哪些 deadline 是硬的、限流的坑埋在哪。

## 第一层：内置 Slack AI——你已经付过钱了

2025 年 7 月 17 日开始分批上线的套餐调整，把核心 Slack AI 功能从单独的付费插件改成了付费套餐内置（Business+ 也在同一次调整里从年付 $12.50 涨到 $15/人/月）。分层是这样的：

- **Pro**：对话和 thread 总结、AI huddle 会议纪要。
- **Business+**：在 Pro 基础上加 AI 搜索问答、每日 recap、翻译、文件总结、工作流生成。
- **企业版 Enterprise+**：再加跨已连接应用的企业搜索（enterprise search）。

工程师最该关注的是两个。**搜索问答**本质是基于你工作区的检索：提一个问题，答案从你有权限看到的消息和文件里生成。**企业搜索**把检索范围扩到已连接的外部系统。两者的共同点是严格的权限裁剪——模型只能看到提问者本人能看的东西。架构上这是对的，但它同时就是这一层的天花板：模型不能换、工具不能加、检索行为不能改。

另一个内置能力是重做后的 **Slackbot**。Dreamforce 2025 上它被重新发布为一个个人 agent：基于你的对话、文件、日历和已连接应用工作，始终在你的权限范围内；2026 年 1 月起开始向 Business+ 和 Enterprise+ 客户推送。可以把它理解为 Salesforce 官方对"Slack 里的 agent 应该长什么样"的参考实现——侧边栏助手，能回答、能起草、能执行动作。如果你的用户用它就够了，第一层就是终点；如果他们开始要*你们自己的*数据、工具或模型，继续往下看。

## 第二层：Agent 层——别人家的 agent，你的工作区

**Agentforce in Slack** 在 2025 年 1 月正式 GA：Salesforce 客户可以把 Agentforce agent 部署进频道和私聊，让它基于 Salesforce 数据答题、执行动作。围绕它，Slack Marketplace 里已经有 Anthropic、Perplexity、Notion、Writer 等厂商的第三方 agent，像普通应用一样安装，价格由各厂商自定。

但对工程师来说，这一层真正有价值的不是 agent 本身，而是 Salesforce 为喂饱这些 agent 造的管道——因为你自己也能用：

- **Real-Time Search（RTS）API**：按需实时查询 Slack 的对话数据，按提问用户的权限裁剪。不用再把消息全量导出、自己建索引、自己忍受索引过期。
- **Slack MCP server**：Slack 官方托管的 Model Context Protocol 服务器（地址 `mcp.slack.com`），给任何兼容 MCP 的客户端——Claude、ChatGPT、Cursor、Perplexity——提供一套标准的搜索、读取、发帖工具，以用户身份 OAuth 登录，走工作区管理员审批流程。

两者都是 2025 年 10 月 Dreamforce 前夕宣布进入封闭 beta，**2026 年 2 月 17 日正式 GA**。安全模型是重点：通过 MCP 接入的外部 agent 是*以你的身份*在行动，只能看到你能看的，全程在 Slack 的审计和应用审批控制之内。对比 2026 年之前的主流做法——一个带宽泛 history 权限的 bot token 默默读全公司消息——你就明白 Salesforce 为什么要重做这条访问路径。

## 第三层：自建应用——Bolt 与 assistant 应用模式

需要自己的模型、自己的工具、自己的数据时，就得自己写应用。Slack 的框架叫 **Bolt**（JavaScript、Python、Java 都有），而 AI 应用有一个专用表面：**Agents & AI Apps**，它把你的应用放进 assistant 容器——就是 Slackbot 用的那个侧边栏 UI。这个功能需要付费套餐，Bolt 的 `Assistant` 类负责接生命周期：

- `assistant_thread_started`：用户打开一个与你的应用的对话。打招呼、保存 thread 上下文，并用 `assistant.threads.setSuggestedPrompts` 设置**推荐 prompt**（最多 4 个）。上下文里带着用户当时在看的频道，所以 prompt 可以按场景给：只有在频道上下文里，"总结这个频道"才成立。
- `assistant_thread_context_changed`：用户在对话中途切换了频道。必须把新上下文存下来（Bolt 默认实现是塞进消息 metadata），否则你的回答会悄悄答非所问。
- `message.im`：用户在 thread 里发了消息——你的 LLM 调用发生在这里。

UX 上还有两个 `assistant.threads.*` 方法：`setStatus` 显示实时状态行（"正在思考…"、"正在查 runbook…"），`setTitle` 给 thread 起名以便在历史里找。回复本身现在有真正的**流式输出**：`chat.startStream` 打开一条消息，`chat.appendStream` 逐块追加（markdown 文本块，以及把 agent 工具调用渲染成任务卡片的 `task_update` 块），`chat.stopStream` 收尾。流式不是花活——一个 20 秒的 agent 任务，有可见进度用户就能忍；同样的任务对着一个静默的转圈，早就被关掉了。

心智模型记住三点：assistant thread 是会话，频道上下文是必须显式跟踪的环境状态，而每一轮都是"先 ack、再干活"——这正好接到整个平台最锋利的那条边。

## 用 slash command 直调 LLM：3 秒规则

`/ask`、`/summarize` 这类 slash command 是最便宜的 AI 入口：没有 app home、没有 assistant 容器，就是一个 POST 打到你的服务器，带着命令文本、用户、频道、`trigger_id` 和一个 `response_url`。Slack 官方文档里就有一个 `/ask-code-assistant` 的示例，形状完全一样。

塑造一切的约束只有一条：**服务器必须在 3000 毫秒内确认收到**，否则用户会看到 `operation_timeout` 报错。加上检索之后，没有任何 LLM 能在 3 秒内答完一道真问题。所以所有生产级的 slash command AI 应用都用同一套延迟响应模式：

1. 立刻 `ack()`——空的 200，或者一条"处理中…"的 ephemeral 消息。
2. 异步做慢活：组装上下文、调用模型。
3. 之后再把答案送回去：要么 POST 到原始 payload 里的 `response_url`，要么自己调 `chat.postMessage`（后者还能用第一条消息的 `ts` 控制 thread 结构）。

可见性要刻意选：默认 `ephemeral` 只有调用者可见；答案属于整个频道时设 `response_type: "in_channel"`。还有一个结构性限制要提前知道：自定义 slash command 不能在消息 thread 里调用——如果你的用户主要活在 thread 里，command 就不是对的表面，改用 @mention 或 assistant 容器。

## Events 与 hooks：触发层

Slash command 是拉模式。Slack AI 的其余部分是推模式，触发层有三件套：

- **Events API**：订阅 `app_mention`，在频道里被 @ 时唤醒你的 agent；订阅 `message.*` 事件做环境触发（某个 incident 频道的消息、某个被当作"总结一下"信号的 emoji 回应——用 reaction 当触发器是摩擦极低的好 UI）。投递要快速确认、handler 必须幂等：Slack 对未确认的投递会重试，重复事件是常态。
- **Incoming webhooks**：单向推送通道。任何系统——CI、监控、cron、另一个 agent——都能往一个 webhook URL POST 一段 JSON，把消息落进频道。这是 agent *结果*的播报方式：分析在哪里跑都行，webhook 只是进入对话的最后一跳。
- **Socket Mode** 值得一个脚注：内网工具不想暴露公网端点时，应用可以通过出站 WebSocket 收事件。对内部部署来说，它直接拆掉了"写个 Slack bot 还得先有个公网 URL"这个门槛。

合起来，事件驱动的 agent 架构是这样的：事件唤醒无状态 handler；handler 通过 Web API（或 RTS）组装上下文；模型推理；结果以 thread 消息、工作流步骤或 webhook 帖子的形式回去。Slack 是事件总线兼 UI，你的基础设施是大脑。

## Workflow Builder：低代码的那一档

在"内置"和"全自建"之间，是 Workflow Builder。它现在有一个原生的 **Generate AI response** 步骤：用自然语言写 prompt，把 Slack 内容或前面步骤的变量作为知识源挂上去，还能在发布前用预览模式测——然后这个步骤就在工作流里返回一个有依据的 AI 回复。再配上 **Summarize channel** 步骤和"一句话生成工作流"，非工程师也能搭出"每周五 8 点总结五个项目频道、把进展/阻塞/下一步发到管理层频道"这种自动化，一行代码不用写。

当内置步骤不够用——需要自己的模型、自己的检索、或者要调内部系统——就下沉到**自定义步骤**：在应用 manifest 里定义一个 function（带类型的输入/输出参数），在 Bolt 里用 `app.function("your_step_id", ...)` 实现它，每次执行以 `complete({ outputs })` 或 `fail({ error })` 结尾。部署之后，这个函数就会作为一个步骤出现在 Workflow Builder 里，谁都能把它拼进自己的工作流。Slack 官方教程给的正是 AI 代码助手这个例子：自定义步骤取到消息、调 LLM、用答案 complete。对平台团队来说这是正确的粒度：工程师交付受治理、可测试的 AI 原语，其余人负责组合。

## 真正会咬人的权衡

**延迟预算。** 3 秒 ack 只是看得见的那部分。真实预算是：取上下文（一次或多次 API 往返）+ 模型首 token 时间 + 流式输出。优化的应该是*感知*延迟——状态行和流式——而不只是总时长。

**上下文组装才是产品本身。** 答案质量取决于你取到了哪些消息。Thread 回复便宜且精确；频道级问题需要搜索或 history 读取——而 history 读取正是下一个坑所在。

**限流，包括最阴的那个。** Slack 的 Web API 按方法分级（大致：Tier 2 约 20+/分钟、Tier 3 约 50+、Tier 4 约 100+），`chat.postMessage` 限制在每频道约 1 条/秒，429 会带 `Retry-After`，必须遵守。而最阴的一条：2025 年 5 月的限流调整之后，对通过 Marketplace 之外渠道分发的应用，`conversations.history` 和 `conversations.replies` 被压到**每分钟 1 次**；内部自建应用则保持 Tier 3（50+/分钟）。同一个问答 bot，做成内部应用完全可行，做成对外分发应用就可能直接不可用。先确认自己在哪个桶里，再决定要不要围绕 history 分页做架构。

**权限就是安全模型。** Bot token 只能看到 bot 所在的频道——这不是限制，是特性：频道成员关系*就是*你的访问控制。Scope 按最小权限申请（`channels:history`、`chat:write`、assistant API 需要的 `assistant:write`），agent 不应看到提问者看不到的东西时，优先用用户上下文的访问方式（MCP/RTS）。每一个多加的 scope 都是一份长期授权，manifest 评审应该按 code review 的标准来。

**数据处理。** 对内置 Slack AI，Slack 声明客户数据不用于训练其 LLM，你工作区的保留策略决定了这些功能能触及的范围。但一旦你把消息发到自己的模型端点，这条数据流就是你的责任了——保留、驻留、脱敏全归你，安全评审问"频道文本到底流去哪了"时你得答得上来。默认不要把 prompt 和取回的上下文写进日志。

**工作流还是自建应用。** 逻辑线性、作者是非工程师、治理比 UX 重要，选工作流；需要流式、多轮状态、工具调用、自己的模型或 assistant 入口，选自建应用；能两个都要时就两个都要：应用级的原语，工作流级的组合。

## 走一遍：@mention 触发的问答 agent

最小可用版本，Bolt for JavaScript 三十行左右。有人在频道里 @ 你的应用，它读 thread、在 thread 里回答：

```js
app.event('app_mention', async ({ event, client, say, logger }) => {
  const threadTs = event.thread_ts ?? event.ts;
  try {
    // 上下文：mention 所在的 thread（bot 必须是频道成员）
    const { messages } = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
      limit: 50,
    });

    const question = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const context = messages.map((m) => m.text).join('\n');

    const answer = await askLLM({ question, context }); // 换成你的模型调用

    await say({ text: answer, thread_ts: threadTs });
  } catch (e) {
    logger.error(e);
  }
});
```

剩下的全是给这个骨架加料：问题跨频道时把 `conversations.replies` 换成 RTS 搜索；搬进 assistant 容器时加上 `assistant.threads.setStatus` 和 `chat.startStream`；给答案附上消息 permalink 让结论可核查；再加一个 👍/👎 reaction 监听器当评估信号。架构本身不变——触发、上下文、模型、thread 回复——变的只是每一级的保真度。

## 结论

Slack 的 AI 栈奖励的和其他平台一样，是纪律：先搞清楚自己在哪一层。内置 AI 和 Slackbot 先用起来——钱已经付了，权限模型也是对的。外部 agent 需要工作区上下文时，走 MCP/RTS。需要自己的模型或工具时用 Bolt 自建，守住 3 秒 ack，爱上 history 重型设计之前先查清自己的限流桶。最后胜出的团队不会是 prompt 写得最花的那批，而是上下文组装和权限模型一开始就做对的那批。

*本文事实截至 2026 年 10 月 6 日按 Slack / Salesforce 官方文档与公告核对；套餐包含关系与功能可用性变动频繁，据此做预算前请再确认。*
