export const CONST = {
  SCORE: {
    //일일 출석 체크
    DAILY_ATTEND: 2,
    //번개 모임 개설
    CREATE_GATHER: 10,
    //번개 모임 참여
    PARTICIPATE_GATHER: 5,
    //번개 모임 참여 취소
    CANCEL_GATHER: -5,
    //번개 모임 삭제
    REMOVE_GATHER: -10,
    //스터디 출석
    ATTEND_STUDY: 5,
    //개인 스터디 출석
    ATTEND_PRIVATE_STUDY: 2,
  },

  POINT: {
    PARTICIPATE_GATHER: -2000,
    STUDY_ALL_RESULT: 100,
    STUDY_ATTEND_BEFORE: () => getLowBiasedRandom(100, 1000),
    STUDY_ATTEND_AFTER: () => getLowBiasedRandom(30, 500),
    REALTIME_ATTEND_SOLO: () => getLowBiasedRandom(30, 500),
    REALTIME_ATTEND_BEFORE: () => getLowBiasedRandom(20, 500),
    // 지각 벌금. 예정 시작 시각으로부터 1시간까지는 무료, 그 뒤 1시간마다 100P씩.
    // 출석 지각과 "시작 시각이 지난 뒤 시작을 더 뒤로 미루는 변경"에 같은 기준으로 적용한다
    // (시간만 미루고 출석하면 지각을 회피할 수 있었다).
    LATE_HOURLY: -100,
    LATE_MAX: -1000,
    // realtime(직접 개설/참여) 당일 불참
    ABSENCE: -500,
    // 자동 매칭 당일 불참: 결과 확정(09:00) 시점 1,000P에서 시작해
    // 1시간이 지날 때마다 100P씩 늘고 2,000P에서 멈춘다.
    STUDY_ABSENCE_BASE: -1000,
    STUDY_ABSENCE_HOURLY: -100,
    STUDY_ABSENCE_MAX: -2000,
    // 무단 불참(신고 없이 미출석). 다음 날 01:10 배치가 부과한다.
    ABSENCE_FEE: -2000,
    REALTIME_OPEN: 100,
    // 모임장이 불참 인원을 체크할 때 부과하는 패널티
    GATHER_ABSENCE_NORMAL: -1000, // 모임 1~2일 전 불참
    GATHER_ABSENCE_NOSHOW: -3000, // 모임 당일 노쇼
    GATHER_ABSENCE_NOMANNER: -5000, // 연락 없이 당일 불참
  },
};

export const getLowBiasedRandom = (min: number, max: number) => {
  const biasStrength = 10;
  const u = Math.random();
  const v = Math.pow(u, biasStrength);
  return Math.floor(min + (max - min) * v);
};

/** 지각 벌금이 붙기 시작하는 시점(분). 이 시간 이내는 무료. */
const LATE_GRACE_MINUTES = 60;

/**
 * 지각 벌금(음수). 1시간까지는 무료, 그 뒤 1시간마다 100P씩 늘고 1,000P에서 멈춘다.
 *
 * - 0~59분 → 0
 * - 60~119분 → −100P
 * - 120~179분 → −200P
 * - 10시간 이상 → −1,000P (상한)
 */
export const getLatePenalty = (minutesLate: number): number => {
  if (!minutesLate || minutesLate < LATE_GRACE_MINUTES) return 0;

  const hours = Math.floor(minutesLate / 60);

  return Math.max(CONST.POINT.LATE_MAX, hours * CONST.POINT.LATE_HOURLY);
};
