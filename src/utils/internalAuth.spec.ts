/**
 * assertInternalKey는 모듈 로드 시점에 process.env.COOKIEPAY_INTERNAL_KEY를 읽는다.
 * .env 파일은 읽지 않고, 테스트 안에서 환경변수를 직접 지정한 뒤 모듈을 새로 로드한다.
 */
describe('assertInternalKey (결제 webhook 내부 인증)', () => {
  const ORIGINAL = process.env.COOKIEPAY_INTERNAL_KEY;
  const KEY = 'test-internal-key-0123456789';

  let assertInternalKey: (v: string | undefined) => void;

  beforeEach(() => {
    process.env.COOKIEPAY_INTERNAL_KEY = KEY;
    jest.isolateModules(() => {
      assertInternalKey = require('./internalAuth').assertInternalKey;
    });
  });

  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.COOKIEPAY_INTERNAL_KEY;
    else process.env.COOKIEPAY_INTERNAL_KEY = ORIGINAL;
  });

  it('올바른 키면 통과한다', () => {
    expect(() => assertInternalKey(KEY)).not.toThrow();
  });

  it.each([
    ['헤더 없음', undefined],
    ['빈 문자열', ''],
    ['다른 키(같은 길이)', KEY.replace(/.$/, 'X')],
    ['다른 길이', KEY + 'a'],
    ['접두사만 일치', KEY.slice(0, 5)],
  ])('%s → 401', (_label, value) => {
    // isolateModules로 @nestjs/common도 새로 로드되므로 instanceof 대신 상태코드로 확인
    let err: any;
    try {
      assertInternalKey(value);
    } catch (e) {
      err = e;
    }
    expect(err?.getStatus?.()).toBe(401);
    expect(err?.message).toBe('invalid internal key');
  });
});
