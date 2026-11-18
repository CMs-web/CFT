import { randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import { db, withTransaction } from '../db';
import { buildDirectKey } from '../directKey';
import { HttpError } from '../errors';
import type { CreateChatResult } from '../types';
import { usersExist } from './userService';

interface ChatIdRow extends QueryResultRow {
  id: string;
}

interface ChatAccessRow extends QueryResultRow {
  is_member: boolean;
}

/** Creates the direct chat for two users, or returns the existing one. */
export async function createDirectChat(
  userAId: string,
  userBId: string,
): Promise<CreateChatResult> {
  if (userAId === userBId) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.usersMustDiffer);
  }

  if (!(await usersExist([userAId, userBId]))) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.usersNotFound);
  }

  return findOrCreateDirectChat(userAId, userBId);
}

/** Throws 404 when the chat is missing and 403 when the user is not a member. */
export async function requireChatMembership(chatId: string, userId: string): Promise<void> {
  const isMember = await findChatMembership(chatId, userId);

  if (isMember === null) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.chatNotFound);
  }

  if (!isMember) {
    throw new HttpError(HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.notAChatMember);
  }
}

/** Returns true when the chat exists. */
export async function chatExists(chatId: string): Promise<boolean> {
  const result = await db.query<ChatIdRow>('SELECT id FROM chats WHERE id = $1', [chatId]);
  return result.rows.length > 0;
}

async function findOrCreateDirectChat(userAId: string, userBId: string): Promise<CreateChatResult> {
  // Canonical, collision-safe key: (A, B) and (B, A) resolve to the same chat.
  const directKey = buildDirectKey(userAId, userBId);

  return withTransaction(async (client): Promise<CreateChatResult> => {
    const insertedChat = await insertDirectChat(client, directKey);

    if (insertedChat !== null) {
      await insertMembers(client, insertedChat.id, userAId, userBId);
      return { chatId: insertedChat.id, created: true };
    }

    // ON CONFLICT DO NOTHING returned no row, so another request won the race.
    const existingChat = await findDirectChat(client, directKey);
    return { chatId: existingChat.id, created: false };
  });
}

async function insertDirectChat(client: PoolClient, directKey: string): Promise<ChatIdRow | null> {
  const result = await client.query<ChatIdRow>(
    `INSERT INTO chats (id, type, direct_key)
     VALUES ($1, 'direct', $2)
     ON CONFLICT (direct_key) DO NOTHING
     RETURNING id`,
    [randomUUID(), directKey],
  );
  return result.rows[0] ?? null;
}

async function findDirectChat(client: PoolClient, directKey: string): Promise<ChatIdRow> {
  const result = await client.query<ChatIdRow>('SELECT id FROM chats WHERE direct_key = $1', [
    directKey,
  ]);
  const chat = result.rows[0];

  if (chat === undefined) {
    throw new Error('Direct chat conflict without an existing row');
  }

  return chat;
}

async function insertMembers(
  client: PoolClient,
  chatId: string,
  userAId: string,
  userBId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO chat_members (chat_id, user_id)
     VALUES ($1, $2), ($1, $3)`,
    [chatId, userAId, userBId],
  );
}

async function findChatMembership(chatId: string, userId: string): Promise<boolean | null> {
  const result = await db.query<ChatAccessRow>(
    `SELECT EXISTS (
       SELECT 1
       FROM chat_members
       WHERE chat_id = c.id AND user_id = $2
     ) AS is_member
     FROM chats c
     WHERE c.id = $1`,
    [chatId, userId],
  );
  const row = result.rows[0];
  // null means the chat does not exist; false means it exists but the user is not a member.
  return row === undefined ? null : row.is_member;
}
