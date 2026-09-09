export class ClusterUtils {
  /**
   * 장소까지의 거리를 기준점 중 "가장 가까운 것"으로 잰다.
   * 기준점이 여러 개면 그중 하나만 범위에 들어도 참여 가능하다는 뜻이므로 min이 맞다.
   */
  static minDistanceToAnchors(
    anchors: { latitude: number; longitude: number }[],
    placeLat: number,
    placeLon: number,
  ): number {
    if (!anchors?.length) return Infinity;

    return Math.min(
      ...anchors.map((a) =>
        this.haversineDistance(a.latitude, a.longitude, placeLat, placeLon),
      ),
    );
  }

  //위경도 거리 계산 (단위: km)
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
}
