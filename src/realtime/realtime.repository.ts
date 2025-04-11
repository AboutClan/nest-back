import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { C_simpleUser } from 'src/Constants/constants';
import { IRealtime, IRealtimeUser } from './realtime.entity';
import { RealtimeRepository } from './realtime.repository.interface';

export class MongoRealtimeRepository implements RealtimeRepository {
  constructor(
    @InjectModel('Realtime')
    private readonly RealtimeModel: Model<IRealtime>,
  ) {}

  async findByDate(date: Date): Promise<IRealtime> {
  
    return await this.RealtimeModel.findOne({ date }).populate({
      path: 'userList.user',
      select: C_simpleUser,
    });
  }
  async createByDate(date: Date): Promise<IRealtime> {
    return await this.RealtimeModel.create({ date });
  }
  async patchUser(date: Date, userData: any): Promise<IRealtime> {
    return await this.RealtimeModel.findOneAndUpdate(
      { date },
      {
        $addToSet: { userList: userData }, // 중복 방지와 추가 동시에 수행
        $setOnInsert: { date }, // 문서가 없을 때만 date 필드 설정
      },
      {
        new: true, // 업데이트된 문서를 반환
        upsert: true, // 문서가 없으면 새로 생성
      },
    );
  }
  async patchAttendance(
    date: Date,
    userData: any,
    userId: string,
  ): Promise<null> {
    const updateResult = await this.RealtimeModel.findOneAndUpdate(
      { date, 'userList.user': userId },
      {
        $set: { 'userList.$': userData },
      },
      {
        new: true,
      },
    );

    // 두 번째: 사용자가 없는 경우 추가
    if (!updateResult) {
      await this.RealtimeModel.findOneAndUpdate(
        { date },
        {
          $addToSet: { userList: userData },
        },
        {
          new: true,
          upsert: true,
        },
      );
    }

    return null;
  }
  async patchRealtime(
    userId: string,
    updateFields: Partial<IRealtimeUser>,
    date: Date,
  ) {
    return await this.RealtimeModel.findOneAndUpdate(
      {
        date, // date 필드가 일치하는 문서 찾기
        'userList.user': userId, // userList 배열 내의 user 필드가 일치하는 문서 찾기
      },
      {
        $set: updateFields,
      },
      {
        arrayFilters: [{ 'elem.user': userId }], // 배열 필터: user 필드가 일치하는 요소만 업데이트
        new: true, // 업데이트된 문서를 반환
      },
    );
  }
}
