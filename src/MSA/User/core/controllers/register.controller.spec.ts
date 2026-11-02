import { HttpException, HttpStatus } from '@nestjs/common';
import { RequestContext } from 'src/request-context';

// RegisterService 실제 구현(및 UserService/DB 의존성)을 로드하지 않는다.
jest.mock('../services/register.service', () => ({
  __esModule: true,
  default: class {},
}));

import { RegisterController } from './register.controller';

/** 전역 미들웨어가 넣어주는 decodedToken을 흉내 내어 컨트롤러를 실행한다. */
const runAs = <T>(token: { uid: string } | undefined, fn: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    RequestContext.run({ request: { decodedToken: token } as any }, () => {
      fn().then(resolve, reject);
    });
  });

describe('RegisterController POST register/approval (결제 없는 가입 승인 통로)', () => {
  let registerService: {
    approve: jest.Mock;
    isAdmin: jest.Mock;
    isFullFeeWaiverReferrer: jest.Mock;
  };
  let controller: RegisterController;

  beforeEach(() => {
    registerService = {
      approve: jest.fn().mockResolvedValue(undefined),
      isAdmin: jest.fn().mockResolvedValue(false),
      isFullFeeWaiverReferrer: jest.fn().mockResolvedValue(false),
    };
    controller = new RegisterController(registerService as any);
  });

  const expectStatus = async (p: Promise<unknown>, status: number) => {
    const err = await p.then(
      () => null,
      (e) => e,
    );
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(status);
  };

  it('토큰이 없으면 401', async () => {
    await expectStatus(
      runAs(undefined, () => controller.approveUser({ uid: 'u-1' })),
      HttpStatus.UNAUTHORIZED,
    );
    expect(registerService.approve).not.toHaveBeenCalled();
  });

  it('본인 승인 + 추천인 없음 → 403 (결제 없이 가입 불가)', async () => {
    await expectStatus(
      runAs({ uid: 'u-1' }, () => controller.approveUser({ uid: 'u-1' })),
      HttpStatus.FORBIDDEN,
    );
    expect(registerService.approve).not.toHaveBeenCalled();
  });

  it('본인 승인 + 면제 대상이 아닌 추천인 → 403', async () => {
    registerService.isFullFeeWaiverReferrer.mockResolvedValue(false);

    await expectStatus(
      runAs({ uid: 'u-1' }, () =>
        controller.approveUser({ uid: 'u-1', referrerUid: 'friend' }),
      ),
      HttpStatus.FORBIDDEN,
    );
    expect(registerService.isFullFeeWaiverReferrer).toHaveBeenCalledWith(
      'friend',
    );
    expect(registerService.approve).not.toHaveBeenCalled();
  });

  it('본인 승인 + 가입비 전액 면제 추천인 → 승인', async () => {
    registerService.isFullFeeWaiverReferrer.mockResolvedValue(true);

    const res = await runAs({ uid: 'u-1' }, () =>
      controller.approveUser({ uid: 'u-1', referrerUid: 'club' }),
    );

    expect(res).toEqual({ status: 'success' });
    expect(registerService.approve).toHaveBeenCalledWith('u-1', 'club');
  });

  it('일반 유저가 타인을 승인하려 하면 403', async () => {
    await expectStatus(
      runAs({ uid: 'u-1' }, () => controller.approveUser({ uid: 'u-2' })),
      HttpStatus.FORBIDDEN,
    );
    expect(registerService.isAdmin).toHaveBeenCalledWith('u-1');
    expect(registerService.approve).not.toHaveBeenCalled();
  });

  it('운영진은 타인의 가입을 승인할 수 있다', async () => {
    registerService.isAdmin.mockResolvedValue(true);

    await runAs({ uid: 'admin' }, () =>
      controller.approveUser({ uid: 'u-2', referrerUid: undefined }),
    );

    expect(registerService.approve).toHaveBeenCalledWith('u-2', undefined);
  });

  it('approve 내부 에러는 500으로 감싼다', async () => {
    registerService.isAdmin.mockResolvedValue(true);
    registerService.approve.mockRejectedValue(new Error('boom'));

    await expectStatus(
      runAs({ uid: 'admin' }, () => controller.approveUser({ uid: 'u-2' })),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  /**
   * [의심 버그] POST register/direct (RegisterService.directRegister)는 토큰만 있으면
   * 결제/추천 검증 없이 곧바로 role=member + 5000P 로 가입시킨다.
   * approval 엔드포인트에 넣은 "결제 없이 가입 불가" 방어를 우회하는 통로로 보인다.
   * 의도된 통로(예: 특정 앱 전용)인지 확인 필요.
   */
  it.todo(
    '[의심 버그] register/direct 는 결제·면제 추천 없이 member 승격을 허용하면 안 된다',
  );
});
