---
title: 'PHP2Shell: AI Found the Hole in 70% of the Web — Then the Hole Leaked'
description: 'Two critical flaws in PHP itself (CVE-2026-109618 / -109619, CVSS 9.2, unauthenticated remote code execution, every version back to 5.4) were found independently with frontier AI models by Calif and Wiz, coordinated quietly from August — then leaked on October 20, a day before the fix. Exploit attempts went from thousands to millions within hours (Cloudflare), Amazon saw one attempt four days before disclosure, 32 UK government services went offline as a precaution, and Censys counts 34.4 million vulnerable PHP services. AI shortened the discovery clock and the exploitation clock by the same amount. That symmetry is the story.'
date: 2026-10-23
permalink: /life/php2shell-ai-found-flaw/
tags:
  - Security
  - PHP
  - AI
  - PHP2Shell
excerpt: 'The defenders found it first, with AI, in August. The attackers got it from a leak, and AI helped them too: thousands of exploit attempts in the ten hours before disclosure, millions within hours after. PHP2Shell is the first internet-scale incident where the same technology demonstrably compressed both sides of the race — and the side that won was decided by a leak, not by the models.'
---

> [中文版 Chinese version](/life/php2shell-ai-found-flaw-zh/)

*Facts and figures are as reported October 21–23, 2026 by Wiz Research, OpenAI, The Register, Reuters (via syndication), Cloudflare's CEO, Amazon Threat Intelligence, and Censys, as cited below. Exploit-attempt counts are attempts observed on those networks, not confirmed breaches; as of the UK government's October 22 statement, there was no confirmed compromise of UK central government systems. The "70% of the web" figure is Wiz's estimate for PHP's share of websites.*

## What the bug is

PHP2Shell is two memory-safety flaws in the PHP engine itself — not in WordPress, Drupal, or any application, but in the runtime underneath all of them. CVE-2026-109618 and CVE-2026-109619, each rated **CVSS 9.2**, let an unauthenticated attacker force an out-of-memory error that leaves a PHP worker holding stale internal state; a follow-up request on the same worker can first leak process memory (passwords, tokens, API keys) and then corrupt it into remote code execution. Wiz demonstrated pre-authentication RCE against current WordPress, Drupal, and Joomla images. At least one of the flaws reaches back to **PHP 5.4** — more than a decade of releases. Patched versions shipped October 21: **PHP 8.5.12, 8.4.27, 8.3.36, and 8.2.35**. Anything on 8.1 or older has no supported fix and needs an upgrade, not a patch.

## How it was found: two teams, three models, one week

The discovery is independently duplicated, which is why the AI claim is hard to wave away. Calif's Ryan Austin found the first flaw in August under OpenAI's Patch the Planet initiative using **GPT-5.6 Sol**, reporting to PHP on August 11 and 21. Wiz found both flaws independently — first on August 19, reported August 24 — using its Atlas tooling with **Gemini 4 Argon and GPT-5.6 Sol** across the work. Wiz's own assessment of what changed: work that once took an elite team months took a single researcher about a week, because the models made it practical to develop and adapt working exploits across applications in hours. OpenAI has since committed $1 billion in subsidized access to its Daybreak security tooling for under-resourced defenders — a number worth remembering when we get to who else can use these tools.

From August 24 to October 20, this was the system working as designed: coordinated disclosure, patches built, defenders quietly preparing. Then it leaked.

## The 48 hours that decided it

- **October 17** — four days *before* disclosure — Amazon's MadPot honeypot network detected an exploitation attempt against PHP2Shell, from an IP tied to a commercial anonymizing network. Amazon says the method and network differed from later attempts, suggesting more than one actor had it early. How, is unknown.
- **October 20** — details of the flaws leaked publicly, before patches were ready. PHP brought its release forward.
- **October 21** — patched releases and public disclosure, same day.
- **Within hours** — Cloudflare's CEO Matthew Prince published the curve: **thousands** of exploit attempts in the ten hours before the announcement, **tens of thousands within 45 minutes** of it, **hundreds of thousands within two hours, millions after that**. New proof-of-concept code appeared within hours and was, per Amazon, quickly used against its honeypots. Sophos tracked attempts trying to deploy Potassium, a Mirai-derived botnet variant.
- **October 22** — the UK technology minister told the House of Lords that **32 government services were unavailable and four partially so** — precautionary shutdowns while patching, with no confirmed central-government compromise. The NCSC had sent **50,000** proactive warnings. Government sites in Germany, France, Belgium, Finland, and the Netherlands also went offline as a precaution, as did Australia's cybersecurity agency site; parts of Wikipedia and the Internet Archive were briefly unavailable; Finland's state IT provider warned restoration could take "days or even weeks" once testing is counted.
- **October 23** — Censys assessed more than **34.4 million PHP services** as still vulnerable. VulnCheck demonstrated RCE against production-configured systems; other observers (Previdian) reported scanning and attempts but no successful in-the-wild RCE in what they saw. Both can be true: the race is being run on millions of hosts nobody is watching.

## The argument, and my call

The comfortable framing — OpenAI calls the pre-disclosure period a "Defender's Window," AI found it before the bad guys — is half true. The window existed for two months and was closed by a leak, after which the same class of tooling that found the bug let attackers industrialize it in hours; Aikido Security's Madeline Lawrence made exactly that point to Reuters. The uncomfortable framing — AI vulnerability discovery is a net negative because exploitation scales faster than patching — is also half true: without AI-assisted discovery, this bug does not get found in August by defenders; it gets found whenever it gets found, quite possibly by the people whose honeypot probe showed up on October 17.

The honest reading is about the clock, not the tools. AI has compressed *both* timelines — discovery-to-patch and disclosure-to-mass-exploitation — to the point where the deciding variable is no longer who has the better model. It is the unglamorous machinery in between: coordinated disclosure that does not leak, inventories that know where PHP is running (the patch is easy; knowing your estate is the hard part, as every post-incident analysis this week has said), and patch pipelines that run in hours. The UK did not lose 32 services to a hacker. It took them down itself, because that machinery, run honestly, said it could not verify safety faster than attackers could scan. That is the correct decision — and a precise measure of how far the machinery has to go.

Patch now: 8.5.12 / 8.4.27 / 8.3.36 / 8.2.35, or get off the internet until you can. There are 34.4 million services in that queue, and the other side of the race is automated too.

## Sources

- Wiz Research PHP2Shell disclosure (October 21, 2026), summarized with timeline and fixed versions: https://ai-tldr.dev/releases/wiz-php2shell-php-rce/
- Tesla News Wire, October 21, 2026 — discovery credits (Calif / GPT-5.6 Sol, Wiz / Atlas + Gemini 4 Argon), OpenAI's $1B Daybreak commitment: https://teslanewswire.com/articles/php2shell-critical-php-vulnerabilities-found-by-ai-openai-wiz-calif-patch-oct-21-2026
- The Register, October 22, 2026 — UK: 32 services offline, four partial, no confirmed compromise, NCSC advice: https://www.theregister.com/security/2026/10/22/php2shell-puts-dozens-of-uk-government-services-out-of-service/5304840
- PBX Science (Reuters-sourced), October 23, 2026 — Amazon MadPot attempt on October 17, October 20 leak, Cloudflare attempt curve, government shutdowns: https://pbxscience.com/php2shell-exploit-attempts-reach-the-millions-as-governments-and-companies-race-to-patch/
