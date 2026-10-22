---
title: 'Could the Switch 2 Actually Run GTA VI? The Rumor, the Specs, and the 30fps Problem'
description: 'A Double Eleven job listing sent the internet into a GTA VI-on-Switch 2 frenzy this week — but the listing never names the game, and its sister posting describes a remaster. What is actually confirmed (Nov 19 launch, PS5/Xbox only), what the specs say (more RAM than a Series S, DLSS, and a CPU problem no upscaler can fix), and why the smart money says the real port story is about Rockstar, not hardware.'
date: 2026-10-21
permalink: /life/gta-6-switch-2-port/
tags:
  - Gaming
  - GTA VI
  - Nintendo Switch 2
  - Rockstar
excerpt: 'The entire GTA VI Switch 2 story rests on one generic line in a job posting: Nintendo experience is a plus. Underneath the frenzy is a real technical debate — and the answer hinges on a number nobody is arguing about: 30. GTA VI is already a locked 30fps on the PS5, which means the usual porting trick has already been spent.'
---

> [Chinese version](/life/gta-6-switch-2-port-zh/)

*Rumor discipline up front: no Switch 2 version of GTA VI has been announced by Rockstar, Take-Two, Nintendo, or anyone else. Sections are labeled with what is confirmed, what is reported, and what is pure rumor, as of October 21, 2026.*

## The spark: one line in a job posting

This week's most-discussed gaming rumor began on September 3, when UK studio **Double Eleven** posted a role for a **Principal Low-Level Graphics Programmer** to work on a "next-generation custom graphics engine" with GPU-driven rendering and hardware ray tracing — with **"bonus points for Nintendo Switch and Switch 2"** experience. The listing surfaced publicly on October 21 via an X post and GoNintendo, and within hours the coverage had converged on a single interpretation: Double Eleven ported Red Dead Redemption to Switch (and its Switch 2 version, with 60fps and DLSS, arrived last December), Double Eleven works with Rockstar, therefore Double Eleven is porting GTA VI to Switch 2.

Read the studio's *other* live listing, though, and the story wobbles. Its Lead Programmer role is for **"a full art remaster of a much-loved title"** — language that fits a catalog project (the long-rumored RDR2 port is the obvious candidate) at least as well as a day-one port of the most secretive game in the industry. Neither listing names GTA VI, Rockstar, or any game. Tech-Insider's summary is the honest one: "a studio with real Nintendo porting credentials posted a job listing with one generic qualification line, and the gaming internet did the rest."

