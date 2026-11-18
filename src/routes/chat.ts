import { Router } from 'express';
import { HTTP_STATUS } from '../constants';
import { asyncHandler } from '../middleware';
import { createDirectChat } from '../services/chatService';
import {
  listMessages,
  markMessageRead,
  sendMessage,
  updateLastSeen,
} from '../services/messageService';
import {
  parseChatId,
  parseCreateChatBody,
  parseLastSeenBody,
  parseLimit,
  parseMessageId,
  parseSendMessageBody,
  parseUserIdBody,
  requirePathParam,
} from '../validation';

export const chatRouter: Router = Router();

chatRouter.post(
  '/create',
  asyncHandler(async (req, res): Promise<void> => {
    const body: unknown = req.body;
    const input = parseCreateChatBody(body);
    const result = await createDirectChat(input.userAId, input.userBId);

    res.status(result.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }),
);

chatRouter.post(
  '/:chatId/message/send',
  asyncHandler(async (req, res): Promise<void> => {
    const body: unknown = req.body;
    const input = parseSendMessageBody(body);
    const chatId = parseChatId(requirePathParam(req.params, 'chatId'));
    const message = await sendMessage(chatId, input.senderId, input.text);

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: message });
  }),
);

chatRouter.get(
  '/:chatId/messages',
  asyncHandler(async (req, res): Promise<void> => {
    const limit = parseLimit(req.query.limit);
    const chatId = parseChatId(requirePathParam(req.params, 'chatId'));
    const messages = await listMessages(chatId, limit);

    res.status(HTTP_STATUS.OK).json({ success: true, data: messages });
  }),
);

chatRouter.post(
  '/:chatId/message/:messageId/read',
  asyncHandler(async (req, res): Promise<void> => {
    const body: unknown = req.body;
    const input = parseUserIdBody(body);
    const chatId = parseChatId(requirePathParam(req.params, 'chatId'));
    const messageId = parseMessageId(requirePathParam(req.params, 'messageId'));
    const receipt = await markMessageRead(chatId, input.userId, messageId);

    res.status(HTTP_STATUS.OK).json({ success: true, data: receipt });
  }),
);

chatRouter.post(
  '/:chatId/lastseen',
  asyncHandler(async (req, res): Promise<void> => {
    const body: unknown = req.body;
    const input = parseLastSeenBody(body);
    const chatId = parseChatId(requirePathParam(req.params, 'chatId'));
    const result = await updateLastSeen(chatId, input.userId, parseMessageId(input.messageId));

    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  }),
);
