"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsCollectionRef = chatsCollectionRef;
exports.chatDocRef = chatDocRef;
exports.messagesCollectionRef = messagesCollectionRef;
/** Collection of chat (session) documents for one persona. */
function chatsCollectionRef(db, uid, personaId) {
    return db.collection('say').doc(uid).collection(personaId);
}
/** A single chat (session) document. */
function chatDocRef(db, uid, personaId, chatId) {
    return chatsCollectionRef(db, uid, personaId).doc(chatId);
}
/** Messages subcollection nested under a chat document. */
function messagesCollectionRef(db, uid, personaId, chatId) {
    return chatDocRef(db, uid, personaId, chatId).collection('messages');
}
//# sourceMappingURL=sayPaths.js.map