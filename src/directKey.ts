import { Buffer } from 'node:buffer';

/**
 * Builds an unambiguous key for a direct chat.
 *
 * The user ids are sorted so (A, B) and (B, A) produce the same key. Each id
 * is prefixed with its UTF-8 byte length, so ids containing ":" cannot collide.
 */
export function buildDirectKey(userAId: string, userBId: string): string {
  const first = userAId <= userBId ? userAId : userBId;
  const second = userAId <= userBId ? userBId : userAId;
  const firstLength = Buffer.byteLength(first, 'utf8');
  const secondLength = Buffer.byteLength(second, 'utf8');

  return `${firstLength}:${first}${secondLength}:${second}`;
}
