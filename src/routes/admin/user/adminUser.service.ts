import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/routes/user/user.entity';
import { UserFilterType } from './adminUser.controller';

const logger = require('../../../logger');

type UserQueryProps = {
  isActive?: true;
  location?: string;
  score?: { $gt: number };
  monthScore?: { $gt: number };
  weekStudyAccumulationMinutes?: { $gt: number };
  'temperature.temperature'?: { $gt: number };
};
export default class AdminUserService {
  constructor(@InjectModel(DB_SCHEMA.USER) private User: Model<IUser>) {}

  async getAllUser(type?: UserFilterType) {
    const query: UserQueryProps = { isActive: true };

    if (type === 'study') {
      (query as any).$or = [
        { 'studyRecord.accumulationCnt': { $gt: 0 } },
        { 'studyRecord.accumulationMinutes': { $gt: 0 } },
      ];
    } else if (type === 'monthScore') {
      query.monthScore = { $gt: 0 };
    } else if (type === 'temperature') {
      query['temperature.temperature'] = { $gt: 36.5 };
    }

    const filterArr = ['3224546232'];

    const addField =
      type === 'study'
        ? 'studyRecord'
        : type === 'monthScore'
          ? 'monthScore rank'
          : 'locationDetail';

    if (type === 'temperature') {
      const res = await this.User.find(
        query,
        ENTITY.USER.C_SIMPLE_USER + addField,
      )
        .sort({ 'temperature.temperature': -1, 'temperature.cnt': -1 }) // 내림차순 정렬
        .limit(101);
      return res.filter((who) => !filterArr.includes(who.uid));
    } else {
      const res = await this.User.find(
        query,
        ENTITY.USER.C_SIMPLE_USER + addField,
      );
      console.log(31, res);
      return res.filter((who) => !filterArr.includes(who.uid));
    }
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
