import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { CollectionService } from 'src/collection/collection.service';
import { C_simpleUser } from 'src/Constants/constants';
import { IUser } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';
import { IMember, IParticipation, IResult, IVote2 } from './vote2.entity';
import { IVote2Repository } from './vote2.repository.interface';

export class Vote2Repository implements IVote2Repository {
  constructor(
    @InjectModel('Vote2')
    private readonly Vote2: Model<IVote2>,
    @InjectModel('User') private User: Model<IUser>,
    private readonly collectionServiceInstance: CollectionService,
    private userServiceInstance: UserService,
  ) {}

  async findByDate(date: string) {
    let vote = await this.Vote2.findOne({ date }).populate([
      {
        path: 'results.placeId',
        populate: {
          path: 'reviews.user',
          select: C_simpleUser,
        },
      },
      { path: 'results.members.userId', select: C_simpleUser },
    ]);

    if (!vote) {
      await this.Vote2.create({ date, results: [], participations: [] });
      vote = await this.Vote2.findOne({ date }).populate([
        {
          path: 'results.placeId',
          populate: {
            path: 'reviews.user',
            select: C_simpleUser,
          },
        },
        { path: 'results.members.userId', select: C_simpleUser },
      ]);
    }

    console.log(vote);
    return vote;
  }
  async findParticipationsByDate(date: string) {
    let vote = await this.Vote2.findOne({ date }).populate({
      path: 'participations.userId',
      select: C_simpleUser + 'isLocationSharingDenided',
    });

    if (!vote) {
      await this.Vote2.create({ date, results: [], participations: [] });
      vote = await this.Vote2.findOne({ date }).populate({
        path: 'participations.userId',
        select: C_simpleUser + 'isLocationSharingDenided',
      });
    }

    return vote.participations;
  }

  async setAbsence(date: string, message: string, userId: string, fee: number) {
    await this.Vote2.updateMany(
      { date }, // 특정 date 문서만 선택
      {
        $set: {
          'results.$[].members.$[member].absence': true,
          'results.$[].members.$[member].memo': message,
          'results.$[].members.$[member].time': new Date(),
        },
      },
      {
        arrayFilters: [{ 'member.userId': userId }],
      },
    );
    await this.userServiceInstance.updatePoint(fee, '스터디 당일 불참');
  }

  async getVoteByPeriod(startDay: string, endDay: string) {
    return this.Vote2.find({
      date: {
        $gte: dayjs(startDay).toDate(),
        $lt: dayjs(endDay).toDate(),
      },
    }).populate({ path: 'results.members.userId', select: C_simpleUser });
  }

  async setArrive(date: string, userId: string, arriveData) {
    await this.Vote2.updateOne(
      { date, 'results.members.userId': userId },
      {
        $set: {
          'results.$[resultElem].members.$[memberElem]': arriveData,
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

  async findParticipationsByDateJoin(date: string) {
    return (await this.Vote2.findOne({ date }).populate('results.placeId'))
      .participations;
  }

  async setVote(date: string, userVoteData: IParticipation) {
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

  async updateResult(date: string, userId: string, start: string, end: string) {
    await this.Vote2.updateMany(
      { date },
      {
        $set: {
          'results.$[r].members.$[m].start': start,
          'results.$[r].members.$[m].end': end,
        },
      },
      {
        arrayFilters: [{ 'r.members.userId': userId }, { 'm.userId': userId }],
      },
    );
  }

  async setComment(date: string, userId: string, comment: string) {
    await this.Vote2.updateMany(
      { date },
      {
        $set: { 'results.$[r].members.$[m].comment': { comment } },
      },
      {
        arrayFilters: [{ 'r.members.userId': userId }, { 'm.userId': userId }],
      },
    );
  }

  async deleteVote(date: string, userId: string) {
    await this.Vote2.updateOne(
      { date },
      {
        $pull: {
          participations: { userId },
        },
      },
    );
  }

  async setVoteResult(date: string, result: IResult[]) {
    await this.Vote2.updateOne(
      { date },
      {
        $set: { results: result },
      },
    );
  }

  async setParticipate(
    date: string,
    placeId,
    participateData: Partial<IMember>,
  ) {
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
