import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JWT } from 'next-auth/jwt';
import { IDailyCheck } from './entity/dailyCheck.entity';

@Injectable()
export class DailyCheckService {
  private token: JWT;
  constructor(
    @InjectModel('Collection') private DailyCheck: Model<IDailyCheck>,
    token?: JWT,
  ) {
    this.token = token as JWT;
  }

  async setDailyCheck() {
    const findDailyCheck = await this.DailyCheck.findOne({
      uid: this.token.uid,
    }).sort({ updatedAt: -1 });

    if (findDailyCheck?.updatedAt) {
      if (dayjs().isSame(dayjs(findDailyCheck?.updatedAt), 'date')) {
        return '이미 출석체크를 완료했습니다.';
      }
      const validatedDailyCheck = DailyCheckZodSchema.parse({
        uid: this.token.uid,
        name: this.token.name,
      });
      await this.DailyCheck.create(validatedDailyCheck);
    } else return '오류. 관리자에게 문의하세요!';
  }

  async getLog() {
    const result = await this.DailyCheck.find(
      { uid: this.token.uid },
      '-_id -__v',
    );
    return result;
  }
  async getAllLog() {
    const result = await this.DailyCheck.find({}, '-_id -__v');
    return result;
  }
}
