import { JWT } from 'next-auth/jwt';
import { UserFilterType } from './adminUser.controller';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from 'src/user/entity/user.entity';
import { DatabaseError } from 'src/errors/DatabaseError';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { convertUserToSummary } from 'src/convert';
import { C_simpleUser } from 'src/constants';

const logger = require('../../logger');

type UserQueryProps = {
  isActive: true;
  location?: string;
  score?: { $gt: number };
  monthScore?: { $gt: number };
  weekStudyAccumulationMinutes?: { $gt: number };
};
export default class AdminUserService {
  private token: JWT;
  constructor(
    @InjectModel('User') private User: Model<IUser>,
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
  ) {
    this.token = this.request.decodedToken;
  }

  async getAllUser(
    location?: string,
    isSummary?: boolean,
    filterType?: UserFilterType,
  ) {
    const query: UserQueryProps = { isActive: true };
    if (location) query.location = location;

    switch (filterType) {
      case 'score':
        query.score = { $gt: 0 };
        break;
      case 'monthScore':
        query.monthScore = { $gt: 0 };
        break;
      case 'weekStudyAccumulationMinutes':
        query.weekStudyAccumulationMinutes = { $gt: 0 };
      default:
        break;
    }

    return isSummary
      ? await this.User.find(
          query,
          C_simpleUser + 'monthScore weekStudyAccumulationMinutes',
        )
      : await this.User.find(query);
  }

  async updateProfile(profile: Partial<IUser>) {
    const result = await this.User.updateOne({ uid: profile.uid }, profile);
    if (!result.modifiedCount) throw new DatabaseError('update failed');
    return;
  }

  async updateValue(
    uid: string,
    value: string,
    type: 'point' | 'score' | 'deposit',
    message: string,
  ) {
    const user = await this.User.findOne({ uid });
    if (!user) throw new Error();

    try {
      switch (type) {
        case 'point':
          user.point += parseInt(value);
          break;
        case 'score':
          user.score += parseInt(value);
          break;
        case 'deposit':
          user.deposit += parseInt(value);
          break;
      }

      await user.save();
    } catch (err) {
      throw new Error();
    }

    logger.logger.info(message, {
      type,
      uid,
      value,
    });
    return;
  }

  async deleteScore() {
    await this.User.updateMany({}, { $set: { score: 0 } });
    return;
  }

  async deletePoint() {
    await this.User.updateMany({}, { $set: { point: 0 } });
    return;
  }

  async getCertainUser(uid: string) {
    const user = await this.User.findOne({ uid: uid });
    return user;
  }

  async setRole(role: string, uid: string) {
    const result = await this.User.updateOne(
      { status: 'active', uid: uid },
      {
        $set: {
          role: role,
        },
      },
    );
    if (!result.modifiedCount) throw new DatabaseError('update failed');
    return;
  }

  async updateBelong(uid: string, belong: string) {
    await this.User.updateMany({ uid }, { $set: { belong } });
    return;
  }
}
