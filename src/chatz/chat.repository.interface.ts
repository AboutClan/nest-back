import { IChat } from './entity/chat.entity';

export interface ChatRepository {
  findChat(user1: string, user2: string): Promise<IChat>;
  findChats(userId: string): Promise<IChat[]>;
  findRecentChat(userId: string): Promise<IChat[]>;
  createChat(chatData: Partial<IChat>): Promise<IChat>;
}
