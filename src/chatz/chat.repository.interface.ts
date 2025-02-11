import { IChat, IContent } from './chat.entity';

export interface ChatRepository {
  find(user1: string, user2: string): Promise<IChat>;
  findChat(user1: string, user2: string): Promise<IChat>;
  findChats(userId: string): Promise<IChat[]>;
  findRecentChat(userId: string): Promise<IChat[]>;
  createChat(chatData: Partial<IChat>): Promise<IChat>;
  addContentToChat(
    user1: string,
    user2: string,
    content: IContent,
  ): Promise<null>;
}
