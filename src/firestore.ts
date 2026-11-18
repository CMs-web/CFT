import { initializeApp } from 'firebase-admin/app';
import {
  Timestamp,
  getFirestore,
  type CollectionReference,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import { config } from './config';
import type { Message } from './types';

if (config.firestoreEmulatorHost !== undefined) {
  process.env.FIRESTORE_EMULATOR_HOST = config.firestoreEmulatorHost;
}

const app = initializeApp({ projectId: config.firebaseProjectId });

const firestore: Firestore = getFirestore(app);

export function messagesCollection(chatId: string): CollectionReference {
  return firestore.collection('chats').doc(chatId).collection('messages');
}

export function messageDocument(chatId: string, messageId: string): DocumentReference {
  return messagesCollection(chatId).doc(messageId);
}

export function readReceiptDocument(
  chatId: string,
  messageId: string,
  userId: string,
): DocumentReference {
  return messageDocument(chatId, messageId).collection('reads').doc(userId);
}

export function memberDocument(chatId: string, userId: string): DocumentReference {
  return firestore.collection('chats').doc(chatId).collection('members').doc(userId);
}

function timestampToIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export function readTimestampField(snapshot: DocumentSnapshot, field: string): string | null {
  const data = snapshot.data();
  if (data === undefined) {
    return null;
  }
  const value: unknown = data[field];
  return timestampToIso(value);
}

export function readMessageDocument(chatId: string, snapshot: DocumentSnapshot): Message {
  const data = snapshot.data();
  if (data === undefined) {
    throw new Error(`Message document has no data: ${snapshot.ref.path}`);
  }

  const senderId: unknown = data.senderId;
  const text: unknown = data.text;
  const createdAt = timestampToIso(data.createdAt);

  if (typeof senderId !== 'string' || typeof text !== 'string' || createdAt === null) {
    throw new Error(`Invalid message document: ${snapshot.ref.path}`);
  }

  return { id: snapshot.id, chatId, senderId, text, createdAt };
}

export function isAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  const code: unknown = error.code;
  return code === 6 || code === 'already-exists';
}
