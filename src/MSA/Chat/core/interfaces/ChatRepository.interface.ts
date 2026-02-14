import { Chat } from '../domain/chat/Chat';
import { ContentProps } from '../domain/chat/Content';

export interface IChatRepository {
  findAll(): Promise<Chat[] | null>;
  findById(id: string): Promise<Chat | null>;
  findByUserId(userId: string): Promise<Chat[] | null>;
  findRecentChatByUserId(userId: string): Promise<Chat | null>;
  findByUser1AndUser2(user1Id: string, user2Id: string): Promise<Chat | null>;
  create(chat: Chat): Promise<Chat>;
  addContent(chatId: string, content: ContentProps): Promise<Chat>;
  save(chat: Chat): Promise<Chat>;
}
