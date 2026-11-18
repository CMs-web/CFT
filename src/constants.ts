export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const DEFAULT_PORT = 3000;
export const MIN_PORT = 1;
export const MAX_PORT = 65535;

export const MAX_JSON_BODY_SIZE = '100kb';
export const MAX_MESSAGE_LENGTH = 2000;
export const DEFAULT_MESSAGE_LIMIT = 50;
export const MAX_MESSAGE_LIMIT = 100;
export const INVALID_LIMIT_MESSAGE = `limit must be an integer between 1 and ${MAX_MESSAGE_LIMIT}`;

export const PG_POOL_MAX = 10;
export const PG_CONNECTION_TIMEOUT_MS = 5_000;
export const PG_IDLE_TIMEOUT_MS = 30_000;

export const SHUTDOWN_TIMEOUT_MS = 10_000;

export const ERROR_MESSAGES = {
  routeNotFound: 'Route not found',
  invalidJson: 'Invalid JSON body',
  internalServerError: 'Internal server error',
  requestBodyMustBeObject: 'Request body must be a JSON object',
  chatNotFound: 'Chat not found',
  messageNotFound: 'Message not found',
  userNotFound: 'User not found',
  notAChatMember: 'User is not a member of this chat',
  usersMustDiffer: 'userAId and userBId must be different',
  usersNotFound: 'One or both users not found',
  ownMessageRead: 'You cannot mark your own message as read',
} as const;
