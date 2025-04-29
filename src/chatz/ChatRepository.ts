import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from 'src/domain/entities/chat/Chat';
import { Content } from 'src/domain/entities/chat/Content';
import { IChat } from './chat.entity';
import { IChatRepository } from './ChatRepository.interface';

export class ChatRepository implements IChatRepository {
  constructor(
    @InjectModel('Chat')
    private readonly ChatModel: Model<IChat>,
  ) {}

  async findRecentChatByUserId(userId: string): Promise<Chat | null> {
    const doc = await this.ChatModel.find({
      $or: [{ user1: userId }, { user2: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!doc) return null;

    return this.mapToDomain(doc[0]);
  }

  async findByUserId(userId: string): Promise<Chat[] | null> {
    const doc = await this.ChatModel.find({
      $or: [{ user1: userId }, { user2: userId }],
    });
    if (!doc) return null;
    return doc.map((d) => this.mapToDomain(d));
  }

  async findAll(): Promise<Chat[] | null> {
    const doc = await this.ChatModel.find();
    if (!doc) return null;

    return doc.map((d) => this.mapToDomain(d));
  }

  async findById(id: string): Promise<Chat | null> {
    const doc = await this.ChatModel.findById(id);
    if (!doc) return null;
    return this.mapToDomain(doc);
  }

  async findByUser1AndUser2WithUser(
    user1Id: string,
    user2Id: string,
  ): Promise<Chat | null> {
    const doc = await this.ChatModel.findOne({
      user1: user1Id,
      user2: user2Id,
    }).populate('user1 user2');
    if (!doc) return null;
    return this.mapToDomain(doc);
  }

  async create(chat: Chat): Promise<Chat> {
    const docToSave = this.mapToDB(chat);
    const createdDoc = await this.ChatModel.create(docToSave);
    return this.mapToDomain(createdDoc);
  }

  async save(chat: Chat): Promise<Chat> {
    const docToSave = this.mapToDB(chat);
    const updatedDoc = await this.ChatModel.findByIdAndUpdate(
      docToSave._id,
      docToSave,
      { new: true },
    );

    if (!updatedDoc) {
      throw new HttpException(`Chat not found for id=${docToSave._id}`, 500);
    }

    return this.mapToDomain(updatedDoc);
  }

  private mapToDomain(doc: IChat): Chat {
    const chat = new Chat({
      user1: doc.user1,
      user2: doc.user2,
      status: doc.status,
      contents: doc.contents.map(
        (c) =>
          new Content({
            userId: c.userId,
            content: c.content,
            createdAt: c.createdAt,
          }),
      ),
    });

    return chat;
  }

  private mapToDB(chat: Chat): Partial<IChat> {
    const chatProps = chat.toPrimitives();

    return {
      user1: chatProps.user1,
      user2: chatProps.user2,
      status: chatProps.status,
      contents: chatProps.contents?.map((c) => ({
        userId: c.userId,
        content: c.content,
      })),
    };
  }
}
