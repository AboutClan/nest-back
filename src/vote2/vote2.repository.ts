import { InjectModel } from '@nestjs/mongoose';
import { IMember, IParticipation, IResult, IVote2 } from './vote2.entity';
import { IVote2Repository } from './vote2.repository.interface';
import { Model } from 'mongoose';
import dayjs from 'dayjs';

export class Vote2Repository implements IVote2Repository {
  constructor(
    @InjectModel('Vote2')
    private readonly Vote2: Model<IVote2>,
  ) {}

  async findByDate(date: Date) {
    return await this.Vote2.findOne({ date });
  }
  async setAbsence(date: Date, message: string, userId: string) {
    await this.Vote2.updateMany(
      { date }, // 특정 date 문서만 선택
      {
        $set: {
          'results.$[].members.$[member].absence': true,
          'results.$[].members.$[member].memo': message,
        },
      },
      {
        arrayFilters: [{ 'member.userId': userId }],
      },
    );
  }

  async getVoteByPeriod(startDay: string, endDay: string) {
    return this.Vote2.find({
      date: {
        $gte: dayjs(startDay).toDate(),
        $lt: dayjs(endDay).toDate(),
      },
    }).populate('results.members.userId');
  }

  async setArrive(date: Date, userId: string, arriveData) {
    await this.Vote2.updateOne(
      { date, 'results.members.userId': userId },
      {
        $set: {
          'results.$[resultElem].members.$[memberElem]': {
            userId,
            ...arriveData,
          },
        },
      },
      {
        arrayFilters: [
          { 'memberElem.userId': userId },
          { 'resultElem.members.userId': userId },
        ],
      },
    );
  }

  async findParticipationsByDate(date: Date) {
    return (await this.Vote2.findOne({ date })).participations;
  }

  async setVote(date: Date, userVoteData: IParticipation) {
    // 1. 기존 userId가 존재하면 업데이트
    const updateResult = await this.Vote2.updateOne(
      { date, 'participations.userId': userVoteData.userId },
      {
        $set: { 'participations.$': userVoteData }, // 조건에 맞는 배열 요소 업데이트
      },
    );

    // 2. 기존 userId가 없으면 추가
    if (updateResult.matchedCount === 0) {
      await this.Vote2.updateOne(
        { date },
        {
          $addToSet: { participations: userVoteData }, // 새로운 참여 데이터 추가
        },
        { upsert: true },
      );
    }
  }

  async deleteVote(date: Date, userId: string) {
    await this.Vote2.updateOne(
      { date },
      {
        $pull: {
          participations: { userId },
        },
      },
    );
  }

  async setVoteResult(date: Date, result: IResult[]) {
    await this.Vote2.updateOne(
      { date },
      {
        $set: { results: result },
      },
    );
  }

  async setParticipate(date: Date, placeId, participateData: Partial<IMember>) {
    const { userId } = participateData;
    await this.Vote2.updateOne(
      {
        date,
        'results.placeId': placeId,
        'results.members.userId': { $ne: userId },
      }, // userId가 존재하지 않을 경우만 업데이트 },
      {
        $push: { 'results.$.members': participateData },
      },
    );
  }
}
