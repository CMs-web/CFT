export interface CreateChatResult {
  chatId: string;
  created: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface ReadReceipt {
  chatId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface LastSeen {
  chatId: string;
  userId: string;
  lastSeenMessageId: string;
}

export interface ChatSummary {
  chatId: string;
  type: string;
  createdAt: Date;
  memberIds: string[];
}

export interface CreateChatBody {
  userAId: string;
  userBId: string;
}

export interface SendMessageBody {
  senderId: string;
  text: string;
}

export interface UserIdBody {
  userId: string;
}

export interface LastSeenBody {
  userId: string;
  messageId: string;
}
