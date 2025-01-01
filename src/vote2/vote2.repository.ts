import { InjectModel } from '@nestjs/mongoose';
import { IParticipation, IResult, IVote2 } from './vote2.entity';
import { IVote2Repository } from './vote2.repository.interface';
import { Model } from 'mongoose';

export class Vote2Repository implements IVote2Repository {
  constructor(
    @InjectModel('Vote2')
    private readonly Vote2: Model<IVote2>,
  ) {}

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
}
