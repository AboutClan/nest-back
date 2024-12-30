import { Inject } from '@nestjs/common';
import { CreateNewVoteDTO } from './vote2.dto';
import { IVote2Service } from './vote2.service.interface';
import { REQUEST } from '@nestjs/core';
import { JWT } from 'next-auth/jwt';
import { Request } from 'express';
import { IVote2Repository } from './vote2.repository.interface';
import { IPLACE_REPOSITORY, IVOTE2_REPOSITORY } from 'src/utils/di.tokens';
import { IParticipation, IResult } from './vote2.entity';
import clustering from 'density-clustering';
import { PlaceRepository } from 'src/place/place.repository.interface';
import { IPlace } from 'src/place/entity/place.entity';

interface coordType {
  lat: number;
  lon: number;
}

export class Vote2Service implements IVote2Service {
  private token: JWT;

  constructor(
    @Inject(REQUEST) private readonly request: Request, // Request 객체 주입
    @Inject(IVOTE2_REPOSITORY)
    private readonly Vote2Repository: IVote2Repository,
    @Inject(IPLACE_REPOSITORY)
    private readonly PlaceRepository: PlaceRepository,
  ) {
    this.token = this.request.decodedToken;
  }

  setVote(date: Date, createVote: CreateNewVoteDTO) {
    const { latitude, longitude, start, end } = createVote;

    const userVoteData: IParticipation = {
      userId: this.token.id,
      latitude,
      longitude,
      start,
      end,
    };

    this.Vote2Repository.setVote(date, userVoteData);
  }

  getRandomLatLonInSuwon() {
    // 대략 수원시 중심부 근처 위경도 범위
    const minLat = 37.23;
    const maxLat = 37.33;
    const minLon = 127.0;
    const maxLon = 127.1;

    const lat = Math.random() * (maxLat - minLat) + minLat;
    const lon = Math.random() * (maxLon - minLon) + minLon;

    return { lat, lon };
  }

  //클러스터링 알고리즘
  DBSCANClustering(
    coords: coordType[],
    eps: number,
  ): { clusters: number[][]; noise: number[] } {
    const DBSCAN = new clustering.DBSCAN();

    const data = coords.map(({ lat, lon }: any) => [lat, lon]);

    const minPts = 3; // 한 지점 근처에 최소 3개 이상 모여야 클러스터로 인정

    const clusters = DBSCAN.run(data, eps, minPts);

    return {
      clusters,
      noise: DBSCAN.noise,
    };
  }

  findLongestArrayLength(arrays) {
    // 각 배열의 길이를 계산한 후, 가장 큰 길이를 반환
    return Math.max(...arrays.map((array) => array.length));
  }

  transformArray(a: number[][], b: IParticipation[]): IParticipation[][] {
    return a.map((subArray) => subArray.map((index) => b[index]));
  }

  //위경도 거리 계산
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (단위: km)
    const toRad = Math.PI / 180; // 각도를 라디안으로 변환하는 상수

    // 위도와 경도를 라디안 단위로 변환
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;

    const radLat1 = lat1 * toRad;
    const radLat2 = lat2 * toRad;

    // 해버사인 공식
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 거리 반환 (단위: km)
  }

  async calcMemberList(formedClusters: IParticipation[][], places: IPlace[]) {
    const voteResults: IResult[] = [];

    formedClusters.forEach((cluster, i) => {
      let centerLat = 0;
      let centerLon = 0;

      cluster.forEach((data) => {
        centerLat += parseFloat(data.latitude);
        centerLon += parseFloat(data.longitude);
      });

      centerLat /= cluster.length;
      centerLon /= cluster.length;

      let minDist = Infinity; // 가장 작은 거리를 저장
      let closestPlaceIndex = -1; // 가장 가까운 장소의 인덱스를 저장

      places.forEach((place, j) => {
        const placeLat = place.latitude;
        const placeLon = place.longitude;

        const dist = this.haversineDistance(
          centerLat,
          centerLon,
          placeLat,
          placeLon,
        );

        if (dist < minDist) {
          minDist = dist; // 최소 거리 갱신
          closestPlaceIndex = j; // 최소 거리 장소의 인덱스 저장
        }
      });

      const memberList = cluster.map(
        (clusterData) => clusterData.userId as string,
      );

      const voteResult: IResult = {
        placeId: places[closestPlaceIndex]._id,
        members: memberList,
      };

      voteResults.push(voteResult);
    });

    return voteResults;
  }

  async setResult(date: Date) {
    const participations: IParticipation[] =
      await this.Vote2Repository.findParticipationsByDate(date);

    const coords: coordType[] = participations.map((loc) => {
      return {
        lat: parseFloat(loc.latitude),
        lon: parseFloat(loc.longitude),
      };
    });

    // const coords: coordType[] = [];
    // for (let i = 0; i < 100; i++) {
    //   coords.push(this.getRandomLatLonInSuwon());
    // }

    let eps = 0.01;
    const maxMember = 8;

    let { clusters, noise } = this.DBSCANClustering(coords, eps);

    //클러스터 결과 8명이 넘는 클러스터가 있을 경우, 더 작게 더 분해.
    while (this.findLongestArrayLength(clusters) > maxMember) {
      clusters.forEach((cluster: number[], i) => {
        if (cluster.length <= 8) return;
        const newCoords = coords.filter((coord, j) => cluster.includes(j));

        let { clusters: newClusters, noise: newNoise } = this.DBSCANClustering(
          newCoords,
          (eps /= 2),
        );

        clusters.splice(i, 1, ...newClusters);
      });
    }

    //cluster결과(인덱스)를 실제 데이터로 치환
    const formedClusters = this.transformArray(clusters, participations);

    const places: IPlace[] = await this.PlaceRepository.findByStatus('active');

    //클러스터링 결과 계산
    const voteResults = await this.calcMemberList(formedClusters, places);

    await this.Vote2Repository.setVoteResult(date, voteResults);
  }
}
