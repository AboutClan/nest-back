// logger는 import 시점에 MongoDB transport를 만들므로 반드시 대체한다.
jest.mock('src/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
// UserService는 firebase/S3 등 무거운 의존성을 끌고 오므로 모듈째 대체한다.
jest.mock('./user.service', () => ({ UserService: class {} }));

import { ENTITY } from 'src/Constants/ENTITY';
import { ValidationError } from 'src/errors/ValidationError';
import {
  BLOCKED_UIDS,
  CLUB_UIDS,
} from 'src/MSA/Auth/constants/auth-users.constant';
import {
  pickRandomNickname,
  RANDOM_NICKNAME_POOL,
} from '../domain/User/randomNickname';
import RegisterService from './register.service';

/** mongoose 쿼리처럼 `await` 과 `.lean()` 둘 다 되는 값 */
const q = (value: any) => ({
  lean: () => Promise.resolve(value),
  then: (res: any, rej: any) => Promise.resolve(value).then(res, rej),
});

describe('RegisterService.approve (가입 승인)', () => {
  const UID = 'new-user-1';
  const CLUB_UID = [...CLUB_UIDS][0];
  const BLOCKED_UID = [...BLOCKED_UIDS][0];

  let users: Record<string, { role: string } | null>;
  let registerRepository: { findByUid: jest.Mock; deleteByUid: jest.Mock };
  let UserModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateMany: jest.Mock;
    deleteOne: jest.Mock;
    distinct: jest.Mock;
    updateOne: jest.Mock;
  };
  let AccountModel: { deleteOne: jest.Mock };
  let userService: { updatePoint: jest.Mock };
  let service: RegisterService;

  const pendingRegister = (fields: Record<string, any> = {}) => ({
    toObject: () => ({
      _id: 'register-doc-id',
      __v: 0,
      uid: UID,
      name: '홍길동',
      role: 'waiting',
      telephone: 'encrypted',
      ...fields,
    }),
  });

  /** approve가 User 컬렉션에 $set 한 userForm */
  const savedUserForm = () => UserModel.findOneAndUpdate.mock.calls[0][1].$set;

  beforeEach(() => {
    users = {};
    registerRepository = {
      findByUid: jest.fn().mockResolvedValue(pendingRegister()),
      deleteByUid: jest.fn().mockResolvedValue(undefined),
    };
    UserModel = {
      findOne: jest.fn((filter: { uid: string }) => q(users[filter.uid] ?? null)),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({}),
      distinct: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    AccountModel = { deleteOne: jest.fn().mockResolvedValue({}) };
    userService = { updatePoint: jest.fn().mockResolvedValue(undefined) };
    service = new RegisterService(
      registerRepository as any,
      UserModel as any,
      AccountModel as any,
      userService as any,
    );
  });

  it('추천인 없이 승인 → member / 보증금 5000P / 기본 참여권 / newbie, 대기 문서 삭제', async () => {
    await service.approve(UID);

    expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: UID },
      expect.anything(),
      expect.objectContaining({ upsert: true }),
    );
    const form = savedUserForm();
    expect(form).toMatchObject({
      uid: UID,
      name: '홍길동',
      role: 'member',
      isActive: true,
      point: 5000,
      membership: 'newbie',
      ticket: {
        gatherTicket: ENTITY.USER.DEFAULT_GATHER_TICKET,
        groupStudyTicket: ENTITY.USER.DEFAULT_GROUPSTUDY_TICKET,
      },
    });
    // 대기 문서의 _id / __v 가 User 문서로 새어 들어가면 안 된다
    expect(form).not.toHaveProperty('_id');
    expect(form).not.toHaveProperty('__v');

    expect(registerRepository.deleteByUid).toHaveBeenCalledWith(UID);
    // 승인(approve=true) 경로에서는 User/Account를 지우지 않는다
    expect(UserModel.deleteOne).not.toHaveBeenCalled();
    expect(AccountModel.deleteOne).not.toHaveBeenCalled();
    expect(userService.updatePoint).not.toHaveBeenCalled();
  });

  it('동아리 관계자(CLUB_UIDS) 추천 → 가입비 면제이므로 보증금 3000P, 추천인 보상 없음', async () => {
    await service.approve(UID, CLUB_UID);

    expect(savedUserForm().point).toBe(3000);
    expect(userService.updatePoint).not.toHaveBeenCalled();
  });

  it.each(['manager', 'previliged'])(
    '운영진(%s) 추천 → 보증금 3000P, 추천인 보상 없음',
    async (role) => {
      users['admin-1'] = { role };

      await service.approve(UID, 'admin-1');

      expect(savedUserForm().point).toBe(3000);
      expect(userService.updatePoint).not.toHaveBeenCalled();
    },
  );

  it('일반 회원 추천 → 신규 회원 5000P + 추천인에게 3000P 보상', async () => {
    users['friend-1'] = { role: 'member' };

    await service.approve(UID, 'friend-1');

    expect(savedUserForm().point).toBe(5000);
    expect(userService.updatePoint).toHaveBeenCalledTimes(1);
    expect(userService.updatePoint).toHaveBeenCalledWith(
      3000,
      '추천인 보상',
      'referral',
      'friend-1',
    );
  });

  it('존재하지 않는 추천인 → 5000P 승인, 보상 없음', async () => {
    await service.approve(UID, 'ghost');

    expect(savedUserForm().point).toBe(5000);
    expect(userService.updatePoint).not.toHaveBeenCalled();
  });

  it('추천인 보상 지급이 일시 실패하면 최대 3회까지 재시도한다', async () => {
    users['friend-1'] = { role: 'member' };
    userService.updatePoint
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce(undefined);

    await expect(service.approve(UID, 'friend-1')).resolves.toBeUndefined();
    expect(userService.updatePoint).toHaveBeenCalledTimes(3);
  });

  it('추천인 보상이 3회 모두 실패해도 가입 승인 자체는 성공한다', async () => {
    users['friend-1'] = { role: 'member' };
    userService.updatePoint.mockRejectedValue(new Error('down'));

    await expect(service.approve(UID, 'friend-1')).resolves.toBeUndefined();
    expect(userService.updatePoint).toHaveBeenCalledTimes(3);
    expect(registerRepository.deleteByUid).toHaveBeenCalledWith(UID);
  });

  describe('멱등성 (webhook / return / 클라이언트 중복 호출)', () => {
    it('대기 문서가 없고 이미 member라면 에러 없이 no-op', async () => {
      registerRepository.findByUid.mockResolvedValue(null);
      users[UID] = { role: 'member' };

      await expect(service.approve(UID, 'friend-1')).resolves.toBeUndefined();

      expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(registerRepository.deleteByUid).not.toHaveBeenCalled();
      // 재호출로 추천인 보상이 중복 지급되면 안 된다
      expect(userService.updatePoint).not.toHaveBeenCalled();
    });

    it.each(['waiting', 'newUser', 'noMember'])(
      '대기 문서가 없고 role=%s(미승인)이면 wrong uid',
      async (role) => {
        registerRepository.findByUid.mockResolvedValue(null);
        users[UID] = { role };

        await expect(service.approve(UID)).rejects.toBeInstanceOf(
          ValidationError,
        );
        expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );

    it('대기 문서도 User도 없으면 wrong uid', async () => {
      registerRepository.findByUid.mockResolvedValue(null);

      await expect(service.approve(UID)).rejects.toThrow('wrong uid');
    });
  });

  it('차단된(게스트) uid는 승인하지 않는다', async () => {
    await expect(service.approve(BLOCKED_UID)).rejects.toThrow('wrong uid');
    expect(registerRepository.findByUid).not.toHaveBeenCalled();
    expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('User 저장이 실패하면 대기 문서를 지우지 않는다(재시도 가능해야 함)', async () => {
    UserModel.findOneAndUpdate.mockRejectedValue(new Error('db down'));

    await expect(service.approve(UID)).rejects.toThrow();
    expect(registerRepository.deleteByUid).not.toHaveBeenCalled();
  });

  describe('닉네임 부여', () => {
    it('닉네임이 없으면 이미 쓰이는 것과 겹치지 않는 기본 닉네임을 붙인다', async () => {
      users[UID] = { role: 'member' };
      const taken = RANDOM_NICKNAME_POOL.slice(1);
      UserModel.distinct.mockResolvedValue(taken);

      await service.approve(UID);

      expect(UserModel.updateOne).toHaveBeenCalledWith(
        { uid: UID, nickname: { $in: [null, ''] } },
        { $set: { nickname: RANDOM_NICKNAME_POOL[0] } },
      );
    });

    it('이미 닉네임이 있으면 그대로 둔다', async () => {
      users[UID] = { role: 'member', nickname: '내닉네임' } as any;

      await service.approve(UID);

      expect(UserModel.updateOne).not.toHaveBeenCalled();
    });

    it('닉네임 부여가 실패해도 가입 승인은 끝까지 진행된다', async () => {
      users[UID] = { role: 'member' };
      UserModel.distinct.mockRejectedValue(new Error('db down'));

      await expect(service.approve(UID)).resolves.toBeUndefined();
      expect(registerRepository.deleteByUid).toHaveBeenCalledWith(UID);
    });
  });
});

describe('pickRandomNickname', () => {
  it('숫자 없는 후보를 다 쓴 뒤에야 2를 붙인다', () => {
    const used = new Set<string>();
    const picked = RANDOM_NICKNAME_POOL.map(() => pickRandomNickname(used));
    expect(new Set(picked).size).toBe(RANDOM_NICKNAME_POOL.length);
    expect(picked.every((n) => !/\d$/.test(n))).toBe(true);

    const next = pickRandomNickname(used);
    expect(next).toMatch(/2$/);
    expect(RANDOM_NICKNAME_POOL).toContain(next.slice(0, -1));
  });

  it('후보에 중복이 없다', () => {
    expect(new Set(RANDOM_NICKNAME_POOL).size).toBe(RANDOM_NICKNAME_POOL.length);
  });
});

describe('RegisterService.isFullFeeWaiverReferrer (가입비 전액 면제 추천인)', () => {
  const users: Record<string, { role: string }> = {
    m: { role: 'manager' },
    p: { role: 'previliged' },
    n: { role: 'member' },
  };
  const service = new RegisterService(
    {} as any,
    { findOne: jest.fn((f: { uid: string }) => q(users[f.uid] ?? null)) } as any,
    {} as any,
    {} as any,
  );

  it.each([
    [undefined, false],
    ['', false],
    [[...CLUB_UIDS][0], true],
    ['m', true],
    ['p', true],
    ['n', false],
    ['unknown', false],
  ])('referrerUid=%p → %p', async (referrerUid, expected) => {
    await expect(
      service.isFullFeeWaiverReferrer(referrerUid as any),
    ).resolves.toBe(expected);
  });
});
