import { InjectModel } from '@nestjs/mongoose';
import { IRealtime, IRealtimeUser } from './realtime.entity';
import { Model } from 'mongoose';
import { RealtimeRepository } from './realtime.repository.interface';

export class MongoRealtimeRepository implements RealtimeRepository {
  constructor(
    @InjectModel('Realtime')
    private readonly RealtimeModel: Model<IRealtime>,
  ) {}

  async findByDate(date: Date): Promise<IRealtime> {
    return await this.RealtimeModel.findOne({ date });
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
    await this.RealtimeModel.findOneAndUpdate(
      { date },
      {
        $set: {
          'userList.$[elem]': userData,
        },
        $addToSet: { userList: userData }, // 중복되지 않는 사용자 추가
      },
      {
        new: true,
        upsert: true, // 없으면 새로 생성
        arrayFilters: [{ 'elem.user': userId }], // 배열 필터로 특정 사용자 타겟팅
      },
    );
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
