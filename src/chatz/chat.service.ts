import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { IUser } from 'src/user/user.entity';
import { ICHAT_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { UserRepository } from 'src/user/user.repository.interface';
import { WebPushService } from 'src/webpush/webpush.service';
import { RequestContext } from 'src/request-context';
import { IChatRepository } from './ChatRepository.interface';
import { Chat } from 'src/domain/entities/chat/Chat';

@Injectable()
export class ChatService {
  constructor(
    //repository DI
    @Inject(ICHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly webPushServiceInstance: WebPushService,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
  ) {}

  async getChat(userId: string) {
    const token = RequestContext.getDecodedToken();

    const user1 = token.id > userId ? userId : token.id;
    const user2 = token.id < userId ? userId : token.id;

    const chat = await this.chatRepository.findByUser1AndUser2WithUser(
      user1,
      user2,
    );

    if (!chat)
      throw new NotFoundException(`can't find chat ${user1} and ${user2}`);

    const opponent =
      (chat.user1 as IUser)._id == token.id
        ? (chat.user2 as IUser)
        : (chat.user1 as IUser);

    const conversationForm = {
      opponent,
      contents: chat.contents.map((c) => c.toPrimitives()),
    };
    return conversationForm;
  }

  //todo: User 제거 가능?
  async getChats() {
    const token = RequestContext.getDecodedToken();

    const chats = await this.chatRepository.findByUserId(token.id);

    //채팅 데이터가 생성돼있으면 전부 가져옴
    const chatWithUsers = await Promise.all(
      chats.map(async (chat) => {
        const opponentId = chat.user1 == token.id ? chat.user2 : chat.user1;
        const opponent = await this.UserRepository.findById(
          opponentId as string,
        );
        if (!opponent)
          throw new NotFoundException(`cant find opponent ${opponentId}`);

        const chatForm = {
          user: opponent,
          content: chat.contents.length
            ? chat.contents[chat.contents.length - 1].toPrimitives()
            : null,
        };

        return chatForm;
      }),
    );

    return chatWithUsers;
  }

  async getRecentChat() {
    const token = RequestContext.getDecodedToken();

    const chat = await this.chatRepository.findRecentChatByUserId(token.id);

    if (!chat) throw new NotFoundException(`${token.id} dont have a chat`);

    return chat;
  }

  async createChat(toUserId: string, message: string) {
    const token = RequestContext.getDecodedToken();

    //user1, user2의 순서 항상 유지
    const user1 = token.id > toUserId ? toUserId : token.id;
    const user2 = token.id < toUserId ? toUserId : token.id;

    const contentFill = {
      content: message,
      userId: token.id,
    };

    const chat = await this.chatRepository.findByUser1AndUser2WithUser(
      user1,
      user2,
    );

    if (chat) {
      chat.addContent(contentFill);
    } else {
      const newChat = new Chat({
        user1,
        user2,
        contents: [contentFill],
      });
      await this.chatRepository.create(newChat);
    }

    //알림 보내기
    await this.webPushServiceInstance.sendNotificationToXWithId(
      toUserId,
      '쪽지를 받았어요!',
      message,
    );
  }
}
