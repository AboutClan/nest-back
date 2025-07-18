import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IVote2 } from './vote2.entity';
import { IVote2Repository } from './Vote2Repository.interface';
import { Vote2 } from 'src/domain/entities/Vote2/Vote2';
import { Place } from 'src/domain/entities/Place';

export class Vote2Repository implements IVote2Repository {
  constructor(
    @InjectModel('Vote2')
    private readonly Vote2Model: Model<IVote2>,
  ) {}

  async findByDate(date: string): Promise<IVote2 | null> {
    return this.Vote2Model.findOne({ date });
  }

  mapToDomain(db: IVote2): Vote2 {
    return new Vote2({
      date: db.date,
      participations: (db.participations || []).map((p) => ({
        userId:
          typeof p.userId === 'object' && 'toString' in p.userId
            ? p.userId.toString()
            : p.userId,
        latitude: p.latitude,
        longitude: p.longitude,
        start: p.start,
        end: p.end,
        comment: p.comment ? { comment: p.comment.comment } : undefined,
      })),
      results: (db.results || []).map((r: any) => ({
        placeId:
          r.placeId && typeof r.placeId === 'object' && r.placeId.fullname
            ? new Place({
                ...r.placeId,
                // placeId가 mongoose doc일 경우 변환
                fullname: r.placeId.fullname,
                latitude:
                  r.placeId.latitude?.toString?.() ?? r.placeId.latitude,
                longitude:
                  r.placeId.longitude?.toString?.() ?? r.placeId.longitude,
                mapURL: r.placeId.mapURL,
                location: r.placeId.location,
              })
            : typeof r.placeId === 'object'
              ? r.placeId.toString()
              : r.placeId,
        members: (r.members || []).map((m: any) => ({
          userId:
            typeof m.userId === 'object' && 'toString' in m.userId
              ? m.userId.toString()
              : m.userId,
          arrived: m.arrived ? new Date(m.arrived) : undefined,
          memo: m.memo,
          img: m.img,
          start: m.start,
          end: m.end,
          absence: m.absence,
          comment: m.comment
            ? { comment: m.comment.comment ?? m.comment.text }
            : undefined,
        })),
        center: r.center,
      })),
    });
  }

  /**
   * 도메인 객체(Vote2) -> DB 객체(IVote2) 변환
   */
  mapToDb(domain: Vote2): IVote2 {
    return {
      date: domain.date,
      participations: domain.participations.map((p) => ({
        userId: p.userId,
        latitude: p.latitude,
        longitude: p.longitude,
        start: p.start,
        end: p.end,
        comment: p.comment ? { comment: p.comment.comment } : undefined,
      })),
      results: domain.results.map((r) => ({
        placeId:
          r.placeId instanceof Place ? r.placeId.toPrimitives() : r.placeId,
        members: r.members.map((m) => ({
          userId: m.userId,
          arrived: m.arrived,
          memo: m.memo,
          img: m.img,
          start: m.start,
          end: m.end,
          absence: m.absence,
          comment: m.comment ? { comment: m.comment.comment } : undefined,
        })),
        center: r.center,
      })),
    };
  }
}
