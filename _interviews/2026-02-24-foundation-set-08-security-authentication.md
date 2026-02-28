---
title: "Foundation Set 8: Security & Authentication (25 Q&A)"
description: "Rapid-fire iOS security questions: Keychain, token handling, certificate pinning, biometric auth, and secure coding fundamentals."
date: 2026-02-24
category: foundation
permalink: /interviews/foundation-security-authentication/
tags:
  - Foundation
  - Security
  - Authentication
  - Keychain
  - Biometrics
difficulty: Medium
excerpt: "25 practical security Q&A covering iOS auth flows, secure storage, transport security, and common interview pitfalls."
---

## 🔐 Security & Authentication - 25 Quick Q&A

### Q1: Where should access tokens be stored on iOS?
**A:** Keychain, not `UserDefaults`.

### Q2: Why avoid storing tokens in plain files?
**A:** File storage is easier to extract from compromised devices/backups.

### Q3: What is Keychain good for?
**A:** Small secrets: tokens, credentials, encryption keys.

### Q4: What is certificate pinning?
**A:** Validating server certificate/public key against expected value.

### Q5: Risk of hard pinning?
**A:** Cert rotation can break app connectivity if pins are stale.

### Q6: What is ATS?
**A:** App Transport Security; enforces secure HTTPS defaults.

### Q7: OAuth2 in mobile: key best practice?
**A:** Use PKCE for public clients.

### Q8: Access vs refresh token difference?
**A:** Access token short-lived; refresh token obtains new access tokens.

### Q9: Should refresh token live forever?
**A:** No, enforce rotation/revocation policy.

### Q10: What is replay attack in auth context?
**A:** Reusing intercepted credentials/tokens to impersonate user.

### Q11: Mitigation for replay?
**A:** Short TTL tokens, nonce/state checks, TLS.

### Q12: Why sanitize logs?
**A:** Prevent secret leakage in crash/analytics logs.

### Q13: Biometrics API on iOS?
**A:** `LocalAuthentication` (`Face ID`/`Touch ID`).

### Q14: Biometric auth replaces server auth?
**A:** No; it unlocks local secret use, server still verifies tokens.

### Q15: What is jailbreak/root risk?
**A:** Device trust model weaker; secrets easier to extract.

### Q16: App-side encryption enough?
**A:** Helps at rest, but key management and transport still critical.

### Q17: What are secure enclave benefits?
**A:** Hardware-backed key operations; private keys non-exportable.

### Q18: Common auth flow bug?
**A:** Not invalidating local session after server-side token revoke.

### Q19: Why use state param in OAuth redirect?
**A:** Protect against CSRF.

### Q20: Should tokens be embedded in URL query?
**A:** No; can leak via logs/proxies/history.

### Q21: Minimal password policy app-side?
**A:** Validate format but enforce policy server-side.

### Q22: What is least privilege in mobile backend APIs?
**A:** Token scopes only allow required actions.

### Q23: How to handle compromised token?
**A:** Revoke, rotate, force re-auth, monitor anomalous sessions.

### Q24: Why threat modeling matters?
**A:** Prioritizes realistic attack paths and mitigations.

### Q25: Interview-level summary?
**A:** Security is layered: transport, storage, auth protocol, backend validation, monitoring.
