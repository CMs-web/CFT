import { FieldPath, FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import { HttpError } from '../errors';
import {
  isAlreadyExistsError,
  memberDocument,
  messageDocument,
  messagesCollection,
  readMessageDocument,
  readReceiptDocument,
  readTimestampField,
} from '../firestore';
import type { LastSeen, Message, ReadReceipt } from '../types';
import { chatExists, requireChatMembership } from './chatService';

/** Stores a message in Firestore and returns the saved document. */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  await requireChatMembership(chatId, senderId);

  const reference = messagesCollection(chatId).doc();
  await reference.set({ senderId, text, createdAt: FieldValue.serverTimestamp() });
  return readMessageDocument(chatId, await reference.get());
}

/** Returns the newest messages in ascending timestamp order. */
export async function listMessages(chatId: string, limit: number): Promise<Message[]> {
  if (!(await chatExists(chatId))) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.chatNotFound);
  }

  const snapshot = await messagesCollection(chatId)
    .orderBy('createdAt', 'desc')
    // Equal server timestamps need a deterministic tie-break.
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => readMessageDocument(chatId, doc)).reverse();
}

/** Creates the first read receipt for a message and keeps its original readAt. */
export async function markMessageRead(
  chatId: string,
  userId: string,
  messageId: string,
): Promise<ReadReceipt> {
  await requireChatMembership(chatId, userId);

  const message = await messageDocument(chatId, messageId).get();
  if (!message.exists) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.messageNotFound);
  }

  if (readMessageDocument(chatId, message).senderId === userId) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.ownMessageRead);
  }

  const receiptRef = readReceiptDocument(chatId, messageId, userId);
  await createReadReceipt(receiptRef);

  const readAt = readTimestampField(await receiptRef.get(), 'readAt');
  if (readAt === null) {
    throw new Error(`Read receipt has no readAt timestamp: ${receiptRef.path}`);
  }

  return {
    chatId,
    messageId,
    userId,
    readAt,
  };
}

/** Stores the last message a user has seen in a chat. */
export async function updateLastSeen(
  chatId: string,
  userId: string,
  messageId: string,
): Promise<LastSeen> {
  await requireChatMembership(chatId, userId);

  const message = await messageDocument(chatId, messageId).get();
  if (!message.exists) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.messageNotFound);
  }

  await memberDocument(chatId, userId).set(
    { lastSeenMessageId: messageId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return { chatId, userId, lastSeenMessageId: messageId };
}

async function createReadReceipt(reference: DocumentReference): Promise<void> {
  try {
    await reference.create({ readAt: FieldValue.serverTimestamp() });
  } catch (error: unknown) {
    // Two concurrent requests may both try to create the first receipt.
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
}
