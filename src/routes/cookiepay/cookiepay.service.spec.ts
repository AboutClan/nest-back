import { HttpException, HttpStatus } from '@nestjs/common';

// 실제 RegisterService/UserService는 DB·firebase 등 무거운 의존성을 끌고 오므로 모듈째 대체한다.
jest.mock('src/MSA/User/core/services/register.service', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('src/MSA/User/core/services/user.service', () => ({
  UserService: class {},
}));

import { CookiepayService } from './cookiepay.service';

/**
 * CookiepayOrder mongoose Model의 인메모리 가짜 구현.
 * - findOneAndUpdate는 Mongo처럼 "조회+갱신"이 한 번에(원자적으로) 일어난다.
 * - findOne은 `await`(문서, save 가능)과 `.lean()`(plain object) 둘 다 지원한다.
 */
function createFakeOrderModel() {
  const store = new Map<string, any>();

  const matches = (doc: any, filter: Record<string, any>) =>
    Object.entries(filter).every(([k, v]) => (doc[k] ?? null) === v);
  const find = (filter: Record<string, any>) =>
    [...store.values()].find((d) => matches(d, filter)) ?? null;

  const makeDoc = (plain: any) => {
    const doc: any = { ...plain };
    doc.save = jest.fn(async () => {
      const { save, ...rest } = doc;
      store.set(rest.orderNo, { ...rest });
      return doc;
    });
    return doc;
  };

  const query = (plain: any) => ({
    lean: async () => (plain ? { ...plain } : null),
    then: (res: any, rej: any) =>
      Promise.resolve(plain ? makeDoc(plain) : null).then(res, rej),
  });

  const model = {
    store,
    findOne: jest.fn((filter: any) => query(find(filter))),
    findOneAndUpdate: jest.fn(async (filter: any, update: any, opts: any) => {
      let doc = find(filter);
      if (!doc) {
        if (!opts?.upsert) return null;
        doc = { ...filter, ...(update.$setOnInsert ?? {}) };
      } else if (update.$set) {
        doc = { ...doc, ...update.$set };
      }
      store.set(doc.orderNo, doc);
      return makeDoc(doc);
    }),
    updateOne: jest.fn(async (filter: any, update: any) => {
      const doc = find(filter);
      if (doc) store.set(doc.orderNo, { ...doc, ...update.$set });
    }),
  };
  return model;
}

describe('CookiepayService (결제 → 가입 승인 / 포인트 충전)', () => {
  let model: ReturnType<typeof createFakeOrderModel>;
  let registerService: { approve: jest.Mock };
  let userService: { updatePoint: jest.Mock };
  let service: CookiepayService;

  const REGISTER_ORDER = {
    orderNo: 'ORD-REG-1',
    uid: 'u-1',
    type: 'register' as const,
    amount: 20000,
    discount: 0,
    referrerUid: 'ref-1',
  };
  const POINT_ORDER = {
    orderNo: 'ORD-PT-1',
    uid: 'u-2',
    type: 'point' as const,
    amount: 5000,
  };

  beforeEach(() => {
    model = createFakeOrderModel();
    registerService = { approve: jest.fn().mockResolvedValue(undefined) };
    userService = { updatePoint: jest.fn().mockResolvedValue(undefined) };
    service = new CookiepayService(
      model as any,
      registerService as any,
      userService as any,
    );
  });

  const expectHttpStatus = async (p: Promise<unknown>, status: number) => {
    await expect(p).rejects.toBeInstanceOf(HttpException);
    await p.catch((e: HttpException) => expect(e.getStatus()).toBe(status));
  };

  describe('createOrder', () => {
    it('주문을 PENDING / processedAt=null 로 저장한다', async () => {
      await service.createOrder(REGISTER_ORDER);

      const saved = model.store.get('ORD-REG-1');
      expect(saved).toMatchObject({
        uid: 'u-1',
        type: 'register',
        amount: 20000,
        status: 'PENDING',
        processedAt: null,
        referrerUid: 'ref-1',
      });
    });

    it('같은 orderNo로 다시 요청해도 기존 주문(금액·uid)을 덮어쓰지 않는다', async () => {
      await service.createOrder(REGISTER_ORDER);
      await service.createOrder({ ...REGISTER_ORDER, uid: 'attacker', amount: 1 });

      expect(model.store.get('ORD-REG-1')).toMatchObject({
        uid: 'u-1',
        amount: 20000,
      });
    });
  });

  describe('markResult', () => {
    it('존재하지 않는 주문이면 404', async () => {
      await expectHttpStatus(
        service.markResult({
          orderNo: 'nope',
          verifiedAmount: 1000,
          verifiedStatus: 'SUCCESS',
        }),
        HttpStatus.NOT_FOUND,
      );
    });

    it('PG 결과가 FAIL이면 FAIL로 기록하고 승인하지 않는다', async () => {
      await service.createOrder(REGISTER_ORDER);

      const res = await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'FAIL',
      });

      expect(res).toEqual({ ok: true, processed: false });
      expect(model.store.get('ORD-REG-1').status).toBe('FAIL');
      expect(registerService.approve).not.toHaveBeenCalled();
    });

    it('이미 SUCCESS인 주문에 뒤늦은 FAIL이 와도 SUCCESS를 유지한다', async () => {
      await service.createOrder(REGISTER_ORDER);
      await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'SUCCESS',
      });

      await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'FAIL',
      });

      expect(model.store.get('ORD-REG-1').status).toBe('SUCCESS');
    });

    it('실결제 금액이 사전 등록 금액과 다르면 409 + FAIL, 승인하지 않는다', async () => {
      await service.createOrder(REGISTER_ORDER);

      await expectHttpStatus(
        service.markResult({
          orderNo: 'ORD-REG-1',
          verifiedAmount: 100,
          verifiedStatus: 'SUCCESS',
        }),
        HttpStatus.CONFLICT,
      );

      expect(model.store.get('ORD-REG-1').status).toBe('FAIL');
      expect(registerService.approve).not.toHaveBeenCalled();
    });

    it('소수점 오차(반올림 시 동일)는 같은 금액으로 본다', async () => {
      await service.createOrder(REGISTER_ORDER);

      const res = await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000.4,
        verifiedStatus: 'SUCCESS',
      });

      expect(res).toEqual({ ok: true, processed: true });
    });

    it('가입 주문 SUCCESS → 주문에 저장된 uid/추천인으로 approve가 호출된다', async () => {
      await service.createOrder(REGISTER_ORDER);

      const res = await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'SUCCESS',
      });

      expect(res).toEqual({ ok: true, processed: true });
      expect(registerService.approve).toHaveBeenCalledTimes(1);
      expect(registerService.approve).toHaveBeenCalledWith('u-1', 'ref-1');
      expect(userService.updatePoint).not.toHaveBeenCalled();
      expect(model.store.get('ORD-REG-1').processedAt).toBeInstanceOf(Date);
    });

    it('포인트 주문 SUCCESS → 결제 금액만큼 해당 uid에 포인트 충전', async () => {
      await service.createOrder(POINT_ORDER);

      await service.markResult({
        orderNo: 'ORD-PT-1',
        verifiedAmount: 5000,
        verifiedStatus: 'SUCCESS',
      });

      expect(userService.updatePoint).toHaveBeenCalledTimes(1);
      expect(userService.updatePoint).toHaveBeenCalledWith(
        5000,
        '포인트 충전',
        'point',
        'u-2',
      );
      expect(registerService.approve).not.toHaveBeenCalled();
    });

    it('noti(webhook)와 return이 동시에 SUCCESS를 보내도 승인은 정확히 한 번만 실행된다', async () => {
      await service.createOrder(REGISTER_ORDER);
      const input = {
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'SUCCESS' as const,
      };

      const results = await Promise.all([
        service.markResult(input),
        service.markResult(input),
      ]);

      expect(registerService.approve).toHaveBeenCalledTimes(1);
      expect(results).toEqual(
        expect.arrayContaining([
          { ok: true, processed: true },
          { ok: true, processed: true, alreadyProcessed: true },
        ]),
      );
    });

    it('포인트 충전도 중복 SUCCESS 통지에 대해 한 번만 지급된다', async () => {
      await service.createOrder(POINT_ORDER);
      const input = {
        orderNo: 'ORD-PT-1',
        verifiedAmount: 5000,
        verifiedStatus: 'SUCCESS' as const,
      };

      await service.markResult(input);
      await service.markResult(input);
      await service.finalize('ORD-PT-1');

      expect(userService.updatePoint).toHaveBeenCalledTimes(1);
    });
  });

  describe('finalize', () => {
    it('존재하지 않는 주문이면 404', async () => {
      await expectHttpStatus(service.finalize('nope'), HttpStatus.NOT_FOUND);
    });

    it('아직 결제 확정(SUCCESS) 전인 주문은 처리하지 않는다', async () => {
      await service.createOrder(REGISTER_ORDER);

      const res = await service.finalize('ORD-REG-1');

      expect(res).toEqual({ ok: true, processed: false });
      expect(registerService.approve).not.toHaveBeenCalled();
    });

    it('이미 처리된 주문을 클라이언트가 재시도하면 alreadyProcessed로 응답하고 재승인하지 않는다', async () => {
      await service.createOrder(REGISTER_ORDER);
      await service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 20000,
        verifiedStatus: 'SUCCESS',
      });

      const res = await service.finalize('ORD-REG-1');

      expect(res).toEqual({ ok: true, processed: true, alreadyProcessed: true });
      expect(registerService.approve).toHaveBeenCalledTimes(1);
    });

    it('승인 중 에러가 나면 클레임(processedAt)을 되돌려 재시도가 가능해야 한다', async () => {
      await service.createOrder(REGISTER_ORDER);
      registerService.approve.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.markResult({
          orderNo: 'ORD-REG-1',
          verifiedAmount: 20000,
          verifiedStatus: 'SUCCESS',
        }),
      ).rejects.toThrow('db down');
      expect(model.store.get('ORD-REG-1')).toMatchObject({
        status: 'SUCCESS',
        processedAt: null,
      });

      // 재시도 시 정상 처리
      const res = await service.finalize('ORD-REG-1');
      expect(res).toEqual({ ok: true, processed: true });
      expect(registerService.approve).toHaveBeenCalledTimes(2);
      expect(model.store.get('ORD-REG-1').processedAt).toBeInstanceOf(Date);
    });
  });

  /**
   * [의심 버그] 가입 주문의 amount는 About(init-order.ts)에서 클라이언트가 보낸
   * `value - discount` 를 그대로 저장하고, markResult는 "PG 실결제액 == 저장된 amount"만
   * 검증한다. 서버가 가입비 기준 금액(정가 - 정당한 할인)을 검증하지 않으므로
   * amount=100 으로 주문을 만들고 100원만 결제해도 가입 승인이 나간다.
   * 기대 동작: 가입 주문은 서버가 아는 가입비보다 적으면 거부되어야 한다.
   * (현재 서버에 가입비 상수가 없어 기대 금액을 특정할 수 없으므로 skip)
   */
  it.skip('[의심 버그] 가입비보다 적은 금액의 register 주문은 승인되지 않아야 한다', async () => {
    await service.createOrder({ ...REGISTER_ORDER, amount: 100 });

    await expect(
      service.markResult({
        orderNo: 'ORD-REG-1',
        verifiedAmount: 100,
        verifiedStatus: 'SUCCESS',
      }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(registerService.approve).not.toHaveBeenCalled();
  });
});
