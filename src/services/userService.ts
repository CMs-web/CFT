import type { QueryResultRow } from 'pg';
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants';
import { db } from '../db';
import { HttpError } from '../errors';
import type { ChatSummary } from '../types';

interface UserIdRow extends QueryResultRow {
  id: string;
}

interface ChatSummaryRow extends QueryResultRow {
  id: string;
  type: string;
  created_at: Date;
  member_ids: string[];
}

/** Returns true when every id belongs to an existing user. */
export async function usersExist(userIds: readonly string[]): Promise<boolean> {
  const uniqueIds = [...new Set(userIds)];
  const result = await db.query<UserIdRow>('SELECT id FROM users WHERE id = ANY($1::text[])', [
    uniqueIds,
  ]);
  return result.rows.length === uniqueIds.length;
}

/** Lists all chats of a user with their member ids in one query. */
export async function listUserChats(userId: string): Promise<ChatSummary[]> {
  if (!(await userExists(userId))) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.userNotFound);
  }

  const result = await db.query<ChatSummaryRow>(
    `SELECT c.id,
            c.type,
            c.created_at,
            array_agg(all_members.user_id ORDER BY all_members.user_id) AS member_ids
     FROM chats c
     JOIN chat_members me ON me.chat_id = c.id AND me.user_id = $1
     JOIN chat_members all_members ON all_members.chat_id = c.id
     GROUP BY c.id, c.type, c.created_at
     ORDER BY c.created_at DESC, c.id DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    chatId: row.id,
    type: row.type,
    createdAt: row.created_at,
    memberIds: row.member_ids,
  }));
}

async function userExists(userId: string): Promise<boolean> {
  const result = await db.query<UserIdRow>('SELECT id FROM users WHERE id = $1', [userId]);
  return result.rows.length > 0;
}
