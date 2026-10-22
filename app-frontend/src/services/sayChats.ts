import { collection, deleteDoc, doc, getDocs, writeBatch } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from './firebase'

// Firestore allows up to 500 writes per batch; stay under it.
const MAX_BATCH = 450

/**
 * Delete a Say chat and all of its messages for the current user.
 *
 * This is a client-side delete — the Firestore security rules permit the owner
 * to delete their own `say/{uid}/{personaId}/{chatId}` doc and its `messages`
 * subcollection, so no Cloud Function is required. Messages are removed in
 * chunked batches, then the chat document itself.
 */
export async function deleteSayChat(personaId: string, chatId: string): Promise<void> {
  const uid = getAuth().currentUser?.uid
  if (!uid) throw new Error('Not signed in')

  const messagesRef = collection(db, 'say', uid, personaId, chatId, 'messages')
  const snap = await getDocs(messagesRef)

  let batch = writeBatch(db)
  let count = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    count += 1
    if (count >= MAX_BATCH) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()

  await deleteDoc(doc(db, 'say', uid, personaId, chatId))
}
