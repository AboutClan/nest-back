import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseError } from 'src/errors/DatabaseError';
import { IUser } from 'src/routes/user/user.entity';
import { UserFilterType } from './adminUser.controller';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';

const logger = require('../../logger');

type UserQueryProps = {
  isActive: true;
  location?: string;
  score?: { $gt: number };
  monthScore?: { $gt: number };
  weekStudyAccumulationMinutes?: { $gt: number };
};
export default class AdminUserService {
  constructor(@InjectModel(DB_SCHEMA.USER) private User: Model<IUser>) {}

  async getAllUser(type?: UserFilterType) {
    const query: UserQueryProps = { isActive: true };

    if (type === 'study') {
      query.monthScore = { $gt: 0 };
    }

    const addField = type === 'study' ? 'studyRecord monthScore score' : '';
    return await this.User.find(query, ENTITY.USER.C_SIMPLE_USER + addField);
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