The principals are behaving exactly as they would whether or not a port exists. Rockstar and Take-Two: no comment. Double Eleven: no comment. Nintendo of America president Devon Pritchard, asked by Variety: "That's going to be a conversation for Take-Two and Rockstar." The rest of the trail is leakers (NateTheHate said in November 2025 that Rockstar had run internal hardware tests — the kind publishers run without committing — and Nash Weedle's secondhand "trying to make it happen") and a French retailer's leaked PDF, a genre of document with a long error record.

So: the rumor is real as a rumor. The interesting question is the one underneath it — *could* the Switch 2 run this game? That one has a genuine technical answer, and it splits cleanly in two.

## The confirmed backdrop: the biggest launch in entertainment history

What is not speculation: **GTA VI launches November 19, 2026, on PS5 and Xbox Series X|S only**, at **$79.99** (Ultimate Edition $99.99), after two delays from its original 2025 target. Take-Two's FY2027 guidance of $8.0–8.2 billion in net bookings is built on roughly four and a half months of this game, on two platforms. DFC Intelligence projects **~40 million copies and ~$3.2 billion in year one**. Trailer 2 drew **475 million views in 24 hours**. Its predecessor, GTA V, has sold **230 million copies** and still moves ~5 million a quarter, thirteen years on. Zelnick calls pre-orders "exceptional." This is the context that makes a third platform worth fantasizing about — and worth analyzing seriously, because the install base is already there: the Switch 2 shipped **19.86 million units in its first fiscal year** (the fastest launch year in Nintendo history) and stood at **23.68 million by June 30, 2026**.

## The specs: closer than you think, except where it matters

| | Switch 2 | Xbox Series S | PS5 |
| --- | --- | --- | --- |
| CPU | 8x ARM Cortex-A78C @ ~1.0 GHz | 8x Zen 2 @ 3.6 GHz | 8x Zen 2 @ 3.5 GHz |
| GPU | 3.07 TFLOPS docked / 1.71 handheld | 4.0 TFLOPS | 10.28 TFLOPS |
| RAM | **12 GB** | 10 GB | 16 GB |
| Upscaling | **DLSS (hardware)** | FSR-class software | Software / PSSR (Pro) |
| Storage | 256 GB; game cards max **64 GB**, slower than SSD | 512 GB NVMe | 825 GB NVMe |

The case **for** starts from a real anchor: the Series S is a confirmed GTA VI platform, and on the two axes ports usually die on, the Switch 2 matches or beats it. It has **more RAM** than the Series S. Its GPU deficit is "slight," per Virtuos technical director Eoin O'Grady — the studio behind multiple flagship Switch 2 ports — because the Series S has no answer to **DLSS**: "This makes the GPU capabilities of the two consoles comparable overall." And the first-year library has already run the playbook: *Star Wars Outlaws* (an SSD-era, ray-traced open world) and *Cyberpunk 2077* both shipped credible Switch 2 versions. If your mental model is "current-gen games port to Switch 2 with cuts," the evidence is on your side.

The case **against** says GTA VI is not a normal current-gen game, in one specific way: **it is already 30fps**. Digital Foundry counted all 48,242 frames of Rockstar's Extended Look footage and found internal ~1440p rendering locked — by design, targets "set in stone early on" — to 30 frames per second on PS5-class hardware, with ray-traced global illumination and the densest crowd and world simulation the medium has produced. Every Switch port miracle you remember worked by spending the frame-rate budget: take a 60fps game, halve it to 30, pocket the difference. That budget is already spent. And the workload that defines GTA VI — NPC routines, traffic, a living city's simulation — runs on the CPU, where the Switch 2's ~1 GHz ARM cores are not slightly behind the Series S but *generationally* behind, and where DLSS, a GPU technology, can do nothing. A ResetEra formulation of the problem has become the skeptics' slogan: in its current state, the game could not run "at any resolution or frame rate" — because resolution and frame rate are not the binding constraints. Storage twists the knife: the install is estimated at 120–200 GB, while Switch 2 game cards cap at 64 GB and, per Ubisoft's own audio architect on *Outlaws*, are too slow for open-world streaming anyway.

Note what the two cases share: both are really arguments about how much of GTA VI's identity is negotiable. Cut crowd density, simulation depth, and streaming speed far enough and *something* called GTA VI runs on a Switch 2 — the question is whether Rockstar, a studio that delayed this game twice over "scope" and perfection (Bloomberg's making-of recounts publishing chief Jennifer Kolbe's two dreaded phone calls to Zelnick), would ship that something with its name on it.

## The business argument cuts against the port — from Rockstar's own alumni

The most interesting skeptic is not a spec sheet. **Jérémy Hartvick**, a former Rockstar open-world designer who worked on GTA VI itself (2017–2020), told Kiwi Talkz last month that a port "doesn't make sense" — and his argument is barely about hardware. GTA fans, he argues, buy the console GTA ships on; the Switch audience is not where the marginal GTA buyer lives; and a visibly compromised version risks the brand for little incremental reach. It rhymes with history: **GTA V, the third-best-selling game ever made, never came to the Switch 1** — Rockstar sent the Trilogy and RDR instead, and this year alone chose to port *Borderlands 4* to Switch 2 (Take-Two's Gearbox) while keeping GTA VI off it. Zelnick's public line remains the generic February 2025 one: Take-Two will support Switch 2 "when it makes sense."

The counter is arithmetic: 23.68 million Switch 2s and counting is the fastest-growing install base in the industry, portable play is a genuinely different use case from the living-room consoles (nobody double-dips on a PS5 *and* an Xbox; a handheld is additive), and a studio that already proved itself on RDR's Switch 2 version exists and is hiring graphics programmers. If a port ever happens, the precedent timeline says it happens the Rockstar way: years late, at full price, on Rockstar's schedule — the way RDR arrived on Switch a decade and a half after launch.

## Verdict

- **Confirmed:** GTA VI, November 19, PS5 and Xbox Series X|S, $79.99. Nothing else.
- **Rumor:** everything about Switch 2, resting on a job listing that fits an RDR2 remaster as comfortably as it fits GTA VI.
- **Feasibility, honestly:** GPU — probably, with DLSS and cuts. CPU and simulation — that is the wall, and no one has published a credible route over it. Storage — a second wall.
- **Likelihood:** a launch-window port is close to inconceivable; a late-generation "impossible port" is the kind of thing this industry does produce — but only if Rockstar decides the compromised version is still *its* game.

The Double Eleven listing is probably about a remaster. But the debate it ignited is the real story of the Switch 2's first year: the machine has already run enough "impossible" games that the question is no longer whether Nintendo's hardware belongs in the current-gen conversation. It does. GTA VI is simply the one game engineered — deliberately, at 30 frames per second — to be the exception.

---

**Sources:** [Tech-Insider — the Double Eleven listing and rumor anatomy](https://tech-insider.org/gta-6-switch-2-port-rumors-job-listing-2026/) · [Digital Foundry — Extended Look frame analysis (via GameSpot/WikiGTA VI coverage)](https://www.gamespot.com) · [Wccftech — Virtuos' Eoin O'Grady on Switch 2 vs Series S](https://wccftech.com) · [Notebookcheck — KeplerL2-era spec comparisons and the Cdiscount listing](https://www.notebookcheck.net) · [GameSpot — GTA VI delay history and Bloomberg making-of summary](https://www.gamespot.com) · [Take-Two FY2027 guidance (SEC filing, May 21, 2026)](https://www.take2games.com) · [Variety — Devon Pritchard interview (Oct 2026)](https://variety.com) · [Kiwi Talkz — Jérémy Hartvick interview (Sept 2026)](https://www.youtube.com/@KiwiTalkz)
