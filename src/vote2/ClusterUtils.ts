import clustering from 'density-clustering';
import { IParticipation, IResult } from './vote2.entity';
import { IPlace } from 'src/place/entity/place.entity';

export interface coordType {
  lat: number;
  lon: number;
}

export class ClusterUtils {
  static findLongestArrayLength(arrays) {
    // 각 배열의 길이를 계산한 후, 가장 큰 길이를 반환
    return Math.max(...arrays.map((array) => array.length));
  }

  static transformArray(
    a: number[][],
    b: IParticipation[],
  ): IParticipation[][] {
    return a.map((subArray) => subArray.map((index) => b[index]));
  }

  //클러스터링 알고리즘
  static DBSCANClustering(
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

  //위경도 거리 계산
  static haversineDistance(lat1, lon1, lat2, lon2) {
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

  static async findClosestPlace(
    formedClusters: IParticipation[][],
    places: IPlace[],
  ) {
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

      const memberList = cluster.map((clusterData) => {
        return { userId: clusterData.userId as string };
      });

      const voteResult: IResult = {
        placeId: places[closestPlaceIndex]._id,
        members: memberList,
      };

      voteResults.push(voteResult);
    });

    return voteResults;
  }
}
