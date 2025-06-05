export const WEBPUSH_MSG = {
  TEST: '테스트 푸시입니다.',

  BASE: {
    TITLE: '스터디 알림',
    DESC: '스터디 마감이 얼마 남지 않았어요. 지금 신청하세요!',
    NEW_USER: '새로운 사용자가 가입했어요!',
    CHECK_APP: '앱을 확인해보세요.',
  },

  CHAT: {
    ARRIVE: (sender) => `${sender}님에게 쪽지가 도착했어요!`,
  },

  FEED: {
    CREATE: '새로운 피드가 올라왔어요!',
    COMMENT_TITLE: '피드에 새로운 댓글이 달렸어요!',
    COMMENT_DESC: '',
  },

  GATHER: {
    TITLE: `번개 모임`,
    PARTICIPATE: (user, date) => `${user}님이 ${date} 모임에 합류했습니다.`,
    INVITE: (date) => `${date} 모임에 초대되었어요!`,
    REQUEST: (user, date) => `${user}님이 ${date} 모임 참여를 요청했어요!`,
    ACCEPT: (date) => `${date} 모임 참여가 승인되었습니다.`,
    COMMENT_CREATE: (name, date) =>
      `${name}님이 ${date} 모임에 댓글을 남겼어요!`,
  },

  GROUPSTUDY: {
    TITLE: '소모임',
    PARTICIPATE: (user, name) => `${user}님이 [${name}] 소모임에 합류했습니다.`,
    REQUEST: (user, name) => `${user}님이 [${name}] 소모임 가입을 요청했어요!`,
    AGREE: (name) => `[${name}] 소모임 가입이 승인되었습니다.`,
    COMMENT_CREATE: (name) => `[${name}]에 새로운 리뷰가 달렸어요!`,
  },

  NOTICE: {
    LIKE_TITLE: '',
    LIKE_RECIEVE: (user, name) => `누군가에게 좋아요를 받았어요!`,

    FRIEND_TITLE: '친구 요청',
    FRIEND_RECIEVE: (user) => `${user}님이 친구 요청을 보냈어요!`,
  },

  VOTE: {
    SUCCESS_TITLE: '스터디 매칭 성공',
    SUCCESS_DESC: '스터디 매칭 결과를 확인하세요!',
    FAILURE_TITLE: '스터디 매칭 실패',
    FAILURE_DESC: '다음에 또 신청해 주세요!',
  },

  SQUARE: {
    TITLE: '커뮤니티',
    COMMENT_CREATE: (name) => `누군가 댓글을 남겼어요!`,
  },
};
