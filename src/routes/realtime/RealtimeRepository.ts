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

  async save(entity: Realtime, id: string): Promise<Realtime> {
    const toSave = this.mapToDb(entity);
    const updated = await this.realtime
      .findByIdAndUpdate(id, toSave, {
        new: true,
      })
      .exec();
    if (!updated) throw new Error(`Realtime not found for id=${id}`);
    return this.mapToDomain(updated);
  }

  private mapToDomain(doc: IRealtime): Realtime {
    const users = (doc.userList ?? []).map((u) => {
      // Place ctor: (lat, lng, name, addr)
      const place = new Place(
        u.place.latitude,
        u.place.longitude,
        u.place.name,
        u.place.address,
      );
      // Time ctor: (start, end)
      const time = new Time(u.time.start, u.time.end);
      const comment = u.comment ? new Comment(u.comment.text) : undefined;

      return new RealtimeUser({
        userId: u.user.toString(),
        place: place.toPrimitives(),
        time: time.toPrimitives(),
        arrived: u.arrived,
        image: u.image as string,
        memo: u.memo,
        comment: comment ? comment.toPrimitives() : undefined,
        status: u.status,
      });
    });

    return new Realtime({
      date: doc.date,
      userList: users.map((u) => u.toPrimitives()),
    });
  }

  /** Domain → Document data */
  private mapToDb(entity: Realtime): Partial<IRealtime> {
    const { date, userList } = entity.toPrimitives();
    return {
      date,
      userList: (userList ?? []).map((u) => ({
        user: u.userId,
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
