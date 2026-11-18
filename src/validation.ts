import {
  DEFAULT_MESSAGE_LIMIT,
  ERROR_MESSAGES,
  HTTP_STATUS,
  INVALID_LIMIT_MESSAGE,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGE_LIMIT,
} from './constants';
import { HttpError } from './errors';
import type { CreateChatBody, LastSeenBody, SendMessageBody, UserIdBody } from './types';

type JsonObject = Record<string, unknown>;

interface StringFieldOptions {
  maxLength?: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(body: unknown): JsonObject {
  if (!isJsonObject(body)) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.requestBodyMustBeObject);
  }
  return body;
}

function requireString(
  source: JsonObject,
  field: string,
  options: StringFieldOptions = {},
): string {
  const value = source[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(
      HTTP_STATUS.BAD_REQUEST,
      `"${field}" is required and must be a non-empty string`,
    );
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new HttpError(
      HTTP_STATUS.BAD_REQUEST,
      `${field} must be at most ${options.maxLength} characters`,
    );
  }

  return value;
}

export function parseCreateChatBody(body: unknown): CreateChatBody {
  const source = parseJsonObject(body);
  return {
    userAId: requireString(source, 'userAId'),
    userBId: requireString(source, 'userBId'),
  };
}

export function parseSendMessageBody(body: unknown): SendMessageBody {
  const source = parseJsonObject(body);
  return {
    senderId: requireString(source, 'senderId'),
    text: requireString(source, 'text', { maxLength: MAX_MESSAGE_LENGTH }),
  };
}

export function parseUserIdBody(body: unknown): UserIdBody {
  const source = parseJsonObject(body);
  return { userId: requireString(source, 'userId') };
}

export function parseLastSeenBody(body: unknown): LastSeenBody {
  const source = parseJsonObject(body);
  return {
    userId: requireString(source, 'userId'),
    messageId: requireString(source, 'messageId'),
  };
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, INVALID_LIMIT_MESSAGE);
  }

  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MESSAGE_LIMIT) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, INVALID_LIMIT_MESSAGE);
  }

  return limit;
}

export function parseChatId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.chatNotFound);
  }
  return value.toLowerCase();
}

export function parseMessageId(value: string): string {
  if (value.length === 0 || value === '.' || value === '..' || value.includes('/')) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.messageNotFound);
  }
  return value;
}

export function requirePathParam(params: Record<string, string | undefined>, name: string): string {
  const value = params[name];
  if (value === undefined || value.length === 0) {
    throw new HttpError(HTTP_STATUS.BAD_REQUEST, `Missing path parameter "${name}"`);
  }
  return value;
}
