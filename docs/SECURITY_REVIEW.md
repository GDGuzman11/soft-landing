# Security Review — Soft Landing

**Status**: PENDING — due before Phase 4  
**Reviewer**: security agent  
**Gate**: Phase 4 is blocked until status is marked COMPLETE

---

## Checklist

### Storage
- [ ] All AsyncStorage keys reviewed — confirm no raw PII stored without justification
- [ ] expo-secure-store usage audited — subscription state and tokens only
- [ ] No sensitive data in console.log statements

### Networking
- [ ] RevenueCat server-side receipt validation confirmed active
- [ ] No mood or message data sent to any third party
- [ ] All fetch/axios calls use HTTPS

### Secrets & Config
- [ ] `.env.example` matches all variables used in codebase (grep verified)
- [ ] No secrets hardcoded — grep for API keys, tokens, passwords
- [ ] `.env` is in `.gitignore` and not committed

### Notifications
- [ ] Notification payloads audited — no mood or message content in payload body

### Dependencies
- [ ] `pnpm audit` run — no critical or high CVEs unresolved
- [ ] react-native-purchases version pinned and reviewed

### Privacy
- [ ] No analytics SDK present without consent mechanism
- [ ] Privacy posture in SECURITY.md is accurate and up to date

---

## Findings

_(To be completed by security agent during Phase 3)_

---

## Sign-off

- [ ] All checklist items resolved or documented with accepted risk
- **Signed off by**: _(security agent)_
- **Date**: _(pending)_
