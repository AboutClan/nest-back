import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import * as fs from 'fs';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { DatabaseModule } from 'src/Database/database.module';
import PlaceService from 'src/MSA/Place/core/services/place.service';
import { PlaceModule } from 'src/MSA/Place/place.module';
import { UserSchema } from 'src/MSA/User/entity/user.entity';
import { selectStudyReviews } from './cafe';

/**
 * space(자리 여유)만 새 기준으로 재채점 — mood/power는 유지
 *   npm run crawl:rescore-space
 *
 * 네이버 방문자 리뷰를 브라우저 없이 GraphQL로 받아(최대 RESCORE_PAGES × 50개)
 * 크롤러와 같은 규칙(selectStudyReviews)으로 골라 GPT에 넘긴다.
 *
 * 환경변수
 *   RESCORE_APPLY=true     DB에 반영 (기본: 미리보기만)
 *   RESCORE_ONLY_SPACE=5   현재 space가 이 값인 place만 (기본: 전체)
 *   RESCORE_IDS=a,b        이 place id만 (쉼표 구분)
 *   RESCORE_LIMIT=20       처리할 최대 place 수
 *   RESCORE_PAGES=4        리뷰 페이지 수
 *   RESCORE_OUT=path.json  결과 저장 경로 (기본: rescore-space-<시각>.json)
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
    PlaceModule,
  ],
})
class RescoreSpaceModule {}

const GQL = 'https://pcmap-api.place.naver.com/graphql';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const REVIEW_QUERY = `query getVisitorReviews($input: VisitorReviewsInput) {
  visitorReviews(input: $input) { items { id cursor body author { nickname } } total }
}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429면 60초 대기 후 재시도, 연속 5회 실패 시 예외 */
async function fetchReviews(
  businessId: string,
  businessType: string,
  pages: number,
): Promise<any[]> {
  const items: any[] = [];
  let after: string | undefined;
  let fails = 0;
  for (let p = 0; p < pages; p++) {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'ko-KR',
        'Content-Type': 'application/json',
        Referer: `https://pcmap.place.naver.com/${businessType}/${businessId}/review/visitor`,
        Origin: 'https://pcmap.place.naver.com',
      },
      body: JSON.stringify([
        {
          operationName: 'getVisitorReviews',
          variables: {
            input: {
              businessId,
              bookingBusinessId: null,
              businessType,
              size: 50,
              includeContent: true,
              ...(after && { after }),
            },
          },
          query: REVIEW_QUERY,
        },
      ]),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429) {
      if (++fails >= 5) throw new Error('네이버 429 연속 5회 — 중단');
      await sleep(60_000);
      p--;
      continue;
    }
    fails = 0;
    const vr = JSON.parse(await res.text())?.[0]?.data?.visitorReviews;
    if (!vr?.items?.length) break;
    items.push(...vr.items);
    after = vr.items[vr.items.length - 1].cursor;
    await sleep(900 + Math.random() * 600);
    if (items.length >= vr.total) break;
  }
  return items;
}

async function main(): Promise<void> {
  const apply = process.env.RESCORE_APPLY === 'true';
  const onlySpace = process.env.RESCORE_ONLY_SPACE
    ? Number(process.env.RESCORE_ONLY_SPACE)
    : undefined;
  const ids = process.env.RESCORE_IDS?.split(',').map((s) => s.trim());
  const limit = Number(process.env.RESCORE_LIMIT) || undefined;
  const pages = Number(process.env.RESCORE_PAGES) || 4;
  const out =
    process.env.RESCORE_OUT ||
    `rescore-space-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  const app = await NestFactory.createApplicationContext(RescoreSpaceModule, {
    logger: ['error', 'warn'],
  });
  const service = app.get(PlaceService);
  const places: any[] = await (service as any).placeRepository.findAll();

  const targets = places
    .filter((p) => p.status !== 'inactive' && p.naverPlace?.businessId)
    .filter((p) => !ids || ids.includes(p._id.toString()))
    .filter((p) => {
      const ai = (p.ratings ?? []).find((r: any) => r.name === '어바웃 AI');
      return ai && (onlySpace === undefined || ai.space === onlySpace);
    })
    .slice(0, limit);

  console.log(
    `${apply ? '[반영]' : '[미리보기]'} 대상 ${targets.length}곳${onlySpace !== undefined ? ` (현재 space=${onlySpace})` : ''}`,
  );

  const results: any[] = [];
  const failed: string[] = [];
  let netFails = 0;
  try {
    for (const [i, p] of targets.entries()) {
      const id = p._id.toString();
      const name = p.location?.name;
      try {
        let items: any[];
        try {
          items = await fetchReviews(
            p.naverPlace.businessId,
            p.naverPlace.businessType,
            pages,
          );
          netFails = 0;
        } catch (err: any) {
          // 연결 거부("fetch failed")·타임아웃은 네이버 차단 신호 — 60초 쉬고 같은 place 재시도, 연속 5회면 중단
          if (++netFails >= 5) throw new Error(`네이버 연결 실패 연속 5회 — 중단 (${err?.message})`);
          console.warn(`${i + 1}/${targets.length} ${name} 네트워크 오류 (${err?.message}) — 60초 대기 후 재시도`);
          await sleep(60_000);
          items = await fetchReviews(
            p.naverPlace.businessId,
            p.naverPlace.businessType,
            pages,
          );
          netFails = 0;
        }
        const kw = p.naverKeywords;
        const keywordLine = kw?.details?.length
          ? [
              `[카공 키워드 투표 (전체 ${kw.totalCount}표 중)] ${kw.details
                .map((d: any) => `${d.name} ${d.count}`)
                .join(' / ')}`,
            ]
          : [];
        const reviews = [
          ...keywordLine,
          ...selectStudyReviews(items).map((r) => r.body),
        ];
        const r = await service.rescoreSpaceWithGpt(id, reviews, !apply);
        if (!r) continue;
        results.push({ id, name, reviews: items.length, used: reviews.length, ...r });
        console.log(
          `${i + 1}/${targets.length} ${name}: space ${r.before.space} → ${r.after.space}  (리뷰 ${items.length}, 근거 ${reviews.length})`,
        );
      } catch (err: any) {
        console.error(`${i + 1}/${targets.length} ${name} 실패:`, err?.message ?? err);
        failed.push(id);
        if (/429|연속 5회/.test(String(err?.message))) {
          failed.push(...targets.slice(i + 1).map((t) => t._id.toString()));
          break;
        }
      }
      await sleep(1_500);
    }
  } finally {
    fs.writeFileSync(out, JSON.stringify(results, null, 2));
    if (failed.length) {
      // 이어하기: RESCORE_IDS=$(cat <파일>) 로 재실행
      fs.writeFileSync(out.replace(/\.json$/, '') + '.failed.txt', failed.join(','));
      console.log(`실패/미처리 ${failed.length}곳 -> ${out.replace(/\.json$/, '')}.failed.txt`);
    }
    const dist: Record<string, number> = {};
    for (const r of results) dist[r.after.space] = (dist[r.after.space] ?? 0) + 1;
    console.log(`\n새 space 분포: ${JSON.stringify(dist)}`);
    console.log(`결과 -> ${out}`);
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('rescore-space 실패:', error);
    process.exit(1);
  });
