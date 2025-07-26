import { Inject } from '@nestjs/common';
import { IPlace } from 'src/routes/place/place.entity';
import { PlaceRepository } from 'src/routes/place/place.repository.interface';
import { IRealtimeUser } from 'src/routes/realtime/realtime.entity';
import RealtimeService from 'src/routes/realtime/realtime.service';
import { RequestContext } from 'src/request-context';
import { UserService } from 'src/routes/user/user.service';
import { DateUtils } from 'src/utils/Date';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';
import { IMember, IParticipation } from './vote2.entity';
import { IUser } from 'src/routes/user/user.entity';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { ClusterUtils, coordType } from 'src/utils/ClusterUtils';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { CONST } from 'src/Constants/CONSTANTS';
import { FcmService } from '../fcm/fcm.service';
import { IVote2Repository } from './Vote2Repository.interface';
import { Result } from 'src/domain/entities/Vote2/Vote2Result';

export class Vote2Service {
  constructor(
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
    private readonly RealtimeService: RealtimeService,
    private readonly userServiceInstance: UserService,
    private readonly webPushServiceInstance: WebPushService,
    private readonly fcmServiceInstance: FcmService,
  ) {}

  formatMember(member: IMember) {
    const form = {
      user: member.userId,
      time: {
        start: member.start,
        end: member.end,
      },
    };
    return form;
  }

  formatResultMember(member: IMember) {
    const form = {
      user: member.userId,
      time: {
        start: member.start,
        end: member.end,
      },
      attendance: {
        time: member?.arrived,
        memo: member?.memo,
        attendanceImage: member?.img,
        type: member.arrived ? 'arrived' : member?.absence ? 'absenced' : null,
      },
      comment: member.comment,
    };

    return form;
  }
  formatRealtime(member: IRealtimeUser) {
    const form = {
      user: member.user,
      time: {
        start: member.time?.start,
        end: member.time?.end,
      },
      attendance: {
        time: member.arrived,
        memo: member?.memo,
        attendanceImage: member.image,
        type: member.arrived ? 'arrived' : null,
      },
      comment: {
        text: member.comment?.text,
      },
      place: member.place,
      status: member.status,
    };

    return form;
  }

  async getWeekData() {
    const dates = DateUtils.getWeekDate();

    const rawData = await Promise.all(
      dates.map(async (date, idx) => {
        if (idx === 0) {
          return await this.getAfterVoteInfo(date);
        } else {
          const before = await this.getBeforeVoteInfo(date);
          const realtime = await this.RealtimeService.getTodayData(date);
          return { ...before, realtime };
        }
      }),
    );

    return dates.map((date, idx) => ({
      date,
      ...rawData[idx],
    }));
  }

  async getVoteInfo(date: string) {
    // const now = new Date(date);
    // const targetTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const koreaTime = DateUtils.getKoreaToday();
    const hour = koreaTime.getHours();
    const targetTime = DateUtils.getKoreaDate(date);

    const todayStr = koreaTime.toISOString().split('T')[0];
    const targetStr = targetTime.toISOString().split('T')[0];

    // 과거
    if (targetStr < todayStr) {
      return this.getAfterVoteInfo(date);
    }
    // 오늘
    if (targetStr === todayStr && hour >= 9) {
      return this.getAfterVoteInfo(date);
    }

    return this.getBeforeVoteInfo(date);
  }

  private async getBeforeVoteInfo(date: string) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const { voteResults } = await this.doAlgorithm(participations);
    const resultPlaceIds = voteResults.map((result) => result.placeId);

    //todo: {placeId, members}로 오도록
    const resultPlaces = await this.PlaceRepository.findByIds(
      resultPlaceIds as string[],
    );

    const m = new Map<string, any>();
    resultPlaces.forEach((place) => m.set(place._id.toString(), place));

    const results = voteResults.map((result) => ({
      members: result.members.map((member) => this.formatMember(member)),
      place: m.get(result.placeId.toString()),
      center: result.center,
    }));

