import { Inject } from '@nestjs/common';
import { IPlace } from 'src/place/place.entity';
import { PlaceRepository } from 'src/place/place.repository.interface';
import { IRealtimeUser } from 'src/realtime/realtime.entity';
import RealtimeService from 'src/realtime/realtime.service';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { ClusterUtils, coordType } from './ClusterUtils';
import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';
import { IMember, IParticipation } from './vote2.entity';
import { IVote2Repository } from './vote2.repository.interface';
import { DateUtils } from 'src/utils/Date';

export class Vote2Service {
  constructor(
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
    private readonly RealtimeService: RealtimeService,
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

  async getVoteInfo(date: string) {
    const now = new Date(date);

    const koreaTime = DateUtils.getKoreaToday();
    const hour = koreaTime.getHours();

    const targetTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

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

    //미래
    const tomorrow = new Date(koreaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return this.getBeforeVoteInfo(date);
  }

  private async getBeforeVoteInfo(date: string) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const voteResults = await this.doAlgorithm(participations);
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
      result.members.map((member) => member.userId._id.toString()),
    );

    participations?.forEach((par) => {
      if (!resultMembers.includes(par.userId.toString())) {
        unmatchedUsers.push(par.userId);
      }
    });

    return {
      results: voteData.results.map((result) => ({
        place: result.placeId,
        members: result.members.map((member) =>
          this.formatResultMember(member),
        ),
      })),
      realTimes: realtimeData
        ? {
            ...realtimeData.toObject(),
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

    const { latitude, longitude, start, end } = createVote;

    const voteData: any = {};

    voteData.userId = token.id;
    // null이 아닌 경우만 필드에 추가
    if (latitude !== null) voteData.latitude = latitude;
    if (longitude !== null) voteData.longitude = longitude;
    if (start !== null) voteData.start = start;
    if (end !== null) voteData.end = end;

    await this.Vote2Repository.setVote(date, voteData);
    return;
  }

  async deleteVote(date: string) {
    const token = RequestContext.getDecodedToken();
    await this.Vote2Repository.deleteVote(date, token.id);
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

    const places: IPlace[] = await this.PlaceRepository.findByStatus('active');

    //클러스터링 결과 계산
    const voteResults = await ClusterUtils.findClosestPlace(
      formedClusters,
      places,
    );

    return voteResults;
  }

  async setComment(date: string, comment: string) {
    const token = RequestContext.getDecodedToken();

    console.log(comment);
    await this.Vote2Repository.setComment(date, token.id, comment);
  }

  async setResult(date: string) {
    const today = DateUtils.getTodayYYYYMMDD();
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(today);

    const voteResults = await this.doAlgorithm(participations);

    await this.Vote2Repository.setVoteResult(today, voteResults);
  }

  async updateResult(date: string, start: string, end: string) {
    const token = RequestContext.getDecodedToken();
    await this.Vote2Repository.updateResult(date, token.id, start, end);
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

    return await this.Vote2Repository.setArrive(date, token.id, arriveData);
  }

  patchArrive(date: string) {
    throw new Error('Method not implemented.');
  }

  async setParticipate(date: string, createParticipate: CreateParticipateDTO) {
    const token = RequestContext.getDecodedToken();
    const { placeId, start, end } = createParticipate;

    await this.Vote2Repository.setParticipate(date, placeId, {
      start,
      end,
      userId: token.id,
    });
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

    await this.Vote2Repository.setAbsence(date, message, token.id, fee);
  }
}
