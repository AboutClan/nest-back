import { IRealtimeRepository } from './RealtimeRepository.interface';
import { Realtime } from 'src/domain/entities/Realtime/Realtime';
import { IRealtime } from './realtime.entity';
import { Place } from 'src/domain/entities/Realtime/Place';
import { Time } from 'src/domain/entities/Realtime/Time';
import { RealtimeUser } from 'src/domain/entities/Realtime/RealtimeUser';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { Model } from 'mongoose';
import { Comment } from 'src/domain/entities/Realtime/Comment';

export class RealtimeRepository implements IRealtimeRepository {
  constructor(
    @InjectModel(DB_SCHEMA.REALTIME)
    private readonly realtime: Model<IRealtime>,
  ) {}

  async findByDate(date): Promise<Realtime> {
    const doc = await this.realtime.findOne({ date });

    return this.mapToDomain(doc);
  }

  async create(entity: Realtime): Promise<Realtime> {
    const toSave = this.mapToDb(entity);
    const created = await this.realtime.create(toSave);
    return this.mapToDomain(created);
  }

  async patchRealtime(userId: string, updateFields: any, date: string) {
    return await this.realtime.findOneAndUpdate(
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

  async updateStatusWithIdArr(date: string, userIds: string[]) {
    await this.realtime.updateMany(
      {
        date,
      },
      {
        $set: {
          'userList.$[inUser].status': 'cancel', // userIds에 포함된 것
          'userList.$[outUser].status': 'open', // userIds에 없는 것
        },
      },
      {
        arrayFilters: [
          { 'inUser.user': { $in: userIds } },
          { 'outUser.user': { $nin: userIds } },
        ],
      },
    );
  }

  async save(entity: Realtime): Promise<Realtime> {
    const toSave = this.mapToDb(entity);
    const updated = await this.realtime
      .findByIdAndUpdate(toSave._id, toSave, {
        new: true,
      })
      .exec();
    return this.mapToDomain(updated);
  }

  private mapToDomain(doc: IRealtime): Realtime {
    return new Realtime({
      date: doc.date,
      userList: (doc.userList ?? []).map((u) => ({
        user: u.user.toString(),
        place: {
          latitude: u.place.latitude,
          longitude: u.place.longitude,
          name: u.place.name,
          address: u.place.address,
        },
        arrived: u.arrived,
        image: u.image as string,
        memo: u.memo,
        comment: u.comment ? { text: u.comment.text } : undefined,
        status: u.status,
        time: {
          start: u.time.start,
          end: u.time.end,
        },
      })),
    });
  }

  /** Domain → Document data */
  private mapToDb(entity: Realtime): Partial<IRealtime> {
    const { date, userList } = entity.toPrimitives();
    return {
      _id: entity._id,
      date,
      userList: (userList ?? []).map((u) => ({
        user: u.user,
        place: u.place,
        arrived: u.arrived,
        image: u.image,
        memo: u.memo,
        comment: u.comment ? { text: u.comment.text } : undefined,
        status: u.status,
        time: u.time,
      })),
    };
  }
}
