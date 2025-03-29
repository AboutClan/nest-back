import { Chat } from 'src/domain/entities/chat/Chat';

export interface IChatRepository {
  findAll(): Promise<Chat[] | null>;
  findById(id: string): Promise<Chat | null>;
  findByUserId(userId: string): Promise<Chat[] | null>;
  findRecentChatByUserId(userId: string): Promise<Chat | null>;
  findByUser1AndUser2WithUser(
    user1Id: string,
    user2Id: string,
  ): Promise<Chat | null>;
  create(chat: Chat): Promise<Chat>;
  save(chat: Chat): Promise<Chat>;
}
