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
import { ChatService } from 'src/chatz/chat.service';
import * as logger from '../logger';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ICHAT_SERVICE, ICOUNTER_SERVICE } from 'src/utils/di.tokens';
import { ICounterService } from 'src/counter/counterService.interface';
import { IChatService } from 'src/chatz/chatService.interface';

@Injectable()
export class GatherService {
  private token: JWT;

  constructor(
    @InjectModel('Gather') private Gather: Model<IGatherData>,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(ICHAT_SERVICE) private chatServiceInstance: IChatService,
    @Inject(ICOUNTER_SERVICE) private counterServiceInstance: ICounterService,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getGatherById(gatherId: number) {
    const gatherData = await this.Gather.findOne({ id: gatherId })
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      });

    return gatherData;
  }

  async getThreeGather() {
    const gatherData = await this.Gather.find()
      .populate(['user', 'participants.user', 'waiting.user', 'comments.user'])
      .populate({
        path: 'comments.subComments.user',
        select: C_simpleUser,
      })
      .sort({ id: -1 })
      .limit(3);

    return gatherData;
  }

  async getGather(cursor: number | null) {
    const gap = 12;
    let start = gap * (cursor || 0);

    let gatherData = await this.Gather.find()
      .sort({ id: -1 })
      .skip(start)
      .limit(gap)
      .select('-_id');

    gatherData = await this.Gather.populate(gatherData, [
      { path: 'user' },
      { path: 'participants.user' },
      { path: 'comments.user' },
      { path: 'waiting.user' },
      {
        path: 'comments.subComments.user',
        select: C_simpleUser,
      },
    ]);

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
    const created = await this.Gather.create(gatherData);

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
    const updated = await this.Gather.updateOne({ id: gather.id }, gather);
    if (!updated.modifiedCount) throw new DatabaseError('update gather failed');
    return;
  }

  async participateGather(gatherId: string, phase: string, userId: string) {
    const gather = await this.Gather.findOne({ id: gatherId });
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
    // const gather = await Gather.findOne({ id: gatherId });
    // if (!gather) throw new Error();

    // gather.participants = gather.participants.filter(
    //   (participant) => participant.user != this.token.id,
    // );
    // await gather.save();

    const gather = await this.Gather.findOneAndUpdate(
      { id: gatherId },
      {
        $pull: { participants: { user: this.token.id } },
      },
      { new: true, useFindAndModify: false },
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

  async setStatus(gatherId: string, status: gatherStatus) {
    const updated = await this.Gather.updateOne({ id: gatherId }, { status });
    if (!updated.modifiedCount) throw new DatabaseError('update failed');

    return;
  }
  async setWaitingPerson(id: string, phase: 'first' | 'second') {
    const gather = await this.Gather.findOne({ id });
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
    const gather = await this.Gather.findOne({ id });
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

    const updated = await this.Gather.updateOne(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      { $push: { 'comments.$.subComments': message } },
    );

    if (!updated.modifiedCount)
      throw new DatabaseError('create subcomment failed');

    return;
  }

  async deleteSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
  ) {
    const updated = await this.Gather.updateOne(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      { $pull: { 'comments.$.subComments': { _id: subCommentId } } },
    );
    if (!updated.modifiedCount)
      throw new DatabaseError('delete subcomment failed');
  }

  async updateSubComment(
    gatherId: string,
    commentId: string,
    subCommentId: string,
    comment: string,
  ) {
    const updated = await this.Gather.updateOne(
      {
        id: gatherId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      { $set: { 'comments.$[].subComments.$[sub].comment': comment } },
      {
        arrayFilters: [{ 'sub._id': subCommentId }],
      },
    );

    if (!updated.modifiedCount)
      throw new DatabaseError('update subcomment failed');

    return;
  }

  //수정필요
  async createComment(gatherId: string, comment: string) {
    const gather = await this.Gather.findOne({ id: gatherId });
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
    const gather = await this.Gather.findOne({ id: gatherId });
    if (!gather) throw new Error();

    gather.comments = gather.comments.filter(
      (com: any) => (com._id as string) != commentId,
    );

    await gather.save();

    return;
  }

  //수정필요
  async patchComment(gatherId: string, commentId: string, comment: string) {
    const gather = await this.Gather.findOne({ id: gatherId });
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
    const gather = await this.Gather.findOneAndUpdate(
      {
        id: gatherId,
        'comments._id': commentId,
      },
      {
        $addToSet: { 'comments.$.likeList': this.token.id },
      },
      { new: true }, // 업데이트된 도큐먼트를 반환
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
    const gather = await this.Gather.findOneAndUpdate(
      {
        id: gatherId,
        'comments._id': commentId,
        'comments.subComments._id': subCommentId,
      },
      {
        $addToSet: {
          'comments.$[comment].subComments.$[subComment].likeList':
            this.token.id,
        },
      },
      {
        arrayFilters: [
          { 'comment._id': commentId },
          { 'subComment._id': subCommentId },
        ],
        new: true, // 업데이트된 도큐먼트를 반환
      },
    );

    if (!gather) {
      throw new DatabaseError('cant find gather');
    }
  }

  async deleteGather(gatherId: string) {
    const deleted = await this.Gather.deleteOne({ id: gatherId });
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
