import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/user/user.entity';
import { INOTICE_REPOSITORY } from 'src/utils/di.tokens';
import * as logger from '../logger';
import { INotice, NoticeZodSchema } from './notice.entity';
import { NoticeRepository } from './notice.repository.interface';

export default class NoticeService {
  private token: JWT;
  constructor(
    @Inject(INOTICE_REPOSITORY)
    private readonly noticeRepository: NoticeRepository,
    @InjectModel('User') private User: Model<IUser>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async createNotice(noticeData: Partial<INotice>) {
    await this.noticeRepository.createNotice(noticeData);
  }

  async findActiveLog() {
    const result = await this.noticeRepository.findActiveLog(this.token.uid);
    return result;
  }
  async getActiveLog() {
    logger.logger.info('hello', {
      type: 'point',
      value: 2,
    });

    const result = await this.noticeRepository.findActiveLog(this.token.uid);
    return result;
  }

  async deleteLike(to: string) {
    const updated = await this.User.findOneAndUpdate(
      { uid: to },
      { $inc: { like: -1 } },
    );
    if (!updated) throw new DatabaseError('delete like failed');
  }

  async setLike(to: string, message: string) {
    try {
      const validatedNotice = NoticeZodSchema.parse({
        from: this.token.uid,
        to,
        message,
      });

      await this.noticeRepository.createNotice(validatedNotice);
      await this.User.findOneAndUpdate(
        { uid: to },
        { $inc: { like: 1, point: 2 } },
      );

      logger.logger.info(message, {
        type: 'point',
        uid: to,
        value: 2,
      });
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async getLike() {
    const result = await this.noticeRepository.findLike(this.token.uid);
    return result;
  }
  async getLikeAll() {
    const results = await this.noticeRepository.findLikeAll();
    return results;
  }

  async getFriendRequest() {
    const result = await this.noticeRepository.findFriend(this.token.uid);
    return result;
  }

  async requestNotice(
    type: 'friend' | 'alphabet',
    toUid: string,
    message: string,
    sub?: string,
  ) {
    try {
      await this.noticeRepository.createNotice({
        from: this.token.uid,
        to: toUid,
        type,
        status: 'pending',
        message,
        sub,
      });
    } catch (err: any) {
      throw new DatabaseError('create notice failed');
    }
  }

  //todo: 이게 무슨로직??
  async updateRequestFriend(
    type: 'friend' | 'alphabet',
    from: string,
    status: string,
  ) {
    await this.noticeRepository.updateRecentStatus(
      this.token.uid,
      from,
      type,
      status,
    );

    return;
  }
}
