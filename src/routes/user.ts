import { Router } from 'express';
import { HTTP_STATUS } from '../constants';
import { asyncHandler } from '../middleware';
import { listUserChats } from '../services/userService';
import type { ChatSummary } from '../types';
import { requirePathParam } from '../validation';

interface ChatResponse {
  chatId: string;
  type: string;
  createdAt: string;
  memberIds: string[];
}

export const userRouter: Router = Router();

userRouter.get(
  '/:userId/chats',
  asyncHandler(async (req, res): Promise<void> => {
    const userId = requirePathParam(req.params, 'userId');
    const chats = await listUserChats(userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: chats.map(toChatResponse),
    });
  }),
);

function toChatResponse(chat: ChatSummary): ChatResponse {
  return {
    chatId: chat.chatId,
    type: chat.type,
    createdAt: chat.createdAt.toISOString(),
    memberIds: chat.memberIds,
  };
}
