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
    STUDY_ATTEND_BEFORE: () => getLowBiasedRandom(200, 1000),
    STUDY_ATTEND_AFTER: () => getLowBiasedRandom(100, 500),
    REALTIME_ATTEND_SOLO: () => getLowBiasedRandom(50, 500),
    REALTIME_ATTEND_BEFORE: () => getLowBiasedRandom(50, 500),
    LATE: -50,
    ABSENCE: -500,
    NO_SHOW: -1000,
    REALTIME_OPEN: 100,
  },
};

export const getLowBiasedRandom = (min: number, max: number) => {
  const biasStrength = 12;
  const u = Math.random();
  const v = Math.pow(u, biasStrength);
  return Math.floor(min + (max - min) * v);
};
