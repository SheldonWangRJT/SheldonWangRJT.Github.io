---
title: 'Your Cheap TV Box Was Selling Your Living Room — Google Just Killed a 1.3 Million-Device Botnet'
description: 'Google and partners announced on November 2, 2026 that they dismantled XCPE, a backdoor hidden in Android TV set-top box firmware that enrolled more than 1.3 million devices. Google says with high confidence that the manufacturer, Videostrong, built and operated it deliberately and sold access to criminal affiliates — and that the backdoor itself is still on the boxes.'
date: 2026-11-02
permalink: /life/xcpe-botnet-videostrong/
tags:
  - Google
  - Android TV
  - Botnet
  - Cybersecurity
  - Smart Home
excerpt: 'The takedown cut the botnet’s command servers. It did not clean the boxes. That distinction — between disrupting a botnet and removing a backdoor baked into firmware — is the whole story, and the reason cheap hardware deserves more suspicion than it gets.'
---

> [中文版 Chinese version](/life/xcpe-botnet-videostrong-zh/)

*Figures below are from Google's Threat Intelligence Group announcement of November 2, 2026, and partner reporting. Attribution to Videostrong is Google's assessment, stated with high confidence, not a court finding.*

## What Google announced

Last week, Google and industry partners dismantled XCPE — also written x.cpe — a backdoor hidden in the firmware of Android TV set-top boxes that enrolled **more than 1.3 million devices** into a botnet. Google's Threat Intelligence Group says it assesses "with high confidence" that the backdoor was intentionally developed, deployed, and operated for financial gain by **Videostrong Technology Co.**, a Shenzhen-based Android manufacturer and device maker that produced many of the affected boxes under its own name and for other brands.

The business model, as Google describes it, was access itself. Videostrong sold entry to criminal affiliates, who loaded their own malware modules onto infected devices: ad fraud, silently enrolling devices into residential proxy networks — so other people's internet traffic flowed through owners' home connections — and additional malware. Google also took legal action against the command-and-control domains of more than a dozen affiliate malware families, and says that step alone should sever access to **at least 10 million additional compromised devices** that those affiliates reached through other routes.

The partners on the takedown were Lumen, HUMAN Security, Plume, Synthient, and TrendAI, working with Japan's National Police Agency. Synthient, which tracks proxy networks, had published a list of 182 device model names seen in the campaign, with a focus on MECOOL-branded boxes it links to Videostrong.

## How it worked — and why it survived

XCPE was not an app a user installed. It ran as a system app inside the firmware, with system-level privileges, and could reinstall itself after removal from the app directory — later variants, from August 2026 onward, used privilege-escalation exploits and root ADB access to write into the system partition. It communicated over HTTP for initial configuration and persistent MQTT connections for commands, including silent app installs, shell execution, screen capture, and network reconnaissance. Some infected devices were not even TV boxes: Google also observed telehealth devices, karaoke machines, and digital signage running the same backdoor.

The uncomfortable detail is how it got past Google's own gates. Google requires device makers to pass compatibility and security tests for certified Android devices. Google says Videostrong hid its code to bypass a gap in those tests and loaded the malicious code after a device's first boot. As of November 2, Videostrong's own website still listed products it calls "Google Certified Android TV Box" and "Google Certified Android TV Stick." Google has now banned Videostrong — and any future subsidiaries or affiliates — from building or selling certified Android devices or supplying software to certified vendors, cut ties with the company, and says it has changed its firmware review process.

That certification gap is the real scandal here, and it distinguishes XCPE from its predecessor. When Google sued over the BadBox 2.0 botnet in July 2025, the more than 10 million devices involved were uncertified — buyers had, in a sense, opted out of Google's protections. XCPE's boxes were certified. The badge that was supposed to mean "checked" did not catch code designed to load after the check.

## The part the takedown does not fix

Read the announcement carefully and the limit is explicit: Google took down domains and servers. It did not — and cannot, remotely — remove the backdoor from the boxes. As The Hacker News puts it, "the backdoor is still on the boxes, and owners cannot remove it themselves." A factory reset will not reliably clear firmware-level code that reinstalls from a protected partition, and there is no patch coming from a manufacturer Google has just banned.

That leaves owners with an unglamorous choice: retire the box, or keep using a device whose firmware contains a dormant backdoor whose command servers are dead today but whose code is still there. For a $30–$50 streaming box, the rational answer is usually retirement — which is also why the economics of this attack worked in the first place. The box was cheap because someone else was paying for it: first the manufacturer, selling access to your living room, then the affiliates, monetizing your connection.

## The judgment

XCPE is a useful corrective to two lazy narratives. It is not a story about users clicking phishing links — nobody clicked anything; the backdoor shipped in the box. And it is not a story about uncertified gray-market hardware — the certification system itself was gamed. The practical lesson is narrow and actionable: treat ultra-cheap Android TV boxes from obscure brands as untrusted network devices, not as televisions. Put them on a guest network if you must keep one, and if you own a Videostrong or MECOOL box from the affected years, the honest advice is to replace it, not to reset it. The botnet is dead. The backdoor is not.

*Sources: Google Threat Intelligence Group, "Shutting the Door on the XCPE Botnet," November 2, 2026; The Hacker News, "Google Disrupts 1.3 Million-Device Android Botnet," November 2, 2026; Help Net Security, "Google disrupts XCPE botnet, bans the company behind it," November 2, 2026.*
