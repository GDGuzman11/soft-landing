---
name: say-chats-schema
description: Say "chats per persona" Firestore layout and the path-arity decision behind it
metadata:
  type: project
---

Say moved from one continuous message stream per persona to discrete chats (sessions). The Firestore layout and all path construction go through `app-backend/functions/src/say/sayPaths.ts` (`chatsCollectionRef` / `chatDocRef` / `messagesCollectionRef`). Both `generateSayResponse.ts` and `startSayChat.ts` import from it.

**Why:** The frontend-stated contract path `say/{uid}/{personaId}/chats/{chatId}` is 5 segments (odd) which Firestore reads as a COLLECTION, so `{chatId}` cannot be a document there. Resolution: the `{personaId}` collection (which previously held message docs directly) now holds chat (session) **documents** directly; each chat doc owns a `messages` subcollection. The literal intermediate `chats` segment collapses into the persona collection. Chat doc fields: `{ createdAt, lastMessageAt, preview (~80 chars of latest msg), daySummary? }`. Messages: `{ role:'user'|'assistant'|'reachOut', content, reference?, createdAt }`.

**How to apply:** Never hand-build these paths — always use the sayPaths helpers so the layout stays consistent. If the frontend agent implements a literal extra `chats` level, this backend must be realigned (and vice versa) — FLAG any divergence. The opening-frequency guard lives at `sayState/{uid}` as `{ [personaId]: { openingGeneratedForDay: 'YYYY-MM-DD' } }`, merged.