    return {
      participations: participations.map((par) => {
        const { userId, ...rest } = (par as any).toObject();
        return {
          ...rest,
          user: userId,
        };
      }),
      results,
    };
  }

  //todo: locationDetail 등록해야함
  private async getAfterVoteInfo(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);
    const realtimeData = await this.RealtimeService.getTodayData(date);
    //results

    const participations = voteData?.participations;

    const unmatchedUsers = [];

    const resultMembers = voteData.results.flatMap((result) =>
      result.members.map((member) => member.userId.toString()),
    );

    participations?.forEach((par) => {
      if (!resultMembers.includes(par.userId.toString())) {
        unmatchedUsers.push(par.userId);
      }
    });

    return {
      results: voteData.results.map((result) => ({
        place: result.placeId,
        members: result.members.map((member: any) =>
          this.formatResultMember(member),
        ),
      })),
      realTimes: realtimeData
        ? {
            ...realtimeData,
            userList: realtimeData.userList.map((user) =>
              this.formatRealtime(user),
            ),
          }
        : null,
      unmatchedUsers,
    };
  }

  async getArrivedPeriod(startDay: string, endDay: string) {
    const votes = await this.Vote2Repository.getVoteByPeriod(startDay, endDay);

    console.log(votes);
    const result = [];
    votes.forEach((vote) => {
      const a = {
        date: vote.date,
        arrivedInfoList: vote.results.map((result) => {
          const arrivedMembers = result.members.filter(
            (member) => member.arrived,
          );

          return {
            placeId: result.placeId,
            arrivedInfo: arrivedMembers.map((member) => {
              return {
                uid: member.userId.uid,
                name: member.userId.name,
              };
            }),
          };
        }),
      };
      result.push(a);
    });

    return result;
  }

  async setVote(date: string, createVote: CreateNewVoteDTO) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    const { latitude, longitude, start, end } = createVote;

    const voteData: any = {};

    voteData.userId = token.id;
    // null이 아닌 경우만 필드에 추가
    if (latitude !== null) voteData.latitude = latitude;
    if (longitude !== null) voteData.longitude = longitude;
    if (start !== null) voteData.start = start;
    if (end !== null) voteData.end = end;

    vote2.setOrUpdateParticipation(voteData);

    await this.Vote2Repository.save(vote2);

    await this.userServiceInstance.updateScore(
      CONST.SCORE.VOTE_STUDY,
      '스터디 투표',
    );
    return;
  }

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    vote2.removeParticipationByUserId(token.id);

    await this.Vote2Repository.save(vote2);

    await this.userServiceInstance.updateScore(
      -CONST.SCORE.VOTE_STUDY,
      '스터디 투표 취소',
    );
  }

  private async doAlgorithm(participations) {
    const coords: coordType[] = participations.map((loc) => {
      return {
        lat: parseFloat(loc.latitude),
        lon: parseFloat(loc.longitude),
      };
    });

    //시작 거리
    let eps = 0.05;
    const maxMember = 8;

    const { clusters, noise } = ClusterUtils.DBSCANClustering(coords, eps);

    //클러스터 결과 8명이 넘는 클러스터가 있을 경우, 더 작게 더 분해.
    while (ClusterUtils.findLongestArrayLength(clusters) > maxMember) {
      clusters.forEach((cluster: number[], i) => {
        if (cluster.length <= 8) return;
        const newCoords = coords.filter((coord, j) => cluster.includes(j));

        const { clusters: newClusters, noise: newNoise } =
          ClusterUtils.DBSCANClustering(newCoords, (eps /= 2));

        clusters.splice(i, 1, ...newClusters);
      });
    }

    //cluster결과(인덱스)를 실제 데이터로 치환
    const formedClusters = ClusterUtils.transformArray(
      clusters,
      participations,
    );

    // 2) 전체 성공 데이터(flat)만 뽑고 싶다면
    const successParticipations: (typeof participations)[] = clusters
      .flat()
      .map((idx) => participations[idx]);
    const failedParticipations = noise.map((idx) => participations[idx]);

    const places: IPlace[] = await this.PlaceRepository.findByStatus('active');

    //클러스터링 결과 계산
    const voteResults = await ClusterUtils.findClosestPlace(
      formedClusters,
      places,
    );

    return { voteResults, successParticipations, failedParticipations };
  }

  async setComment(date: string, comment: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);
    vote.setComment(token.id, comment);

    await this.Vote2Repository.save(vote);
  }

  async setResult(date: string) {
    const today = DateUtils.getTodayYYYYMMDD();

    //vote2에서 realtime 성공한 유저 삭제
    const realtimeSuccessUsers = await this.RealtimeService.setResult();
    const vote2 = await this.Vote2Repository.findByDate(today);

    for (const user of realtimeSuccessUsers) {
      vote2.removeParticipationByUserId(user);
    }

    //투표 결과 계산 시작
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(today);

    const { voteResults, successParticipations, failedParticipations } =
      await this.doAlgorithm(participations);

    const successUserIds = successParticipations.map(
      (par) => (par.userId as IUser)._id,
    );

    const failedUserIds = failedParticipations.map(
      (par) => (par.userId as IUser)._id,
    );

    const resultInstances = voteResults.map((r) => new Result(r as any));
    vote2.setRestult(resultInstances);

    await this.Vote2Repository.save(vote2);

    this.webPushServiceInstance.sendNotificationUserIds(
      successUserIds,
      WEBPUSH_MSG.VOTE.SUCCESS_TITLE,
      WEBPUSH_MSG.VOTE.SUCCESS_DESC,
    );

    this.webPushServiceInstance.sendNotificationUserIds(
      failedUserIds,
      WEBPUSH_MSG.VOTE.FAILURE_TITLE,
      WEBPUSH_MSG.VOTE.FAILURE_DESC,
    );
    await this.fcmServiceInstance.sendNotificationUserIds(
      successUserIds,
      WEBPUSH_MSG.VOTE.SUCCESS_TITLE,
      WEBPUSH_MSG.VOTE.SUCCESS_DESC,
    );

    await this.fcmServiceInstance.sendNotificationUserIds(
      failedUserIds,
      WEBPUSH_MSG.VOTE.FAILURE_TITLE,
      WEBPUSH_MSG.VOTE.FAILURE_DESC,
    );
  }

  async updateResult(date: string, start: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    vote.updateResult(token.id, start, end);
    await this.Vote2Repository.save(vote);
  }

  async getFilteredVoteOne(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);
    return voteData.results.map((result) => {
      return {
        place: result.placeId,
        absences: result.members.filter((member) => member.absence),
        members: result.members.filter((member) => member.arrived),
      };
    });
  }

  async setArrive(date: string, memo: string, end: string) {
    const token = RequestContext.getDecodedToken();

    const arriveData = {
      memo,
      arrived: new Date(),
      end,
    };

    const vote = await this.Vote2Repository.findByDate(date);
    vote.setArrive(token.id, memo, end);

    await this.Vote2Repository.save(vote);

    return await this.userServiceInstance.setVoteArriveInfo(
      token.id,
      arriveData.end,
    );
  }

  patchArrive(date: string) {
    throw new Error('Method not implemented.');
  }

  async setParticipate(date: string, createParticipate: CreateParticipateDTO) {
    const token = RequestContext.getDecodedToken();
    const { placeId, start, end } = createParticipate;

    const vote = await this.Vote2Repository.findByDate(date);

    vote.setParticipate(placeId, {
      start,
      end,
      userId: token.id,
    });

    await this.Vote2Repository.save(vote);
  }

  async getAbsence(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);

    const resultArr = [];
    voteData.results.forEach((result) => {
      resultArr.push(
        ...result.members.map((member) => {
          return {
            userId: member.userId,
            message: member.memo,
          };
        }),
      );
    });

    return resultArr;
  }

  async setAbsence(date: string, message: string, fee: number) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    vote.setAbsence(token.id, message);

    await this.userServiceInstance.updatePoint(fee, '스터디 당일 불참');

    await this.Vote2Repository.save(vote);

    // await this.Vote2Repository.setAbsence(date, message, token.id, fee);
  }
}
