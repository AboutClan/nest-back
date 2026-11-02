// ---- 외부 의존성(Mongo logger, firebase, S3, 다른 서비스) 차단 ----
jest.mock('src/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('src/MSA/Notice/core/services/notice.service', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('src/MSA/Notification/core/services/fcm.service', () => ({
  FcmService: class {},
}));
jest.mock('src/MSA/Place/core/services/place.service', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('src/routes/imagez/image.service', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('src/utils/oAuthUtils', () => ({ getProfile: jest.fn() }));
// prize.service는 user.service와 순환 참조라 통째로 대체한다.
// STUDY_BADGE_PRIZE_START_MONTH는 실제 값(prize.service.ts)과 맞춰 둘 것.
jest.mock('src/MSA/Store/core/services/prize.service', () => ({
  PrizeService: class {},
  STUDY_BADGE_PRIZE_START_MONTH: '2026-11',
}));

import { AppError } from 'src/errors/AppError';
import { RequestContext } from 'src/request-context';
import { User } from '../domain/User/User';
import { Ticket } from '../domain/User/Ticket';
import { UserService } from './user.service';

const makeUser = (fields: Partial<User> = {}) => {
  const user = new User();
  Object.assign(user, { uid: 'u-1', ...fields });
  return user;
};

/** RequestContext에 토큰을 넣고 실행 (전역 미들웨어 흉내) */
const runAs = <T>(token: any, fn: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    RequestContext.run({ request: { decodedToken: token } as any }, () => {
      fn().then(resolve, reject);
    });
  });

function createService() {
  const UserRepository = {
    findByUid: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    incrementPointByUid: jest.fn().mockResolvedValue(undefined),
    findUsersWithNegativeGroupStudyTicket: jest.fn(),
    resetPointByMonthScore: jest.fn().mockResolvedValue([]),
    processMonthScore: jest.fn().mockResolvedValue(undefined),
    resetMonthScore: jest.fn().mockResolvedValue(undefined),
    resetMonthStudyRecord: jest.fn().mockResolvedValue(undefined),
    resetStudyBadge: jest.fn().mockResolvedValue(undefined),
  };
  const LogTemperatureRepository = { findTemperatureByPeriod: jest.fn() };
  const prizeService = {
    processMonthPrize: jest.fn().mockResolvedValue(undefined),
    processStudyBadgePrize: jest.fn().mockResolvedValue(undefined),
  };
  const service = new UserService(
    UserRepository as any,
    {} as any, // LogMembershipRepository
    LogTemperatureRepository as any,
    {} as any, // noticeService
    {} as any, // placeService
    {} as any, // imageService
    {} as any, // fcmService
    prizeService as any,
  );
  return { service, UserRepository, LogTemperatureRepository, prizeService };
}

// ---------------------------------------------------------------------------
describe('UserService.updateUser 닉네임 검증', () => {
  const token = { uid: 'u-1' };
  const setup = (currentNickname: string, allNicknames: string[]) => {
    const { service, UserRepository } = createService();
    UserRepository.findByUid.mockResolvedValue(
      makeUser({ nickname: currentNickname }),
    );
    Object.assign(UserRepository, {
      findAllNicknames: jest.fn().mockResolvedValue(allNicknames),
      updateUser: jest.fn().mockResolvedValue({}),
    });
    return { service, UserRepository: UserRepository as any };
  };

  it('앞뒤 공백을 지우고 저장한다', async () => {
    const { service, UserRepository } = setup('졸린수달', ['졸린수달']);
    await runAs(token, () => service.updateUser({ nickname: ' 새닉 ' }));
    expect(UserRepository.updateUser).toHaveBeenCalledWith('u-1', {
      nickname: '새닉',
    });
  });

  it('다른 회원이 쓰는 닉네임은 거절한다', async () => {
    const { service, UserRepository } = setup('졸린수달', ['졸린수달', '말랑두부']);
    await expect(
      runAs(token, () => service.updateUser({ nickname: '말랑두부' })),
    ).rejects.toThrow('이미 사용 중인 닉네임입니다.');
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it('6글자를 넘으면 거절한다', async () => {
    const { service } = setup('졸린수달', []);
    await expect(
      runAs(token, () => service.updateUser({ nickname: '일곱글자닉네임' })),
    ).rejects.toThrow('6글자');
  });

  it('지금 닉네임 그대로면 6글자를 넘어도(숫자 붙은 기본 닉네임) 통과한다', async () => {
    const { service, UserRepository } = setup('산책하는버섯37', ['산책하는버섯37']);
    await runAs(token, () => service.updateUser({ nickname: '산책하는버섯37' }));
    expect(UserRepository.updateUser).toHaveBeenCalled();
  });

  it('빈 닉네임은 거절한다', async () => {
    const { service } = setup('졸린수달', []);
    await expect(
      runAs(token, () => service.updateUser({ nickname: '  ' })),
    ).rejects.toThrow('닉네임을 입력해주세요.');
  });

  it('닉네임 없이 다른 필드만 바꾸면 검사하지 않는다', async () => {
    const { service, UserRepository } = setup('졸린수달', []);
    await runAs(token, () => service.updateUser({ comment: 'hi' } as any));
    expect(UserRepository.findAllNicknames).not.toHaveBeenCalled();
    expect(UserRepository.updateUser).toHaveBeenCalledWith('u-1', { comment: 'hi' });
  });
});

describe('User 도메인 (포인트 / 참여권 / 매너온도)', () => {
  it('포인트 차감은 0 미만으로 내려가지 않는다', () => {
    const user = makeUser({ point: 1000 });
    user.increasePoint(-3000);
    expect(user.point).toBe(0);
  });

  it('포인트 적립은 그대로 더해진다', () => {
    const user = makeUser({ point: 1000 });
    user.increasePoint(500);
    expect(user.point).toBe(1500);
  });

  it('참여권 기본값: 번개 2 / 소모임 4', () => {
    expect(new Ticket().toPrimitives()).toEqual({
      gatherTicket: 2,
      groupStudyTicket: 4,
    });
  });

  it('0개 참여권은 기본값으로 덮어쓰지 않는다 (?? 사용)', () => {
    expect(new Ticket(0, 0).toPrimitives()).toEqual({
      gatherTicket: 0,
      groupStudyTicket: 0,
    });
  });

  it('setTemperature는 기본 36.5에 변화량을 더해 저장한다', () => {
    const user = makeUser();
    user.setTemperature(1.2, 10, 5, 0);
    expect(user.temperature).toMatchObject({
      temperature: 37.7,
      sum: 10,
      cnt: 5,
      blockCnt: 0,
    });
  });
});

// ---------------------------------------------------------------------------
describe('UserService.updatePoint (포인트 적립/차감)', () => {
  it('일반 멤버십은 요청한 포인트 그대로 반영', async () => {
    const { service, UserRepository } = createService();
    UserRepository.findByUid.mockResolvedValue(makeUser({ membership: 'normal' }));

    await service.updatePoint(105, '스터디 출석', 'study', 'u-1');

    expect(UserRepository.incrementPointByUid).toHaveBeenCalledWith('u-1', 105);
  });

  it.each(['newbie', 'manager', 'studySupporters'] as const)(
    '%s 멤버십 + study 적립은 +20% (내림)',
    async (membership) => {
      const { service, UserRepository } = createService();
      UserRepository.findByUid.mockResolvedValue(makeUser({ membership }));

      await service.updatePoint(105, '스터디 출석', 'study', 'u-1');

      expect(UserRepository.incrementPointByUid).toHaveBeenCalledWith(
        'u-1',
        126, // floor(105 * 1.2)
      );
    },
  );

  it('study가 아닌 적립(예: 포인트 충전)은 newbie여도 보너스 없음', async () => {
    const { service, UserRepository } = createService();
    UserRepository.findByUid.mockResolvedValue(makeUser({ membership: 'newbie' }));

    await service.updatePoint(5000, '포인트 충전', 'point', 'u-1');

    expect(UserRepository.incrementPointByUid).toHaveBeenCalledWith('u-1', 5000);
  });

  it('토큰 없는 서버-투-서버(webhook) 호출도 uid를 넘기면 동작한다', async () => {
    const { service, UserRepository } = createService();
    UserRepository.findByUid.mockResolvedValue(makeUser());

    // RequestContext 밖에서 실행 → getDecodedToken() === undefined
    await expect(
      service.updatePoint(3000, '추천인 보상', 'referral', 'friend-1'),
    ).resolves.toBeUndefined();
    expect(UserRepository.findByUid).toHaveBeenCalledWith('friend-1');
    expect(UserRepository.incrementPointByUid).toHaveBeenCalledWith(
      'friend-1',
      3000,
    );
  });

  it('uid를 생략하면 토큰의 uid에 반영한다', async () => {
    const { service, UserRepository } = createService();
    UserRepository.findByUid.mockResolvedValue(makeUser());

    await runAs({ uid: 'me', id: 'me-id' }, () =>
      service.updatePoint(100, '테스트'),
    );

    expect(UserRepository.incrementPointByUid).toHaveBeenCalledWith('me', 100);
  });
});

// ---------------------------------------------------------------------------
describe('UserService 참여권(ticket)', () => {
  it.each([
    ['gather', undefined, { gatherTicket: 3, groupStudyTicket: 4 }],
    ['gather', 2, { gatherTicket: 4, groupStudyTicket: 4 }],
    ['groupStudy', undefined, { gatherTicket: 2, groupStudyTicket: 5 }],
    ['groupOnline', undefined, { gatherTicket: 2, groupStudyTicket: 5 }],
    ['groupOffline', undefined, { gatherTicket: 2, groupStudyTicket: 6 }],
  ] as const)(
    'updateAddTicket(%s, ticketNum=%p) → %o',
    async (type, ticketNum, expected) => {
      const { service, UserRepository } = createService();
      const user = makeUser({ ticket: new Ticket(2, 4) });
      UserRepository.findByUserId.mockResolvedValue(user);

      await service.updateAddTicket(type, 'user-id', ticketNum, 'return');

      expect(UserRepository.save).toHaveBeenCalledWith(user);
      expect(user.ticket.toPrimitives()).toEqual(expected);
    },
  );

  it('월간 정산: 음수 소모임 참여권은 1장당 1000P로 차감하고 0으로 맞춘다', async () => {
    const { service, UserRepository } = createService();
    const user = makeUser({ point: 5000, ticket: new Ticket(2, -3) });
    UserRepository.findUsersWithNegativeGroupStudyTicket.mockResolvedValue([user]);

    await service.penalizeNegativeGroupStudyTicket();

    expect(user.point).toBe(2000);
    expect(user.ticket.groupStudyTicket).toBe(0);
    expect(UserRepository.save).toHaveBeenCalledWith(user);
  });

  it('월간 정산: 차감액이 보유 포인트보다 크면 포인트는 0에서 멈춘다', async () => {
    const { service, UserRepository } = createService();
    const user = makeUser({ point: 1000, ticket: new Ticket(2, -3) });
    UserRepository.findUsersWithNegativeGroupStudyTicket.mockResolvedValue([user]);

    await service.penalizeNegativeGroupStudyTicket();

    expect(user.point).toBe(0);
    expect(user.ticket.groupStudyTicket).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('UserService 매너온도 계산', () => {
  describe('calculateScore (평균 점수 × 신뢰도 보정)', () => {
    // 공식이 바뀌면 이 회귀 기준값도 의도적으로 갱신해야 한다.
    it.each([
      [4.8, 1, 0.3],
      [5.5, 1, 0.4],
      [48, 10, 4.3],
      [-20, 10, -1.8],
      [100, 30, 6.2],
    ])('calculateScore(%p, %p) = %p', (sum, cnt, expected) => {
      const { service } = createService();
      expect(service.calculateScore(sum, cnt)).toBe(expected);
    });

    it('평균이 같아도 평가 수가 많을수록 변화량이 크다(적은 표본 감쇠)', () => {
      const { service } = createService();
      const few = service.calculateScore(5, 1);
      const many = service.calculateScore(50, 10);
      expect(many).toBeGreaterThan(few);
    });
  });

  describe('processTemperatureReset (매월 1일 매너온도 재계산 배치)', () => {
    const log = (from: string, to: string, sub: string, day: number) => ({
      from,
      to,
      sub,
      timestamp: new Date(2026, 8, day),
    });

    it('자기평가 제외 · 같은 평가자는 최근 3건만(1.0/0.5/0.3) · 평가자 역할 가중치 반영', async () => {
      const { service, UserRepository, LogTemperatureRepository } =
        createService();
      const target = makeUser({ uid: 'target' });
      const roles: Record<string, string> = {
        A: 'member',
        P: 'previliged', // 가중치 4
        target: 'member',
      };
      UserRepository.findByUid.mockImplementation(async (uid: string) =>
        uid === 'target' ? target : makeUser({ uid, role: roles[uid] }),
      );
      LogTemperatureRepository.findTemperatureByPeriod.mockResolvedValue([
        log('A', 'target', 'block', 1), // 4번째로 오래됨 → 제외
        log('A', 'target', 'soso', 2), // ×0.3
        log('A', 'target', 'good', 3), // ×0.5
        log('A', 'target', 'great', 4), // ×1.0
        log('P', 'target', 'good', 5), // ×1.0 ×4
        log('target', 'target', 'great', 6), // 자기평가 → 무시
      ]);

      await service.processTemperatureReset();

      // sum = 5.5 + 0.4 - 0.54 + 3.2 = 8.56, cnt = 1 + 0.5 + 0.3 + 4 = 5.8
      expect(UserRepository.save).toHaveBeenCalledTimes(1);
      expect(target.temperature.sum).toBeCloseTo(8.56, 6);
      expect(target.temperature.cnt).toBeCloseTo(5.8, 6);
      expect(target.temperature.blockCnt).toBe(0);
      expect(target.temperature.temperature).toBeCloseTo(37.3, 6);
    });

    it('차단(block)은 누적될수록 더 크게 감점된다 (-6.5, -13, ...)', async () => {
      const { service, UserRepository, LogTemperatureRepository } =
        createService();
      const target = makeUser({ uid: 'target' });
      UserRepository.findByUid.mockImplementation(async (uid: string) =>
        uid === 'target' ? target : makeUser({ uid, role: 'member' }),
      );
      LogTemperatureRepository.findTemperatureByPeriod.mockResolvedValue([
        log('A', 'target', 'block', 1),
        log('B', 'target', 'block', 2),
      ]);

      await service.processTemperatureReset();

      expect(target.temperature.sum).toBeCloseTo(-19.5, 6);
      expect(target.temperature.blockCnt).toBe(2);
      expect(target.temperature.temperature).toBeCloseTo(35, 6);
    });

    it('평가받은 유저가 없어졌으면 건너뛴다', async () => {
      const { service, UserRepository, LogTemperatureRepository } =
        createService();
      UserRepository.findByUid.mockImplementation(async (uid: string) =>
        uid === 'A' ? makeUser({ uid, role: 'member' }) : null,
      );
      LogTemperatureRepository.findTemperatureByPeriod.mockResolvedValue([
        log('A', 'gone', 'great', 1),
      ]);

      await service.processTemperatureReset();

      expect(UserRepository.save).not.toHaveBeenCalled();
    });

    /**
     * [의심 버그] aggregateLogTemperatureDeltasByToReset 는 평가자(from)를 findByUid 로
     * 조회한 뒤 null 체크 없이 `user.role` 에 접근한다. 평가를 남긴 유저가 탈퇴·삭제되어
     * 조회되지 않으면 TypeError 로 월간 배치 전체가 중단된다(나머지 유저 온도 미반영).
     * 기대 동작: 해당 평가를 건너뛰거나 기본 가중치(1)로 계산하고 배치는 계속 진행.
     */
    it.skip('[의심 버그] 평가자가 삭제된 유저여도 배치가 중단되지 않아야 한다', async () => {
      const { service, UserRepository, LogTemperatureRepository } =
        createService();
      const target = makeUser({ uid: 'target' });
      UserRepository.findByUid.mockImplementation(async (uid: string) =>
        uid === 'target' ? target : null, // 평가자 'deleted' 는 조회 불가
      );
      LogTemperatureRepository.findTemperatureByPeriod.mockResolvedValue([
        log('deleted', 'target', 'great', 1),
      ]);

      await expect(service.processTemperatureReset()).resolves.toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
describe('UserService.processMonthScore (매월 1일 0시 정산 배치)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  const callOrder = (mocks: Record<string, jest.Mock>) =>
    Object.entries(mocks)
      .filter(([, m]) => m.mock.invocationCallOrder.length > 0)
      .sort(
        ([, a], [, b]) =>
          a.mock.invocationCallOrder[0] - b.mock.invocationCallOrder[0],
      )
      .map(([name]) => name);

  it('스탬프 랭킹 정산은 반드시 스탬프 초기화 전에 실행된다 (2026-11 이후)', async () => {
    jest.useFakeTimers({ now: new Date(2026, 11, 1, 0, 0, 5) }); // 로컬 2026-12-01
    const { service, UserRepository, prizeService } = createService();

    await service.processMonthScore();

    expect(
      callOrder({
        resetPointByMonthScore: UserRepository.resetPointByMonthScore,
        processMonthScore: UserRepository.processMonthScore,
        processMonthPrize: prizeService.processMonthPrize,
        processStudyBadgePrize: prizeService.processStudyBadgePrize,
        resetMonthScore: UserRepository.resetMonthScore,
        resetMonthStudyRecord: UserRepository.resetMonthStudyRecord,
        resetStudyBadge: UserRepository.resetStudyBadge,
      }),
    ).toEqual([
      'resetPointByMonthScore',
      'processMonthScore',
      'processMonthPrize',
      'processStudyBadgePrize',
      'resetMonthScore',
      'resetMonthStudyRecord',
      'resetStudyBadge',
    ]);
  });

  it('첫 달(2026-10-01)에는 스탬프 정산을 건너뛰지만 초기화는 한다', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 1, 0, 0, 5) }); // 로컬 2026-10-01
    const { service, UserRepository, prizeService } = createService();

    await service.processMonthScore();

    expect(prizeService.processStudyBadgePrize).not.toHaveBeenCalled();
    expect(UserRepository.resetStudyBadge).toHaveBeenCalledTimes(1);
  });

  it('중간 단계가 실패하면 AppError(500)로 감싸고, 이후 초기화는 실행하지 않는다', async () => {
    const { service, UserRepository, prizeService } = createService();
    prizeService.processMonthPrize.mockRejectedValue(new Error('prize fail'));

    const err = await service.processMonthScore().catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('prize fail');
    expect(UserRepository.resetMonthScore).not.toHaveBeenCalled();
    expect(UserRepository.resetStudyBadge).not.toHaveBeenCalled();
  });

  /**
   * [의심 버그] 첫 스탬프 정산 게이트가 `dayjs().format('YYYY-MM')`(서버 로컬 시간)를 쓴다.
   * 크론은 Asia/Seoul 기준 매월 1일 00:00에 돌지만 Dockerfile에 TZ 설정이 없어 서버가
   * UTC라면 그 순간 로컬 시각은 전월 말일 15:00 → 2026-11-01 실행에서 '2026-10'으로
   * 판정되어 10월분 스탬프 상품 정산이 건너뛰어지고(그 직후 resetStudyBadge로 데이터도 초기화)
   * 한 달이 통째로 누락된다. 기대: KST 기준으로 판정 (예: dayjs().tz('Asia/Seoul')).
   *
   * 테스트 안에서 process.env.TZ를 바꿔도 jest 워커에는 반영되지 않는다.
   * 재현: skip 해제 후 `TZ=UTC npx jest src/MSA/User/core/services/user.service.spec.ts -t UTC`
   * (KST 머신에서 그냥 돌리면 통과하므로 의미가 없다)
   */
  it.skip('[의심 버그] 서버 TZ가 UTC여도 2026-11-01 00:00 KST 실행에서 스탬프 정산이 돌아야 한다', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-31T15:00:05Z') }); // = 2026-11-01 00:00:05 KST
    const { service, prizeService } = createService();

    await service.processMonthScore();

    expect(prizeService.processStudyBadgePrize).toHaveBeenCalledTimes(1);
  });
});
