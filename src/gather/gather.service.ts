import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import {
  gatherStatus,
  IGatherData,
  subCommentType,
} from './entity/gather.entity';
import { Inject, Injectable } from '@nestjs/common';
import { C_simpleUser } from 'src/constants';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/user/entity/user.entity';
import * as logger from '../logger';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  ICHAT_SERVICE,
  ICOUNTER_SERVICE,
  IGATHER_REPOSITORY,
} from 'src/utils/di.tokens';
import { ICounterService } from 'src/counter/counterService.interface';
import { IChatService } from 'src/chatz/chatService.interface';
import { IGatherService } from './gatherService.interface';
import { GatherRepository } from './gather.repository.interface';

@Injectable()
export class GatherService implements IGatherService {
  private token: JWT;

  constructor(
    @Inject(IGATHER_REPOSITORY)
    private readonly gatherRepository: GatherRepository,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(ICHAT_SERVICE) private chatServiceInstance: IChatService,
    @Inject(ICOUNTER_SERVICE) private counterServiceInstance: ICounterService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
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

    const user = await this.User.findOneAndUpdate(
      { _id: this.token.id },
      { $inc: { score: 5, monthScore: 5 } },
      { new: true, useFindAndModify: false },
    );

    if (!user) throw new DatabaseError('cant find user');

    logger.logger.info('번개 모임 개설', {
      metadata: {
        type: 'score',
        uid: user.uid,
        value: 5,
      },
    });

    return;
  }

  async updateGather(gather: IGatherData) {
    const updated = await this.gatherRepository.updateGather(gather.id, gather);
    return;
  }

  async participateGather(gatherId: string, phase: string, userId: string) {
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    const id = userId ?? this.token.id;
    if (!gather.participants.some((participant) => participant.user == id)) {
      gather.participants.push({
        user: id,
        phase,
      });
      await gather?.save();
    }

    const user = await this.User.findOneAndUpdate(
      { _id: id },
      { $inc: { score: 5, monthScore: 5 } },
      { new: true, useFindAndModify: false },
    );

    if (!user) throw new DatabaseError('cant find user');

    logger.logger.info('번개 모임 참여', {
      metadata: {
        type: 'score',
        uid: user.uid,
        value: 5,
      },
    });

    return;
  }

  async deleteParticipate(gatherId: string) {
    const gather = await this.gatherRepository.deleteParticipants(
      gatherId,
      this.token.id,
    );

    if (!gather) throw new Error('Gather not found');

    const user = await this.User.findOneAndUpdate(
      { _id: this.token.id },
      { $inc: { score: -5 } },
      { new: true, useFindAndModify: false },
    );

    if (!user) throw new Error('User not found');

    logger.logger.info('번개 모임 참여 취소', {
      metadata: {
        type: 'score',
        uid: user.uid,
        value: -5,
      },
    });
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
    } catch (err) {
      throw new Error();
    }
  }

  async handleWaitingPerson(
    id: string,
    userId: string,
    status: string,
    text?: string,
  ) {
    const gather = await this.gatherRepository.findById(id);
    if (!gather) throw new Error();

    try {
      gather.waiting = gather.waiting.filter(
        (who) => who.user.toString() !== userId,
      );
      if (status === 'agree') {
        gather.participants.push({
          user: userId,
          phase: 'first',
        });
      }

      gather.waiting = gather.waiting.filter(
        (participant) => participant.user !== userId,
      );

      await gather?.save();

      const message =
        status === 'agree'
          ? '모임 신청이 승인되었습니다.'
          : `모임 신청이 거절되었습니다. ${text}`;

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
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    gather.comments.push({
      user: this.token.id,
      comment,
    });

    await gather.save();

    return;
  }

  //수정필요
  async deleteComment(gatherId: string, commentId: string) {
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    gather.comments = gather.comments.filter(
      (com: any) => (com._id as string) != commentId,
    );

    await gather.save();

    return;
  }

  //수정필요
  async patchComment(gatherId: string, commentId: string, comment: string) {
    const gather = await this.gatherRepository.findById(gatherId);
    if (!gather) throw new Error();

    gather.comments.forEach(async (com: any) => {
      if ((com._id as string) == commentId) {
        com.comment = comment;
        await gather.save();
      }
    });
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

    const user = await this.User.findOneAndUpdate(
      { _id: this.token.id },
      { $inc: { score: -5, monthScore: -5 } },
      { new: true, useFindAndModify: false },
    );

    if (!user) throw new DatabaseError('cant find user');
    logger.logger.info('번개 모임 삭제', {
      metadata: {
        type: 'score',
        uid: user.uid,
        value: -5,
      },
    });
    return;
  }
}
