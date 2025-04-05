import { Inject } from '@nestjs/common';
import { IPlace } from 'src/place/place.entity';
import { PlaceRepository } from 'src/place/place.repository.interface';
import { RequestContext } from 'src/request-context';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { ClusterUtils, coordType } from './ClusterUtils';
import { CreateNewVoteDTO, CreateParticipateDTO } from './vote2.dto';
import { IParticipation } from './vote2.entity';
import { IVote2Repository } from './vote2.repository.interface';
import RealtimeService from 'src/realtime/realtime.service';

export class Vote2Service {
  constructor(
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
    private readonly RealtimeService: RealtimeService,
  ) {}

  async getVoteInfo(date: Date) {
    const now = new Date();
    // 9시간 더하기
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    // 시간(Hour)만 추출
    const hour = koreaTime.getHours();

    if (hour > 14 && hour < 22) return this.getBeforeVoteInfo(date);
    else return this.getAfterVoteInfo(date);
  }

  private async getBeforeVoteInfo(date: Date) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const voteResults = await this.doAlgorithm(participations);
    const resultPlaceIds = voteResults.map((result) => result.placeId);

    const resultPlaces = await this.PlaceRepository.findByIds(
      resultPlaceIds as string[],
    );

    return {
      participations,
      result: resultPlaces,
    };
  }

  private async getAfterVoteInfo(date: Date) {
    const voteData = await this.Vote2Repository.findByDate(date);
    const realtimeData = await this.RealtimeService.getTodayData();

    return {
      result: voteData.results,
      realtimes: realtimeData,
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

  async setVote(date: Date, createVote: CreateNewVoteDTO) {
    const token = RequestContext.getDecodedToken();

    const { latitude, longitude, start, end } = createVote;

    const userVoteData: IParticipation = {
      userId: token.id,
      latitude,
      longitude,
      start,
      end,
    };

    await this.Vote2Repository.setVote(date, userVoteData);
    return;
  }

  async deleteVote(date: Date) {
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
    let eps = 0.01;
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
  async setResult(date: Date) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const voteResults = await this.doAlgorithm(participations);

    await this.Vote2Repository.setVoteResult(date, voteResults);
  }

  async getFilteredVoteOne(date: any) {
    const voteData = await this.Vote2Repository.findByDate(date);
    return voteData.results.map((result) => {
      return {
        place: result.placeId,
        absences: result.members.filter((member) => member.absence),
        members: result.members.filter((member) => member.arrived),
      };
    });
  }

  async setArrive(date: Date, memo: string) {
    const token = RequestContext.getDecodedToken();
    const arriveData = {
      memo,
      arrived: new Date(),
    };
    await this.Vote2Repository.setArrive(date, token.id, arriveData);
  }

  patchArrive(date: Date) {
    throw new Error('Method not implemented.');
  }

  async setParticipate(date: Date, createParticipate: CreateParticipateDTO) {
    const token = RequestContext.getDecodedToken();
    const { placeId, start, end } = createParticipate;

    await this.Vote2Repository.setParticipate(date, placeId, {
      start,
      end,
      userId: token.id,
    });
  }

  async getAbsence(date: Date) {
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

  async setAbsence(date: Date, message: string) {
    const token = RequestContext.getDecodedToken();

    await this.Vote2Repository.setAbsence(date, message, token.id);
  }
}
