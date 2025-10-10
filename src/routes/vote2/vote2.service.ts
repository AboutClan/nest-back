import { Inject } from '@nestjs/common';
import dayjs from 'dayjs';
import { CONST } from 'src/Constants/CONSTANTS';
import { WEBPUSH_MSG } from 'src/Constants/WEBPUSH_MSG';
import { Realtime } from 'src/domain/entities/Realtime/Realtime';
import { Result } from 'src/domain/entities/Vote2/Vote2Result';
import { RequestContext } from 'src/request-context';
import { PlaceRepository } from 'src/routes/place/place.repository.interface';
import RealtimeService from 'src/routes/realtime/realtime.service';
import { IUser } from 'src/routes/user/user.entity';
import { UserService } from 'src/routes/user/user.service';
import { WebPushService } from 'src/routes/webpush/webpush.service';
import { ClusterUtils, coordType } from 'src/utils/ClusterUtils';
import { DateUtils } from 'src/utils/Date';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { FcmService } from '../fcm/fcm.service';
import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';
import { IMember, IParticipation } from './vote2.entity';
import { IVote2Repository } from './Vote2Repository.interface';
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

  async getWeekData() {
    const dates = DateUtils.getWeekDate();

    const rawData = await Promise.all(
      dates.map(async (date, idx) => {
        if (idx === 0) {
          return await this.getAfterVoteInfo(date);
        } else {
          const before = await this.getBeforeVoteInfo(date);
          // const realtime = await this.RealtimeService.getTodayData(date);
          return { ...before };
        }
      }),
    );

    return dates.map((date, idx) => ({
      date,
      ...rawData[idx],
      ...(rawData[idx].realTimes && {
        realTimes: rawData[idx].realTimes.userList,
      }),
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
    const realtimeData = await this.RealtimeService.getTodayDataWithPlace(date);

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
      status: 'expected',
      realTimes: realtimeData
        ? {
            ...realtimeData,
            userList: realtimeData.userList.map((user) =>
              Realtime.formatRealtime(user),
            ),
          }
        : null,
    };
  }

  //todo: locationDetail 등록해야함
  private async getAfterVoteInfo(date: string) {
    const voteData = await this.Vote2Repository.findByDate(date);
    const realtimeData = await this.RealtimeService.getTodayDataWithPlace(date);
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
      status: 'open',
      realTimes: realtimeData
        ? {
            ...realtimeData,
            userList: realtimeData.userList.map((user) =>
              Realtime.formatRealtime(user),
            ),
          }
        : null,
      unmatchedUsers,
    };
  }

  async getArrivedPeriod(startDay: string, endDay: string) {
    const votes = await this.Vote2Repository.getVoteByPeriod(startDay, endDay);

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

    const { latitude, longitude, start, end, locationDetail, userId } =
      createVote;

    const voteData: any = {};

    voteData.userId = userId ? userId : token.id;

    // null이 아닌 경우만 필드에 추가
    if (vote2.results.length === undefined || vote2.results.length === 0) {
      voteData.isBeforeResult = true;
    }
    if (latitude !== null) voteData.latitude = latitude;
    if (longitude !== null) voteData.longitude = longitude;
    if (start !== null) voteData.start = start;
    if (end !== null) voteData.end = end;
    if (locationDetail !== null) voteData.locationDetail = locationDetail;

    vote2.setOrUpdateParticipation(voteData);

    await this.Vote2Repository.save(vote2);

    return;
  }

  async setVoteWithArr(dates: string[], createVote: CreateNewVoteDTO) {
    const thisWeek = DateUtils.getWeekDate();

    for (const date of thisWeek) {
      if (dates.includes(date)) {
        await this.setVote(date, createVote);
      } else {
        await this.deleteVote(date);
      }
    }
  }

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDateWithoutPopulate(date);

    const isRemoved = vote2.removeParticipationByUserId(token.id);

    if (!isRemoved) {
      return;
    }
    await this.Vote2Repository.save(vote2);
  }
  async deleteVoteWeek(date: string) {
    const token = RequestContext.getDecodedToken();

    const vote2 = await this.Vote2Repository.findByDate(date);

    vote2.removeParticipationByUserId(token.id);

    await this.Vote2Repository.save(vote2);
  }

  private refineClusters(
    coords: coordType[],
    clusters: number[][],
    maxMember: number,
    eps: number,
  ): number[][] {
    // 더 이상 분해가 필요 없으면 그대로 반환
    if (ClusterUtils.findLongestArrayLength(clusters) <= maxMember) {
      return clusters;
    }

    // 각 클러스터를 순회하면서, 너무 크면 반으로 재클러스터링
    return clusters.flatMap((cluster) => {
      if (cluster.length <= maxMember) {
        return [cluster];
      }
      // cluster에 속한 좌표만 뽑아서 DBSCAN
      const subCoords = cluster.map((i) => coords[i]);
      const { clusters: subClusters } = ClusterUtils.DBSCANClustering(
        subCoords,
        eps / 2,
      );

      // subClusters는 subCoords 기준 인덱스이므로 원본 인덱스로 매핑
      const remapped = subClusters.map((sub) =>
        sub.map((localIdx) => cluster[localIdx]),
      );

      // 재귀 호출로 깊이가 남아있다면 계속 분해
      return this.refineClusters(coords, remapped, maxMember, eps / 2);
    });
  }

  private async doAlgorithm(participations: IParticipation[]) {
    const coords = participations.map((loc) => ({
      lat: parseFloat(loc.latitude),
      lon: parseFloat(loc.longitude),
    }));

    let eps = 0.05;
    const maxMember = 8;
    const maxRetries = 2;
    let attempt = 0;

    let clusters: number[][] = [];
    let noise: number[] = [];
    let formedClusters: IParticipation[][] = [];

    // 1) eps 조정+클러스터링 재시도 루프
    while (attempt++ < maxRetries) {
      const result = ClusterUtils.DBSCANClustering(coords, eps);
      clusters = this.refineClusters(coords, result.clusters, maxMember, eps);
      noise = result.noise;

      formedClusters = ClusterUtils.transformArray(clusters, participations);

      if (formedClusters.length > 0) {
        break; // 성공
      }
      eps *= 2; // 빈 결과면 eps 키워서 재시도
    }

    // 2) 성공／실패 참여자 정리
    const successParticipations = clusters
      .flat()
      .map((idx) => participations[idx]);
    const failedParticipations = noise.map((idx) => participations[idx]);

    // 3) 최종 장소 매핑
    const places = await this.PlaceRepository.findByStatus('main');
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
    const participations: IParticipation[] = vote2.participations;

    const { voteResults, successParticipations, failedParticipations } =
      await this.doAlgorithm(participations);

    const successUserIds = successParticipations.map(
      (par) => (par.userId as unknown as IUser)._id,
    );

    const failedUserIds = failedParticipations.map(
      (par) => (par.userId as unknown as IUser)._id,
    );

    const resultInstances = voteResults.map((r) => new Result(r as any));
    vote2.setResult(resultInstances);

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
    //todo: score, point 추가
    await this.Vote2Repository.save(vote);

    await this.userServiceInstance.setVoteArriveInfo(token.id, arriveData.end);

    const isArriveBefore = vote.isVoteBefore(token.id);
    const isLate = vote.isLate(token.id);
    let point = 0;

    await this.userServiceInstance.updateScore(
      CONST.SCORE.ATTEND_STUDY,
      '스터디 출석',
    );
    await this.userServiceInstance.updateStudyRecord('study');

    if (isArriveBefore) {
      point = isLate
        ? CONST.POINT.STUDY_ATTEND_BEFORE() + CONST.POINT.LATE
        : CONST.POINT.STUDY_ATTEND_BEFORE();
      await this.userServiceInstance.updatePoint(
        point,
        `스터디 출석 ${isLate ? '(지각)' : ''}`,
        'study',
      );

      return {
        point,
        message: `스터디 출석 ${isLate ? '(지각)' : ''}`,
      };
    } else {
      point = CONST.POINT.STUDY_ATTEND_AFTER();
      const message = `스터디 당일 참여`;
      await this.userServiceInstance.updatePoint(point, message, 'study');

      return {
        point,
        message: `스터디 당일 참여 `,
      };
    }
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

  async setAbsence(date: string, message: string, fee?: number) {
    const token = RequestContext.getDecodedToken();

    const vote = await this.Vote2Repository.findByDate(date);

    vote.setAbsence(token.id, message);

    await this.Vote2Repository.save(vote);

    const isLate = dayjs().tz('Asia/Seoul').hour() > 13;

    await this.userServiceInstance.updatePoint(
      isLate ? CONST.POINT.NO_SHOW : CONST.POINT.ABSENCE,
      `스터디 당일 ${isLate ? '노쇼' : '불참'}`,
    );

    return {
      point: isLate ? CONST.POINT.NO_SHOW : CONST.POINT.ABSENCE,
      message: '스터디 당일 불참',
    };
  }
}
