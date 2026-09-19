import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

// About과 반드시 동일한 값이어야 한다 (About: libs/cookiepayOrderClient.ts).
// COOKIEPAY_INTERNAL_KEY 환경변수를 EC2/Vercel 양쪽에 설정한 뒤에는 아래 하드코딩된
// fallback 값을 제거할 것 (git 이력에 평문으로 남아있던 값이라 더는 신뢰할 수 없음).
const COOKIEPAY_INTERNAL_KEY =
  process.env.COOKIEPAY_INTERNAL_KEY ||
  'e7996cfca3b07958cf2233af8152d2344da052d15ae0523d1ced5649af928388';

/**
 * 결제 webhook/return처럼 사용자 JWT 없이 서버(About) → nest-back으로 오는
 * 내부 호출을 인증한다. 이 키만으로 임의 uid를 승인/지급하지 않도록,
 * 실제 side effect는 항상 사전에 저장된 주문 레코드(orderNo) 기준으로만 실행해야 한다.
 */
export function assertInternalKey(headerValue: string | undefined) {
  const expected = COOKIEPAY_INTERNAL_KEY;

  const provided = headerValue ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new UnauthorizedException('invalid internal key');
  }
}
