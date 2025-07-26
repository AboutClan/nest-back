import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IVote2 } from './vote2.entity';
import { IVote2Repository } from './Vote2Repository.interface';
import { Vote2 } from 'src/domain/entities/Vote2/Vote2';
import { Participation } from 'src/domain/entities/Vote2/Vote2Participation';
import { Result } from 'src/domain/entities/Vote2/Vote2Result';
import { Member } from 'src/domain/entities/Vote2/Vote2Member';
import { ENTITY } from 'src/Constants/ENTITY';

export class Vote2Repository implements IVote2Repository {
  constructor(
    @InjectModel('vote2')
    private readonly Vote2Model: Model<IVote2>,
  ) {}

  async findByDate(date: string): Promise<Vote2 | null> {
    const db = await this.Vote2Model.findOne({ date });
    return db ? this.mapToDomain(db) : null;
  }

  async findById(id: string): Promise<Vote2 | null> {
    const db = await this.Vote2Model.findById(id);
    return db ? this.mapToDomain(db) : null;
  }

  async save(vote2: Vote2): Promise<void> {
    const dbObj = this.mapToDb(vote2);
    await this.Vote2Model.updateOne({ date: vote2.date }, dbObj, {
      upsert: true,
    });
  }

  async findParticipationsByDate(date: string) {
    let vote = await this.Vote2Model.findOne({ date }).populate({
      path: 'participations.userId',
      select: ENTITY.USER.C_SIMPLE_USER + 'isLocationSharingDenided',
    });

    if (!vote) {
      await this.Vote2Model.create({ date, results: [], participations: [] });
      vote = await this.Vote2Model.findOne({ date }).populate({
        path: 'participations.userId',
        select: ENTITY.USER.C_SIMPLE_USER + 'isLocationSharingDenided',
      });
    }

    return vote.participations;
  }

  async getVoteByPeriod(startDay: Date, endDay: Date) {
    return this.Vote2Model.find({
      date: {
        $gte: startDay,
        $lt: endDay,
      },
    }).populate({
      path: 'results.members.userId',
      select: ENTITY.USER.C_SIMPLE_USER,
    });
  }

  mapToDomain(db: IVote2): Vote2 {
    return new Vote2({
      date: db.date,
      participations: (db.participations || []).map(
        (p) =>
          new Participation({
            userId: p.userId.toString(),
            latitude: p.latitude,
            longitude: p.longitude,
            start: p.start,
            end: p.end,
            comment: p.comment,
          }),
      ),
      results: (db.results || []).map(
        (r: any) =>
          new Result({
            placeId: r.placeId.toString(),
            members: (r.members || []).map(
              (m: any) =>
                new Member({
                  userId: m.userId.toString(),
                  arrived: m.arrived ? new Date(m.arrived) : undefined,
                  memo: m.memo,
                  img: m.img,
                  start: m.start,
                  end: m.end,
                  absence: m.absence,
                  comment: m.comment,
                }),
            ),
            center: r.center,
          }),
      ),
    });
  }

  mapToDb(domain: Vote2): IVote2 {
    return {
      date: domain.date,
      participations: domain.participations.map((p) => ({
        userId: p.userId,
        latitude: p.latitude,
        longitude: p.longitude,
        start: p.start,
        end: p.end,
        comment: p.comment ? p.comment.toPrimitives() : undefined,
      })),
      results: domain.results.map((r) => ({
        placeId: r.placeId,
        members: r.members.map((m) => ({
          userId: m.userId,
          arrived: m.arrived,
          memo: m.memo,
          img: m.img,
          start: m.start,
          end: m.end,
          absence: m.absence,
          comment: m.comment ? m.comment.toPrimitives() : undefined,
        })),
        center: r.center,
      })),
    } as IVote2;
  }
}
