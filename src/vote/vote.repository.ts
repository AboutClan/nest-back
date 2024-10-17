import { InjectModel } from '@nestjs/mongoose';
import { IVote, IParticipation } from './entity/vote.entity';
import { VoteRepository } from './vote.repository.interface';
import { Model } from 'mongoose';
import { strToDate } from 'src/utils/dateUtils';

export class MongoVoteRepository implements VoteRepository {
  constructor(
    @InjectModel('Vote')
    private readonly Vote: Model<IVote>,
  ) {}

  async findByDatePlaceAttAbs(date: Date): Promise<IVote> {
    return await this.Vote.findOne({ date }).populate([
      'participations.place',
      'participations.attendences.user',
      'participations.absences.user',
    ]);
  }

  async aggregateArrivedPeriod(
    startDay: string,
    endDay: string,
  ): Promise<any[]> {
    return await this.Vote.collection
      .aggregate([
        {
          $match: {
            date: {
              $gte: dayjs(startDay).toDate(),
              $lt: dayjs(endDay).toDate(),
            },
          },
        },
        {
          $unwind: '$participations',
        },
        {
          $unwind: '$participations.attendences',
        },
        {
          $lookup: {
            from: 'places',
            localField: 'participations.place',
            foreignField: '_id',
            as: 'place',
          },
        },
        {
          $project: {
            date: '$date',
            attendence: '$participations.attendences',
            place: '$place',
            status: '$participations.status',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'attendence.user',
            foreignField: '_id',
            as: 'attendence.user',
          },
        },
        {
          $unwind: '$place',
        },
        {
          $unwind: '$attendence.user',
        },
        {
          $project: {
            date: '$date',
            name: '$attendence.user.name',
            uid: '$attendence.user.uid',
            placeId: '$place._id',
            location: '$place.location',
            arrived: '$attendence.arrived',
            status: '$status',
          },
        },
      ])
      .toArray();
  }

  async create(date: Date, participants: IParticipation[]): Promise<IVote> {
    return await this.Vote.create({
      date,
      participations: participants,
    });
  }

  async isExist(date: Date, userId: string): Promise<any> {
    return await this.Vote.exists({
      date,
      'participations.attendences.user': userId, // 참석자 중 현재 사용자 존재 여부 확인
    });
  }
  async deleteUser(date: Date, uid: string): Promise<null> {
    await this.Vote.updateOne(
      { date },
      {
        $pull: {
          'participations.$[].attendences': {
            'user.uid': uid,
          },
        },
      },
    );
    return null;
  }
  async patchComment(
    date: Date,
    userId: string,
    comment: string,
  ): Promise<IVote> {
    return await this.Vote.findOneAndUpdate(
      {
        date,
        'participations.attendences.user': userId,
        'participations.attendences.firstChoice': true,
      },
      {
        $set: {
          'participations.$[].attendences.$[att].comment.text': comment,
        },
      },
      {
        arrayFilters: [{ 'att.user': userId, 'att.firstChoice': true }],
        new: true,
      },
    );
  }

  async patchVote(
    date: Date,
    userId: string,
    start: string,
    end: string,
  ): Promise<IVote> {
    return await this.Vote.findOneAndUpdate(
      { date, 'participations.attendences.user': userId },
      {
        $set: {
          'participations.$[].attendences.$[attendance].time.start': start,
          'participations.$[].attendences.$[attendance].time.end': end,
        },
      },
      {
        arrayFilters: [{ 'attendance.user': userId }],
        new: true, // 업데이트된 문서 반환
      },
    );
  }
  async deleteVote(date: Date, userId: string): Promise<null> {
    await this.Vote.updateOne(
      { date, 'participations.attendences.user': userId },
      {
        $pull: {
          'participations.$[].attendences': { user: userId },
        },
      },
    );
    return null;
  }
  async findAbsence(date: Date): Promise<IVote> {
    return await this.Vote.findOne({ date }, { 'participations.absences': 1 })
      .populate('participations.absences.user')
      .lean();
  }
  async createAbsence(
    date: Date,
    userId: string,
    message: string,
  ): Promise<any> {
    return await this.Vote.updateOne(
      {
        date,
        'participations.attendences.user': userId,
        'participations.attendences.firstChoice': true,
      },
      {
        $addToSet: {
          'participations.$[].absences': {
            user: userId,
            noShow: true,
            message,
          },
        },
      },
      {
        arrayFilters: [
          {
            'attendance.user': userId,
            'attendance.firstChoice': true,
          },
        ],
      },
    );
  }
  async findVoteWithAttPlace(date: Date): Promise<IVote> {
    return await this.Vote.findOne({ date }).populate([
      'participations.attendences.user',
      'participations.place',
    ]);
  }
  async patchConfirm(date: Date, userId: string): Promise<any> {
    return await this.Vote.updateOne(
      { date, 'participations.attendences.user': userId },
      {
        $set: {
          'participations.$[].attendences.$[attendance].confirmed': true,
        },
      },
      {
        arrayFilters: [{ 'attendance.user': userId }],
      },
    );
  }
  async patchDismiss(date: Date, userId: string): Promise<any> {
    return await this.Vote.updateOne(
      {
        date,
        'participations.attendences.user': userId,
      },
      {
        $pull: {
          'participations.$[].attendences': { user: userId },
        },
        $push: {
          'participations.$[].absences': {
            user: userId,
            noShow: false,
            message: '',
          },
        },
      },
      {
        arrayFilters: [{ 'attendance.user': userId }],
      },
    );
  }
  async aggregateStart(date: Date): Promise<any> {
    return await this.Vote.aggregate([
      { $match: { date } }, // 날짜 기준으로 필터링
      { $unwind: '$participations' }, // participations 배열을 펼침
      {
        $match: {
          'participations.status': { $in: ['open', 'free'] }, // status 필터링
          'participations.startTime': { $exists: true }, // startTime이 있는 참여자만
        },
      },
      {
        $project: {
          _id: 0, // _id 필드 제외
          place_id: '$participations.place', // place._id 필드만 포함
          startTime: '$participations.startTime', // startTime 필드 포함
        },
      },
    ]);
  }
  async patchFree(date: Date, placeId: string): Promise<any> {
    return await this.Vote.updateOne(
      {
        date, // 특정 날짜의 투표 필터링
        'participations.place': placeId, // placeId가 일치하는 participation 필터링
      },
      {
        $set: { 'participations.$[participation].status': 'free' }, // status 업데이트
      },
      {
        arrayFilters: [
          { 'participation.place': placeId }, // 특정 placeId를 가진 participation만 업데이트
        ],
        new: true,
      },
    );
  }
  async aggregateArriveCheck(startDay: string, endDay: string): Promise<any[]> {
    return await this.Vote.collection
      .aggregate([
        {
          $match: {
            date: {
              $gte: strToDate('2023-12-03').toDate(),
              $lte: strToDate('2023-12-04').toDate(),
            },
          },
        },
        {
          $unwind: '$participations',
        },
        {
          $unwind: '$participations.attendences',
        },
        {
          $project: {
            attendence: '$participations.attendences',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'attendence.user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $project: {
            arrived: '$attendence.arrived',
            uid: '$user.uid',
          },
        },
      ])
      .toArray();
  }
}
