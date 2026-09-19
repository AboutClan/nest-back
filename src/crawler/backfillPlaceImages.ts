import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  extractRepresentativeImage,
  parseApolloStateFromHtml,
} from './naverPlaceDetail';

dotenv.config();

/**
 * 저장된 naverPlace(businessId)로 네이버 상세 페이지 HTML만 요청해 Place.image를 대표 이미지로 채움
 * (브라우저·GPT 없이 요청 1회 — 전체 재크롤링 불필요)
 *   npm run crawl:backfill-images                              미리보기 (DB 변경 없음, 앞 5곳)
 *   BACKFILL_APPLY=true npm run crawl:backfill-images           DB 반영 (기존 image 덮어씀)
 *   BACKFILL_LIMIT=20                                          처리 개수 제한
 *   BACKFILL_START=213                                         이 순번부터 이어서 (중단 후 재개, 로그의 [번호] 기준)
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
/** 0.7초 간격에서 약 210회 만에 HTTP 429 → 간격을 넓힘 */
const DELAY_MS = 1500;
/** 429(요청 과다)를 받으면 이만큼 쉬고 같은 곳을 다시 시도 */
const RATE_LIMIT_WAIT_MS = 60_000;
const MAX_RATE_LIMIT_RETRIES = 5;
/** 연속 실패가 이만큼 나오면 네이버 차단으로 보고 중단 */
const MAX_CONSECUTIVE_FAILURES = 5;

class RateLimitedError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRepresentativeImage(
  businessId: string,
  businessType: string,
): Promise<string | undefined> {
  const res = await fetch(
    `https://pcmap.place.naver.com/${businessType}/${businessId}/home`,
    {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko-KR' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (res.status === 429) throw new RateLimitedError('HTTP 429');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const apollo = parseApolloStateFromHtml(await res.text());
  if (!apollo) throw new Error('APOLLO_STATE 없음');
  return extractRepresentativeImage(apollo);
}

async function main(): Promise<void> {
  const apply = process.env.BACKFILL_APPLY === 'true';
  const limit = Number(process.env.BACKFILL_LIMIT) || (apply ? undefined : 5);
  // 로그의 [번호]는 1부터 — BACKFILL_START=213이면 213번째부터
  const start = Math.max((Number(process.env.BACKFILL_START) || 1) - 1, 0);

  await mongoose.connect(process.env.MONGODB_URI as string);
  const places = mongoose.connection.db!.collection('places');
  // 정렬 없이 자연 순서(저장 순서) — 첫 실행 로그의 [번호]와 같아야 BACKFILL_START로 이어 돌릴 수 있음
  const allTargets = await places
    .find(
      { 'naverPlace.businessId': { $exists: true } },
      { projection: { naverPlace: 1, image: 1, 'location.name': 1 } },
    )
    .toArray();
  const targets = allTargets.slice(start, limit ? start + limit : undefined);

  console.log(
    `전체 ${allTargets.length}곳 중 ${start + 1}번째부터 ${targets.length}곳 (${apply ? 'DB 반영' : '미리보기'})`,
  );

  let updated = 0;
  let noImage = 0;
  let failed = 0;
  let consecutiveFailures = 0;

  for (const [idx, place] of targets.entries()) {
    const i = start + idx;
    const name = place.location?.name;
    try {
      let image: string | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          image = await fetchRepresentativeImage(
            place.naverPlace.businessId,
            place.naverPlace.businessType ?? 'restaurant',
          );
          break;
        } catch (error) {
          if (!(error instanceof RateLimitedError) || attempt >= MAX_RATE_LIMIT_RETRIES) {
            throw error;
          }
          console.warn(
            `[${i + 1}] ${name} — HTTP 429, ${RATE_LIMIT_WAIT_MS / 1000}초 쉬고 재시도 (${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
          );
          await sleep(RATE_LIMIT_WAIT_MS);
        }
      }
      consecutiveFailures = 0;

      if (!image) {
        noImage++;
        console.log(`[${i + 1}] ${name} — 대표 이미지 없음 (기존 값 유지)`);
      } else {
        if (apply) {
          await places.updateOne({ _id: place._id }, { $set: { image } });
        }
        updated++;
        if (!apply || (i + 1) % 50 === 0) {
          console.log(`[${i + 1}] ${name} — ${apply ? '' : image}`);
        }
      }
    } catch (error) {
      failed++;
      consecutiveFailures++;
      console.warn(
        `[${i + 1}] ${name} — 실패: ${error instanceof Error ? error.message : error}`,
      );
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`🚫 ${MAX_CONSECUTIVE_FAILURES}곳 연속 실패 — 네이버 차단 가능성으로 중단`);
        break;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `\n완료 — ${apply ? '저장' : '저장 예정'} ${updated} / 이미지 없음 ${noImage} / 실패 ${failed}`,
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('backfill-images 실패:', error);
  process.exit(1);
});
