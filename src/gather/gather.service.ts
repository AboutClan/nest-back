import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { JWT } from 'next-auth/jwt';
import { IChatService } from 'src/chatz/chatService.interface';
import { ICounterService } from 'src/counter/counterService.interface';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUserService } from 'src/user/userService.interface';
import {
  ICHAT_SERVICE,
  ICOUNTER_SERVICE,
  IGATHER_REPOSITORY,
  IUSER_SERVICE,
  IWEBPUSH_SERVICE,
} from 'src/utils/di.tokens';
import {
  gatherStatus,
  IGatherData,
  subCommentType,
} from './entity/gather.entity';
import { GatherRepository } from './gather.repository.interface';
import { IGatherService } from './gatherService.interface';
import {
  CANCEL_GAHTER_SCORE,
  CREATE_GATHER_SCORE,
  PARTICIPATE_GATHER_SCORE,
  REMOVE_GAHTER_SCORE,
} from 'src/Constants/score';
import { PARTICIPATE_GATHER_POINT } from 'src/Constants/point';
import { IWebPushService } from 'src/webpush/webpushService.interface';

@Injectable()
export class GatherService implements IGatherService {
  private token: JWT;

  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: GatherRepository,
    @Inject(IUSER_SERVICE)
    private readonly userServiceInstance: IUserService,
    @Inject(ICHAT_SERVICE) private chatServiceInstance: IChatService,
    @Inject(ICOUNTER_SERVICE) private counterServiceInstance: ICounterService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
    @Inject(IWEBPUSH_SERVICE) private webPushServiceInstance: IWebPushService,
  ) {
    this.token = this.request.decodedToken;
  }
  async getEnthMembers() {
    return await this.gatherRepository.getEnthMembers();
  }

  async getGatherById(gatherId: number) {
    const gatherData = await this.gatherRepository.findByIdPop(gatherId);
    return gatherData;
  }

  async getThreeGather() {
    const gatherData = await this.gatherRepository.findThree();

    return gatherData;
  }

  async getGather(cursor: number | null) {
    const gap = 12;
    let start = gap * (cursor || 0);

    let gatherData = await this.gatherRepository.findAll(start, gap);

    return gatherData;
  }

  //todo: 타입 수정 필요
  //place 프론트에서 데이터 전송으로 인해 생성 삭제
  async createGather(data: Partial<IGatherData>) {
    const nextId =
      await this.counterServiceInstance.getNextSequence('counterid');

    const gatherInfo = {
      ...data,
      user: this.token.id,
      id: nextId,
    };

    const gatherData = gatherInfo;
    const created = await this.gatherRepository.createGather(gatherData);

    if (!created) throw new DatabaseError('create gather failed');

    await this.userServiceInstance.updateScore(
      CREATE_GATHER_SCORE,
      '번개 모임 개설',
    );

    return;
  }

  async updateGather(gather: IGatherData) {
    const updated = await this.gatherRepository.updateGather(gather.id, gather);
    return;
  }

  async participateGather(gatherId: number, phase: string, userId: string) {
    //type 수정필요
    const gather = await this.gatherRepository.findById(gatherId.toString());
    if (!gather) throw new Error();

    const id = userId ?? this.token.id;
    if (!gather.participants.some((participant) => participant.user == id)) {
      gather.participants.push({
        user: id,
        phase,
      });
      await gather?.save();
    }

    await this.userServiceInstance.updateScore(
      PARTICIPATE_GATHER_SCORE,
      '번개 모임 참여',
    );
    await this.userServiceInstance.updatePoint(
      PARTICIPATE_GATHER_POINT,
      '번개 모임 참여',
    );
    if (gather.user)
      await this.webPushServiceInstance.sendNotificationToXWithId(
        gather?.user as string,
        '누군가 모임에 가입했어요',
        '접속하여 확인하세요!',
      );

    return;
  }

  async deleteParticipate(gatherId: number) {
    await this.gatherRepository.deleteParticipants(gatherId, this.token.id);

    await this.userServiceInstance.updateScore(
      CANCEL_GAHTER_SCORE,
      '번개 모임 참여 취소',
    );

    await this.userServiceInstance.updateAddTicket('gather', this.token.id);
    return;
  }

  async setStatus(gatherId: number, status: gatherStatus) {
    await this.gatherRepository.updateGather(gatherId, {
      status,
    });

    return;
  }
  async setWaitingPerson(id: string, phase: 'first' | 'second') {
    const gather = await this.gatherRepository.findById(id);
    if (!gather) throw new Error();

    try {
      const user = { user: this.token.id, phase };
      if (gather?.waiting) {
        if (gather.waiting.includes(user)) {
          return;
        }
        gather.waiting.push(user);
      } else {
        gather.waiting = [user];
      }
      await gather?.save();

      if (gather.user)
        await this.webPushServiceInstance.sendNotificationToXWithId(
          gather?.user as string,
          '누군가 모임에 가입했어요',
          '접속하여 확인하세요!',
        );
    } catch (err) {
      throw new Error();
    }
  }

  //가입신청 승인 or 거절
  async handleWaitingPerson(
    id: string,
    userId: string,
    status: string,
    text?: string,
  ) {
    try {
      let message = `모임 신청이 거절되었습니다. ${text}`;

      await this.gatherRepository.deleteWaiting(id, userId);
      const userTicket = await this.userServiceInstance.getTicketInfo(id);

      if (status === 'agree') {
        if (userTicket.gatherTicket <= 0) {
          message = '모임 신청 승인이 불가합니다. 티켓 부족.';
        } else {
          message = '모임 신청이 승인되었습니다.';
          await this.gatherRepository.agreeParticipate(id, userId);
          await this.userServiceInstance.updateReduceTicket('gather', userId);
        }
      }

      await this.webPushServiceInstance.sendNotificationToXWithId(
        userId,
        message,
        '접속하여 확인하세요!',
      );
      await this.chatServiceInstance.createChat(userId, message);
    } catch (err) {
      throw new Error();
    }
  }

  async createSubComment(gatherId: string, commentId: string, content: string) {
    const message: subCommentType = {
      user: this.token.id,
      comment: content,
    };

    await this.gatherRepository.createSubComment(gatherId, commentId, message);

    return;
  }

  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    await this.gatherRepository.deleteSubComment(
      gatherId,
      commentId,
      subCommentId,
    );
    return;
  }

  async updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    await this.gatherRepository.updateSubComment(
      gatherId,
      commentId,
      subCommentId,
      comment,
    );

    return;
  }

  //수정필요
  async createComment(gatherId: string, comment: string) {
    await this.gatherRepository.createComment(gatherId, this.token.id, comment);

    return;
  }

  //수정필요
  async deleteComment(gatherId: string, commentId: string) {
    await this.gatherRepository.deleteComment(gatherId, commentId);

    return;
  }

  //수정필요
  async patchComment(gatherId: string, commentId: string, comment: string) {
    await this.gatherRepository.updateComment(gatherId, commentId, comment);
    return;
  }

  async createCommentLike(gatherId: number, commentId: string) {
    const gather = await this.gatherRepository.createCommentLike(
      gatherId,
      commentId,
      this.token.id,
    );

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async createSubCommentLike(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const gather = await this.gatherRepository.createSubCommentLike(
      gatherId,
      commentId,
      subCommentId,
      this.token.id,
    );

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async deleteGather(gatherId: string) {
    const deleted = await this.gatherRepository.deleteById(gatherId);
    if (!deleted.deletedCount) throw new DatabaseError('delete failed');

    await this.userServiceInstance.updateScore(
      REMOVE_GAHTER_SCORE,
      '번개 모임 삭제',
    );
    return;
  }
}
