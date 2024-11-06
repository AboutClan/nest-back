import { InjectModel } from '@nestjs/mongoose';
import { ChatRepository } from './chat.repository.interface';
import { Model } from 'mongoose';
import { IChat } from './entity/chat.entity';

export class MongoChatRepository implements ChatRepository {
  constructor(
    @InjectModel('Chat')
    private readonly Chat: Model<IChat>,
  ) {}
  async find(user1: string, user2: string): Promise<IChat> {
    return await this.Chat.findOne({ user1, user2 });
  }
  async findChat(user1: string, user2: string): Promise<IChat> {
    return await this.Chat.findOne({ user1, user2 }).populate([
      'user1',
      'user2',
    ]);
  }
  async findChats(userId: string): Promise<IChat[]> {
    return await this.Chat.find({
      $or: [{ user1: userId }, { user2: userId }],
    });
  }
  async findRecentChat(userId: string): Promise<IChat[]> {
    return await this.Chat.find({
      $or: [{ user1: userId }, { user2: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(1);
  }
  async createChat(chatData: Partial<IChat>): Promise<IChat> {
    return await this.Chat.create(chatData);
  }
}
