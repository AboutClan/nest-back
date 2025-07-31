import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { Chat } from 'src/domain/entities/chat/Chat';
import { RequestContext } from 'src/request-context';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { ICHAT_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../fcm/fcm.service';
import { IChatRepository } from './ChatRepository.interface';
import { UserRepository } from '../user/UserRepository';

@Injectable()
export class ChatService {
  constructor(
    //repository DI
    @Inject(ICHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
    @Inject(IUSER_REPOSITORY)
    private readonly UserRepository: UserRepository,
  ) {}

  async getChat(userId: string) {
    const token = RequestContext.getDecodedToken();

    //bring chatting
    const user1 = token.id > userId ? userId : token.id;
    const user2 = token.id < userId ? userId : token.id;

    const chat = await this.chatRepository.findByUser1AndUser2(user1, user2);
    if (!chat)
      throw new NotFoundException(`can't find chat ${user1} and ${user2}`);

    //bring opponent information
    const opponent =
      chat.user1.toString() == token.id.toString()
        ? chat.user2.toString()
        : chat.user1.toString();

    const opponentUser = await this.UserRepository.findById(opponent);
    if (!opponentUser) {
      throw new NotFoundException(`can't find user ${opponent}`);
    }

    const conversationForm = {
      opponent: opponentUser,
      contents: chat.contents.map((c) => c.toPrimitives()),
    };
    return conversationForm;
  }

  async getChats() {
    const token = RequestContext.getDecodedToken();

    const chats = await this.chatRepository.findByUserId(token.id);

    //채팅 데이터가 생성돼있으면 전부 가져옴
    const chatWithUsers = (
      await Promise.all(
        chats.map(async (chat) => {
          const opponentId =
            chat.user1.toString() === token.id.toString()
              ? chat.user2.toString()
              : chat.user1.toString();

          const opponent = await this.UserRepository.findById(opponentId);

          if (!opponent) {
            return null; // opponent 없으면 스킵
          }
          return {
            user: {
              name: opponent.name,
              profileImage: opponent.profileImage,
              avatar: opponent?.avatar,
              _id: opponent._id,
            },
            content: chat.contents.length
              ? chat.contents[chat.contents.length - 1].toPrimitives()
              : null,
          };
        }),
      )
    ).filter((chatForm) => chatForm !== null); // null 제거

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

    const chat = await this.chatRepository.findByUser1AndUser2(user1, user2);

    const contentFill = {
      content: message,
      userId: token.id,
    };

    if (chat) {
      chat.addContent(contentFill);

      await this.chatRepository.save(chat);
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
      WEBPUSH_MSG.CHAT.ARRIVE(token.name),
      message,
    );
    await this.fcmServiceInstance.sendNotificationToXWithId(
      toUserId,
      WEBPUSH_MSG.CHAT.ARRIVE(token.name),
      message,
    );
  }
}
