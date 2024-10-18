import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from './entity/user.entity';
import { UserRepository } from './user.repository.interface';

export class MongoUserRepository implements UserRepository {
  constructor(@InjectModel('User') private readonly User: Model<IUser>) {}
  async findByUid(uid: string): Promise<IUser> {
    return await this.User.findOne({ uid });
  }
  async findByUids(uids: string[]): Promise<IUser[]> {
    return await this.User.find({ uid: { $in: uids } });
  }
  async findByUidWithQ(uid: string, queryString: string): Promise<IUser> {
    return await this.User.findOne({ uid }, queryString);
  }
  async findAllWithQ(queryString: string): Promise<IUser[]> {
    return await this.User.findOne({}, queryString);
  }
  async updateUser(uid: string, updateInfo: any): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { $set: updateInfo },
      { new: true, upsert: false },
    );
    return null;
  }
  async findByLocation(location: string): Promise<IUser[]> {
    return await this.User.find({ location });
  }
  async findByUidIsActive(
    isActive: boolean,
    uid: string,
    all: boolean,
  ): Promise<IUser[]> {
    return await this.User.find({
      isActive,
      ...(all ? {} : { uid }), // 조건에 따라 필터링
    }).select(
      'birth avatar comment isActive location name profileImage score uid _id monthScore',
    ); // 필요한 필드만 선택
  }
  async findByIsActive(isActive: boolean): Promise<IUser[]> {
    return await this.User.find({ isActive });
  }
  async increasePoint(point: number, uid: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { point: point } }, // point 필드 값을 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );

    return null;
  }
  async increaseScore(score: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { score: score, monthScore: score } }, // score와 monthScore 필드를 동시에 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );
  }
  async increaseDeposit(deposit: number, uid: string): Promise<null> {
    return await this.User.findOneAndUpdate(
      { uid }, // 검색 조건
      { $inc: { deposit } }, // deposit 필드를 증가
      { new: true, useFindAndModify: false }, // 업데이트 후의 최신 문서를 반환
    );
  }
  async findAll(): Promise<IUser[]> {
    return await this.User.find();
  }
  async updatePreference(
    uid: string,
    place: any,
    subPlace: any[],
  ): Promise<null> {
    await this.User.updateOne(
      { uid },
      { studyPreference: { place, subPlace } },
    );
    return null;
  }
  async deleteFriend(uid: string, toUid: string): Promise<null> {
    await this.User.findOneAndUpdate({ uid }, { $pull: { friend: toUid } });
    await this.User.findOneAndUpdate(
      { uid: toUid },
      { $pull: { friend: uid } },
    );

    return null;
  }
  async updateFriend(uid: string, toUid: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { $addToSet: { friend: toUid } },
      { upsert: true },
    );
    await this.User.findOneAndUpdate(
      { uid: toUid },
      { $addToSet: { friend: uid } },
      { upsert: true },
    );

    return null;
  }
  async updateBelong(uid: string, belong: string): Promise<null> {
    await this.User.findOneAndUpdate(
      { uid },
      { belong },
      { new: true, upsert: false },
    );

    return null;
  }
}
