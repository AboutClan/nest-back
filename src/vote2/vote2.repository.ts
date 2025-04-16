import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { Model } from 'mongoose';
import { CollectionService } from 'src/collection/collection.service';
import { C_simpleUser } from 'src/Constants/constants';
import { ATTEND_STUDY_POINT } from 'src/Constants/point';
import { ATTEND_STUDY_SCORE } from 'src/Constants/score';
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

  async findByDate(date: Date) {
    let vote = await this.Vote2.findOne({ date }).populate([
      { path: 'results.placeId' },
      { path: 'results.members.userId', select: C_simpleUser },
    ]);

    if (!vote) {
      await this.Vote2.create({ date, results: [], participations: [] });
      vote = await this.Vote2.findOne({ date }).populate([
        { path: 'results.placeId' },
        { path: 'results.members.userId', select: C_simpleUser },
      ]);
    }

    return vote;
  }
  async findParticipationsByDate(date: Date) {
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

  async setAbsence(date: Date, message: string, userId: string, fee: number) {
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
    await this.userServiceInstance.updateDeposit(fee, '스터디 당일 불참');
  }

  async getVoteByPeriod(startDay: string, endDay: string) {
    return this.Vote2.find({
      date: {
        $gte: dayjs(startDay).toDate(),
        $lt: dayjs(endDay).toDate(),
      },
    }).populate({ path: 'results.members.userId', select: C_simpleUser });
  }

  async setArrive(date: Date, userId: string, arriveData) {
    const vote = await this.Vote2.findOne({ date }).lean();

    const targetMember = vote?.results
      .flatMap((r) => r.members)
      .find((m) => m.userId?.toString() === userId);

    if (!targetMember) return;

    const merged = {
      ...targetMember,
      ...arriveData,
      start: dayjs().toDate(),
    };

    await this.Vote2.updateOne(
      { date, 'results.members.userId': userId },
      {
        $set: {
          'results.$[resultElem].members.$[memberElem]': merged,
        },
      },
      {
        arrayFilters: [
          { 'memberElem.userId': userId },
          { 'resultElem.members.userId': userId },
        ],
      },
    );

    const userData = await this.User.findOne({ _id: userId });

    if (userData) {
      const diffMinutes = dayjs(arriveData.end).diff(dayjs(), 'm');
      const record = userData.studyRecord;

      userData.studyRecord = {
        ...record,
        accumulationMinutes: record.accumulationMinutes + diffMinutes,
        accumulationCnt: record.accumulationCnt + 1,
        monthMinutes: record.monthMinutes + diffMinutes,
        monthCnt: record.monthCnt + 1,
      };

      await userData.save();
    }

    await Promise.all([
      this.userServiceInstance.updatePoint(ATTEND_STUDY_POINT, '스터디 출석'),
      this.userServiceInstance.updateScore(ATTEND_STUDY_SCORE, '스터디 출석'),
    ]);
    const result =
      await this.collectionServiceInstance.setCollectionStamp(userId);

    return result;
  }

  async findParticipationsByDateJoin(date: Date) {
    return (await this.Vote2.findOne({ date }).populate('results.placeId'))
      .participations;
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

  async updateResult(date: Date, userId: string, start: string, end: string) {
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

  async setComment(date: Date, userId: string, comment: string) {
    console.log(comment);
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
