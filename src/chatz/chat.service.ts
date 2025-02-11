import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JWT } from 'next-auth/jwt';

import { IUser } from 'src/user/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ICHAT_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { ChatRepository } from './chat.repository.interface';
import { UserRepository } from 'src/user/user.repository.interface';
import { ChatZodSchema, ContentZodSchema } from './chat.entity';
import { WebPushService } from 'src/webpush/webpush.service';

@Injectable()
export class ChatService {
  private token: JWT;

  constructor(
    //repository DI
    @Inject(ICHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    private readonly webPushServiceInstance: WebPushService,
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
    if (!chat)
      throw new NotFoundException(`can't find chat ${user1} and ${user2}`);

    const opponent =
      (chat.user1 as IUser).id == this.token.id
        ? (chat.user2 as IUser)
        : (chat.user1 as IUser);

    const conversationForm = { opponent, contents: chat.contents };
    return conversationForm;
  }

  //todo: User 제거 가능?
  async getChats() {
    const chats = await this.chatRepository.findChats(this.token.id);

    //채팅 데이터가 생성돼있으면 전부 가져옴
    const chatWithUsers = await Promise.all(
      chats.map(async (chat) => {
        const opponentUid =
          chat.user1 == this.token.id ? chat.user2 : chat.user1;
        const opponent = await this.UserRepository.findById(
          opponentUid as string,
        );
        if (!opponent)
          throw new NotFoundException(`cant find opponent ${opponentUid}`);

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
  }

  async getRecentChat() {
    const chat = await this.chatRepository.findRecentChat(this.token.id);
    if (!chat) throw new NotFoundException(`${this.token.id} dont have a chat`);

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

    const chat = await this.chatRepository.find(user1, user2);
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
    await this.webPushServiceInstance.sendNotificationToXWithId(
      toUserId,
      '쪽지를 받았어요!',
      message,
    );
  }
}
