---
title: 'The "SMS of Death": One Silent Text Can Kill Your Android Phone''s Calls — and Google First Called It "Not a Security Issue"'
description: 'Independent researcher Mark Blaszczyk disclosed on October 29 that a malformed WAP Push message can crash Android''s telephony process with no tap, no inbox entry and no sender shown — dropping live calls, including emergency calls. He reported it to Google on May 5; Google classified it as a non-security issue. A fix reached Android 14–17 in October 2026 updates, while Android 12 and 13 remain unpatched.'
date: 2026-11-01
permalink: /life/android-sms-of-death/
tags:
  - Android
  - Security
  - Google
  - Smartphones
excerpt: 'The bug itself is a one-line integer mistake. The story is the six months around it: a researcher reporting a flaw that can cut off emergency calls, a vendor declining to treat it as security, and a fix that shipped quietly, unlisted in the bulletin that was supposed to announce it.'
---

> [中文版 Chinese version](/life/android-sms-of-death-zh/)

*This is a denial-of-service flaw, not a data-theft exploit: it cannot steal passwords or personal information, and there are no confirmed reports of real-world exploitation. Patch status varies by manufacturer and device; check your own security patch date rather than assuming you are covered.*

## What happens

The attack needs only your phone number. A specially crafted message arrives as a **WAP Push** message — a class of data SMS that Android's telephony framework processes in the background, separately from the messaging app you see. According to researcher Mark Blaszczyk's October 29 disclosure, the message produces **no inbox entry, no notification, and does not reveal the sender's number** to the recipient. You do not open it. You do not tap anything. There is nothing to avoid tapping.

Inside Android's `WapPushOverSms` handler, the function `decodeWapPdu()` reads the message's declared header length and converts it from a 64-bit long integer to a signed 32-bit integer **without checking whether the value fits**. A crafted value wraps around to a negative number; Android then tries to allocate a byte array of negative length, throws an uncaught `NegativeArraySizeException`, and the `com.android.phone` process — the process responsible for cellular connectivity — dies. In Blaszczyk's testing, a single message interrupted telephony for **one to two seconds** while the process restarted, killing any active voice call. He reproduced the crash on a Pixel 9 running April 2026 firmware and several Samsung Galaxy devices, including A-series models, and reports affecting Android 12 through 16 in testing, with Android 17 in the fix range.

The escalation is what makes it more than a dropped call. Because carriers may redeliver a message the phone never acknowledged, a single message can crash the phone repeatedly. And Blaszczyk reports that a burst of roughly **20 to 30 messages** can corrupt the SQLite database Android uses for SMS storage, leaving the malformed message queued so the telephony process crashes again every time the phone boots — a device that is difficult to use or recover without intervention. Digital Trends, summarizing the same disclosure, puts the reboot-loop threshold at around 20 messages.

## The six months that are the real story

Blaszczyk first reported the flaw to Google's Android vulnerability program on **May 5, 2026**. According to his published timeline, Google classified it as a **non-security issue** that did not meet its severity threshold, declined to fix it as a vulnerability, and reaffirmed that classification on October 29 — the day he published. Later coverage cites the flaw as **CVE-2026-58882**; the original write-up period carried no CVE, which is itself part of the classification dispute.

And yet a fix exists. Android's open-source code contains a June 15, 2026 change titled "Fix remote DoS in decodeWapPdu" that wraps the WAP Push processing in exception handling and deletes the offending message from the raw SMS database so it cannot loop on redelivery or boot. Blaszczyk says that change shipped in the **October 2026 security updates for Android 14 through 17** — but Google did not mention the vulnerability in its October security bulletin, according to Digital Trends. So the fix arrived unannounced, through the same quiet channel as the classification that denied the problem.

The gap is at the bottom of the range. Devices on **Android 12 and 13** have not received the same protection, according to Digital Trends and other coverage of the disclosure, and GSMDome notes Android 12 specifically as not receiving the correction. Those phones are disproportionately older, cheaper, and still in daily use — including as backup phones and family hand-me-downs, the devices least likely to be checked for patch status.

## The judgment

It is worth being precise about what Google got wrong here, because the usual criticism — "Google ignored a critical bug" — is slightly off. Google did not ignore it; its engineers wrote a fix in June. What Google did was refuse to *call it security*: no CVE at disclosure, no bulletin entry, no severity that would force the fix down every manufacturer's pipeline with urgency. That classification decision is a policy choice with real consequences. A bug classified as security gets tracked, backported, and announced; a bug classified as a robustness improvement gets shipped when convenient, and older versions quietly fall off the list.

The distinction the classification implicitly relies on — that a denial-of-service flaw is less serious than a data-theft flaw — collapses the moment the service being denied is a phone call. A flaw that can drop an emergency call is not a minor robustness issue because it steals nothing; the thing it denies is the phone's primary function. Google's own June commit title calls it a "remote DoS," which concedes the mechanism while the vulnerability program's classification denied the stakes.

For readers, the action is concrete and takes two minutes. On most phones: Settings → About phone → Android security update. You want **October 1, 2026 or later**. If your phone shows an older patch, check for a system update and install it; if your manufacturer has stopped shipping updates for your device — most likely on Android 12 or 13 — treat that as the decision point it is: the phone can still be silenced by a text message nobody can see coming, and no settings change prevents it. That is not a reason to panic. It is a reason to know your patch date, and to retire a phone whose patch date has stopped moving.

## Sources

- CyberInsider, "'SMS of Death' flaw cuts off Android calls without user interaction," October 29, 2026: https://cyberinsider.com/android-sms-telephony-crash-vulnerability/
- Digital Trends, "Android's new 'SMS of Death' exploit can crash your phone without you doing anything," October 2026: https://www.digitaltrends.com/phones/android-sms-of-death-vulnerability/
- GSMDome, "'SMS of Death' Android flaw can disrupt calls without opening a message," November 1, 2026: https://www.gsmdome.com/sms-of-death-android-flaw-can-disrupt-calls-without-opening-a-message
