import { HttpException, Inject, Injectable } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';
import { ChatZodSchema, ContentZodSchema } from './entity/chat.entity';
import { IUser } from 'src/user/entity/user.entity';
import { DatabaseError } from 'src/errors/DatabaseError';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  ICHAT_REPOSITORY,
  IFCM_SERVICE,
  IUSER_REPOSITORY,
  IWEBPUSH_SERVICE,
} from 'src/utils/di.tokens';
import { IWebPushService } from 'src/webpush/webpushService.interface';
import { IFcmService } from 'src/fcm/fcm.interface';
import { IChatService } from './chatService.interface';
import { ChatRepository } from './chat.repository.interface';
import { UserRepository } from 'src/user/user.repository.interface';

@Injectable()
export class ChatService implements IChatService {
  private token: JWT;

  constructor(
    //repository DI
    @Inject(ICHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    @Inject(IFCM_SERVICE) private fcmServiceInstance: IFcmService,
    @Inject(IWEBPUSH_SERVICE) private webPushServiceInstance: IWebPushService,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getChat(userId: string) {
    const user1 = this.token.id > userId ? userId : this.token.id;
    const user2 = this.token.id < userId ? userId : this.token.id;
    const chat = await this.chatRepository.findChat(user1, user2);
    if (!chat) throw new DatabaseError("Can't find chatting");

    const opponent =
      (chat.user1 as IUser).id == this.token.id
        ? (chat.user2 as IUser)
        : (chat.user1 as IUser);

    const conversationForm = { opponent, contents: chat.contents };
    return conversationForm;
  }

  //todo: User 제거 가능?
  async getChats() {
    try {
      const chats = await this.chatRepository.findChats(this.token.id);

      //채팅 데이터가 생성돼있으면 전부 가져옴
      const chatWithUsers = await Promise.all(
        chats.map(async (chat) => {
          const opponentUid =
            chat.user1 == this.token.id ? chat.user2 : chat.user1;
          const opponent = await this.UserRepository.findById(
            opponentUid as string,
          );
          if (!opponent) throw new DatabaseError('no user');

          const chatForm = {
            user: opponent,
            content: chat.contents.length
              ? chat.contents[chat.contents.length - 1]
              : null,
          };

          return chatForm;
        }),
      );

      const sortedChat = chatWithUsers.sort((a, b) =>
        a.content.createdAt > b.content.createdAt ? -1 : 1,
      );

      return sortedChat;
    } catch (error) {
      throw new DatabaseError('error');
    }
  }

  async getRecentChat() {
    const chat = await this.chatRepository.findRecentChat(this.token.id);
    if (!chat) throw new DatabaseError('no chat');

    if (chat.length) {
      return chat?.[0]._id;
    } else {
      return '';
    }
  }

  async createChat(toUserId: string, message: string) {
    //user1, user2의 순서 항상 유지
    const user1 = this.token.id > toUserId ? toUserId : this.token.id;
    const user2 = this.token.id < toUserId ? toUserId : this.token.id;

    const chat = await this.chatRepository.find(user1, user2);
    if (!chat) throw new DatabaseError('no chat');

    const contentFill = {
      content: message,
      userId: this.token.id,
    };

    const validatedContent = ContentZodSchema.parse(contentFill);
    const validatedChat = ChatZodSchema.parse({
      user1,
      user2,
      contents: [contentFill],
    });

    if (chat) {
      await this.chatRepository.addContentToChat(
        user1,
        user2,
        validatedContent,
      );
    } else {
      await this.chatRepository.createChat(validatedChat);
    }

    //알림 보내기
    //Todo: UID더이상 사용x 모두 userId로 통일
    const toUser = await this.UserRepository.findById(toUserId);
    if (!toUser) throw new DatabaseError('toUserUid is incorrect');

    try {
      await this.fcmServiceInstance.sendNotificationToX(
        toUser.uid,
        '쪽지를 받았어요!',
        message,
      );
      await this.webPushServiceInstance.sendNotificationToX(
        toUser.uid,
        '쪽지를 받았어요!',
        message,
      );
    } catch (error) {
      throw new HttpException('error sending webpush', 500);
    }
  }
}
