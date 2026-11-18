import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_LENGTH } from '../src/constants';
import { HttpError } from '../src/errors';
import {
  parseChatId,
  parseCreateChatBody,
  parseLastSeenBody,
  parseLimit,
  parseMessageId,
  parseSendMessageBody,
} from '../src/validation';

describe('parseLimit', () => {
  it('defaults to 50', () => {
    expect(parseLimit(undefined)).toBe(50);
  });

  it('accepts the inclusive bounds', () => {
    expect(parseLimit('1')).toBe(1);
    expect(parseLimit('100')).toBe(100);
  });

  it('rejects values outside 1..100 or with a non-integer format', () => {
    for (const value of ['0', '101', '-1', '1.5', 'abc', '']) {
      expect(() => parseLimit(value)).toThrow(HttpError);
    }
  });

  it('rejects arrays and objects', () => {
    expect(() => parseLimit(['1'])).toThrow(HttpError);
    expect(() => parseLimit({ limit: '1' })).toThrow(HttpError);
  });
});

describe('parseCreateChatBody', () => {
  it('accepts two user ids', () => {
    expect(parseCreateChatBody({ userAId: 'a', userBId: 'b' })).toEqual({
      userAId: 'a',
      userBId: 'b',
    });
  });

  it('rejects a non-object body', () => {
    expect(() => parseCreateChatBody(null)).toThrow(HttpError);
  });

  it('rejects a missing or blank field', () => {
    expect(() => parseCreateChatBody({ userAId: 'a' })).toThrow(HttpError);
    expect(() => parseCreateChatBody({ userAId: 'a', userBId: '   ' })).toThrow(HttpError);
  });
});

describe('parseSendMessageBody', () => {
  it('accepts text at the maximum length', () => {
    const text = 'a'.repeat(MAX_MESSAGE_LENGTH);
    expect(parseSendMessageBody({ senderId: 'a', text }).text).toBe(text);
  });

  it('rejects text over the maximum length', () => {
    const text = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
    expect(() => parseSendMessageBody({ senderId: 'a', text })).toThrow(HttpError);
  });

  it('rejects a non-string text', () => {
    expect(() => parseSendMessageBody({ senderId: 'a', text: 1 })).toThrow(HttpError);
  });
});

describe('parseLastSeenBody', () => {
  it('accepts both fields', () => {
    expect(parseLastSeenBody({ userId: 'a', messageId: 'm1' })).toEqual({
      userId: 'a',
      messageId: 'm1',
    });
  });

  it('rejects a missing message id', () => {
    expect(() => parseLastSeenBody({ userId: 'a' })).toThrow(HttpError);
  });
});

describe('parseChatId', () => {
  it('accepts a UUID and normalizes uppercase to lowercase', () => {
    const chatId = '63eec57e-857d-4b29-afab-b535ffe960c5';
    expect(parseChatId(chatId)).toBe(chatId);
    expect(parseChatId(chatId.toUpperCase())).toBe(chatId);
  });

  it('rejects a non-UUID', () => {
    expect(() => parseChatId('not-a-uuid')).toThrow(HttpError);
  });
});

describe('parseMessageId', () => {
  it('accepts a plain id and rejects path-like ids', () => {
    expect(parseMessageId('abc123')).toBe('abc123');
    for (const value of ['a/b', '.', '..', '']) {
      expect(() => parseMessageId(value)).toThrow(HttpError);
    }
  });
});
