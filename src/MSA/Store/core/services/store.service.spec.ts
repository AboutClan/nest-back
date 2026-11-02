jest.mock('src/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

import { Store } from 'src/domain/entities/Store/Store';
import { User } from 'src/MSA/User/core/domain/User/User';
import { RequestContext } from 'src/request-context';
import { StoreService } from './store.service';

const TOKEN = { id: 'user-id', uid: 'u-1' };

const runAsUser = <T>(fn: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    RequestContext.run({ request: { decodedToken: TOKEN } as any }, () => {
      fn().then(resolve, reject);
    });
  });

describe('StoreService.voteStore (포인트로 스토어 응모)', () => {
  let store: Store;
  let user: User;
  let storeRepository: { getStoreById: jest.Mock; save: jest.Mock };
  let userRepository: { findById: jest.Mock; save: jest.Mock };
  let prizeRepository: { recordPrize: jest.Mock };
  let service: StoreService;

  const makeStore = (fields: Partial<Store> = {}) =>
    new Store({
      _id: 'store-1',
      name: '기프티콘',
      image: '',
      point: 1000, // 응모 1회당 포인트
      winnerCnt: 1,
      max: 10,
      ...fields,
    } as any);

  beforeEach(() => {
    store = makeStore();
    user = new User();
    user.point = 20000;
    storeRepository = {
      getStoreById: jest.fn(async () => store),
      save: jest.fn().mockResolvedValue(undefined),
    };
    userRepository = {
      findById: jest.fn(async () => user),
      save: jest.fn().mockResolvedValue(undefined),
    };
    prizeRepository = { recordPrize: jest.fn().mockResolvedValue(undefined) };
    service = new StoreService(
      storeRepository as any,
      userRepository as any,
      {} as any,
      prizeRepository as any,
    );
  });

  it('응모 수 × 상품 포인트만큼 차감한다', async () => {
    await runAsUser(() => service.voteStore('store-1', 3));

    expect(user.point).toBe(17000);
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(store.calcTotalVote()).toBe(3);
    expect(storeRepository.save).toHaveBeenCalledWith(store);
  });

  it('차감 후 잔액이 정확히 8000P면 허용', async () => {
    user.point = 11000;

    await runAsUser(() => service.voteStore('store-1', 3));

    expect(user.point).toBe(8000);
  });

  it('차감 후 잔액이 8000P 미만이면 거부하고 아무것도 저장하지 않는다', async () => {
    user.point = 10999;

    await expect(runAsUser(() => service.voteStore('store-1', 3))).rejects.toThrow(
      'Point is not enough',
    );
    expect(user.point).toBe(10999);
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(storeRepository.save).not.toHaveBeenCalled();
  });

  it('남은 응모 수보다 많이 요청하면 남은 만큼만 응모·차감한다', async () => {
    store = makeStore({ max: 10 });
    store.applicants = [{ user: { _id: 'other' } as any, cnt: 8 }];

    await runAsUser(() => service.voteStore('store-1', 5));

    expect(user.point).toBe(18000); // 2회분만 차감
    expect(store.calcTotalVote()).toBe(10);
  });

  it('이미 마감(가득 참)이면 포인트를 차감하지 않는다', async () => {
    store = makeStore({ max: 10 });
    store.applicants = [{ user: { _id: 'other' } as any, cnt: 10 }];

    await expect(runAsUser(() => service.voteStore('store-1', 1))).rejects.toThrow(
      'Already full',
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('추첨이 끝난(processed) 상품에는 응모할 수 없다', async () => {
    store = makeStore({ status: 'processed' });

    await expect(runAsUser(() => service.voteStore('store-1', 1))).rejects.toThrow(
      'already processed',
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('마지막 응모로 정원이 차면 당첨자를 뽑아 기록한다', async () => {
    store = makeStore({ max: 3, winnerCnt: 1 });

    await runAsUser(() => service.voteStore('store-1', 3));

    expect(store.status).toBe('processed');
    expect(store.winner).toEqual(['user-id']);
    expect(prizeRepository.recordPrize).toHaveBeenCalledWith(
      'user-id',
      '기프티콘',
      expect.any(Date),
      'store',
      '스토어 응모 상품 당첨',
    );
  });

  /**
   * [의심 버그] voteStore / 컨트롤러(@Body('cnt'))가 cnt의 부호·정수 여부를 검증하지 않는다.
   * cnt=-5 이면 calcRemain이 -5를 그대로 돌려주고 updatePoint = point × -5 (음수)가 되어
   * 잔액 검사를 통과한 뒤 increasePoint(+5000) — 즉 포인트가 "증가"하고 응모 수는 줄어든다.
   * 기대 동작: cnt <= 0 (또는 정수가 아님)이면 거부.
   */
  it.skip('[의심 버그] 음수 응모 수로 포인트를 얻을 수 없어야 한다', async () => {
    await expect(
      runAsUser(() => service.voteStore('store-1', -5)),
    ).rejects.toThrow();
    expect(user.point).toBe(20000);
  });
});
