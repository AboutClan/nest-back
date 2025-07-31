export const ENTITY = {
  ANNOUNCEMENT: {
    ENUM_TYPE: ['main', 'sub', 'event', 'update'] as const,
  },

  COLLECTION: {
    ENUM_ALPHABET: ['A', 'B', 'O', 'U', 'T'] as const,
  },

  GATHER: {
    ENUM_STATUS: ['pending', 'open', 'close', 'end'] as const,
    DEFAULT_STATUS: 'pending' as const,
    ENUM_PART_PHASE: ['all', 'first', 'second'] as const,
    ENUM_CATEGORY_TYPE: ['gather', 'event', 'group', 'official'] as const,
    DEFAULT_CATEGORY_TYPE: 'gather' as const,
  },

  GROUPSTUDY: {
    ENUM_USER_ROLE: [
      'admin',
      'member',
      'manager',
      'human',
      'outsider',
    ] as const,
    ENUM_STATUS: [
      'pending',
      'open',
      'close',
      'end',
      'gathering',
      'study',
      'resting',
    ] as const,
    DEFAULT_STATUS: 'pending' as const,
    ENUM_MEETING_TYPE: ['online', 'offline', 'hybrid'] as const,
  },

  LOG: {
    ENUM_META: ['score', 'point', 'deposit'] as const,
  },

  NOTICE: {
    ENUM_TYPE: ['like', 'friend', 'alphabet', 'temperature'] as const,
    DEFAULT_TYPE: 'like' as const,
    ENUM_STATUS: ['pending', 'refusal', 'approval', 'response'] as const,
  },

  PLACE: {
    ENUM_STATUS: ['active', 'inactive', 'pending'] as const,
    DEFAULT_STATUS: 'active' as const,
  },

  REALTIME: {
    ENUM_STATUS: ['pending', 'solo', 'open', 'free', 'cancel'] as const,
    DEFAULT_STATUS: 'solo' as const,
  },

  REQUEST: {
    ENUM_CATEGORY: [
      '건의',
      '신고',
      '홍보',
      '휴식',
      '충전',
      '지원금',
      '탈퇴',
      '출석',
      '배지',
      '불참',
      '조모임',
      '장소 추가',
      '출금',
      '인스타',
    ],
    ENUM_REST: ['일반', '특별'] as const,
  },

  SQUARE: {
    ENUM_CATEGORY: [
      '일상',
      '고민',
      '정보',
      '같이해요',
      '질문',
      '기타',
      '팀원 모집',
      '홍보',
      '기타2',
    ] as const,
    ENUM_TYPE: ['general', 'poll', 'poll2', 'info', 'secret'] as const,
  },

  USER: {
    C_MINI_USER: `_id profileImage avatar ` as const,
    C_SIMPLE_USER:
      ` _id name profileImage uid avatar comment birth badge temperature ` as const,

    DEFAULT_GATHER_TICKET: 2 as const,
    DEFAULT_GROUPSTUDY_TICKET: 4 as const,

    ENUM_LOCATION: [
      '수원',
      '양천',
      '안양',
      '강남',
      '동대문',
      '인천',
      '마포',
      '성남',
      '성동',
      '고양',
      '중구',
      '송파',
      '구로',
      '동작',
      '강북',
      '부천',
      '시흥',
      '전체',
      '기타',
    ] as const,
    DEFAULT_LOCATION: '수원' as const,

    DEAFULT_IMAGE:
      'https://user-images.githubusercontent.com/48513798/173180642-8fc5948e-a437-45f3-91d0-3f0098a38195.png',

    ENUM_ROLE: [
      'noMember',
      'waiting',
      'human',
      'member',
      'manager',
      'previliged',
      'resting',
      'enthusiastic',
      'block',
    ] as const,
    DEFAULT_ROLE: 'member' as const,

    RANK_BRONZE: 'bronze' as const,
    RANK_SILVER: 'silver' as const,
    RANK_GOLD: 'gold' as const,
    ENUM_RANK: ['bronze', 'silver', 'gold'] as const,

    DEFAULT_RANK: 'bronze' as const,

    DEFAULT_COMMENT: '안녕하세요! 잘 부탁드립니다~!' as const,
    DEFAULT_DEPOSIT: 3000 as const,
    DEAFULT_TEMPERATURE: 36.5 as const,
  },
};
