// sayPaths.ts — single source of truth for the Say "chats per persona" layout.
//
// SHARED CONTRACT (as stated by the frontend task):
//   chat doc:  say/{uid}/{personaId}/chats/{chatId}
//   messages:  say/{uid}/{personaId}/chats/{chatId}/messages/{msgId}
//
// ARITY NOTE (flagged in the implementation report):
// As literally segmented, `say/{uid}/{personaId}/chats/{chatId}` is 5 segments
// (odd) which Firestore treats as a COLLECTION path, so {chatId} cannot be a
// document there. To keep {chatId} a real document that owns a `messages`
// subcollection, the chat (session) documents live directly in the {personaId}
// collection — i.e. the {personaId} collection, which used to hold message docs
// in the single-stream design, now holds chat (session) docs. The literal
// intermediate `chats` segment collapses into the persona collection. Every
// reader/writer MUST go through these helpers so the layout stays consistent.

import type { Firestore, DocumentReference, CollectionReference } from 'firebase-admin/firestore'
import type { SayPersonaId } from './sayPrompt'

/** Collection of chat (session) documents for one persona. */
export function chatsCollectionRef(
  db: Firestore,
  uid: string,
  personaId: SayPersonaId,
): CollectionReference {
  return db.collection('say').doc(uid).collection(personaId)
}

/** A single chat (session) document. */
export function chatDocRef(
  db: Firestore,
  uid: string,
  personaId: SayPersonaId,
  chatId: string,
): DocumentReference {
  return chatsCollectionRef(db, uid, personaId).doc(chatId)
}

/** Messages subcollection nested under a chat document. */
export function messagesCollectionRef(
  db: Firestore,
  uid: string,
  personaId: SayPersonaId,
  chatId: string,
): CollectionReference {
  return chatDocRef(db, uid, personaId, chatId).collection('messages')
}
