import { HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Chat } from '../core/domain/chat/Chat';
import { ContentProps } from '../core/domain/chat/Content';
import { IChatRepository } from '../core/interfaces/ChatRepository.interface';
import { IChat } from '../entity/chat.entity';

export class ChatRepository implements IChatRepository {
  constructor(
    @InjectModel(DB_SCHEMA.CHAT)
    private readonly ChatModel: Model<IChat>,
  ) {}

  async findRecentChatByUserId(userId: string): Promise<Chat | null> {
    const docs = await this.ChatModel.find({
      $or: [{ user1: userId }, { user2: userId }],
    });

    if (!docs.length) return null;

    const sortedDocs = docs.sort((a, b) => {
      const aLast = a.contents?.length
        ? new Date(a.contents[a.contents.length - 1].createdAt).getTime()
        : 0;

      const bLast = b.contents?.length
        ? new Date(b.contents[b.contents.length - 1].createdAt).getTime()
        : 0;

      return bLast - aLast;
    });

    return this.mapToDomain(sortedDocs[0]);
  }
  async findByUserId(userId: string): Promise<Chat[]> {
    const docs = await this.ChatModel.find({
      $or: [{ user1: userId }, { user2: userId }],
    });

    return docs
      .map((d) => this.mapToDomain(d))
      .sort((a, b) => {
        const aLast = a.contents?.length
          ? new Date(a.contents[a.contents.length - 1].createdAt).getTime()
          : 0;

        const bLast = b.contents?.length
          ? new Date(b.contents[b.contents.length - 1].createdAt).getTime()
          : 0;

        return bLast - aLast;
      });
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

  async findByUser1AndUser2(
    user1Id: string,
    user2Id: string,
  ): Promise<Chat | null> {
    const doc = await this.ChatModel.findOne({
      user1: user1Id,
      user2: user2Id,
    });

    if (!doc) return null;
    return this.mapToDomain(doc);
  }

  async addContent(chatId: string, content: ContentProps): Promise<Chat> {
    const doc = await this.ChatModel.findByIdAndUpdate(chatId, {
      $push: { contents: content },
    });
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
      docToSave.id,
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
      id: doc._id.toString(),
      user1: doc.user1.toString(),
      user2: doc.user2.toString(),
      status: doc.status,
      contents: doc.contents.map((c) => ({
        userId: c.userId.toString(),
        content: c.content,
        createdAt: c.createdAt,
      })),
    });

    return chat;
  }

  private mapToDB(chat: Chat): Partial<IChat> {
    const chatProps = chat.toPrimitives();
    return {
      id: chatProps.id,
      user1: chatProps.user1,
      user2: chatProps.user2,
      status: chatProps.status,
      contents: chatProps.contents?.map((c) => ({
        userId: c.userId,
        content: c.content,
        createdAt: c.createdAt,
      })),
    };
  }
}
