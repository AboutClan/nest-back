import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { DatabaseModule } from 'src/Database/database.module';
import PlaceService from 'src/MSA/Place/core/services/place.service';
import { PlaceModule } from 'src/MSA/Place/place.module';
import { UserSchema } from 'src/MSA/User/entity/user.entity';

/**
 * 전체 place 네이버 크롤링 + GPT 카공 평가 일괄 실행
 *   npm run crawl:all
 *
 * AppModule 대신 DB + PlaceModule만 로드 (스케줄러·Bull/Redis 미기동)
 *
 * 환경변수
 *   CRAWL_SKIP_CRAWLED_SINCE         이 시각 이후 처리한 place 건너뜀 (중단 후 이어하기, 예: 2026-09-19T17:48+09:00)
 *   CRAWL_SKIP_CRAWLED_WITHIN_HOURS  최근 N시간 내 처리한 place 건너뜀 (SINCE가 없을 때, 기본 0 = 전부)
 *   CRAWL_ONLY_UNRATED=true          AI 평가 없는 place만 처리 (기본: 전체)
 *   CRAWL_LIMIT                      처리할 최대 place 수 (시험 실행용)
 *   CRAWL_LOG_GRAPHQL=true           GraphQL 요청/응답 전문 로그 (기본: 끔)
 *   그 외 CRAWL_REVIEW_* 등은 crawler/cafe.ts 참고
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    // place 조회 시 registrant populate에 필요
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
    PlaceModule,
  ],
})
class CrawlAllModule {}

/** 몇 시간짜리 일괄 작업이 일시적 네트워크 오류(ECONNRESET 등) 하나로 통째로 죽지 않도록 로그만 남기고 계속 */
process.on('uncaughtException', (error) => {
  console.error('⚠️ uncaughtException — 무시하고 계속:', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ unhandledRejection — 무시하고 계속:', reason);
});

async function main(): Promise<void> {
  process.env.CRAWL_LOG_GRAPHQL ??= 'false';

  const skipSinceEnv = process.env.CRAWL_SKIP_CRAWLED_SINCE;
  const skipCrawledSince = skipSinceEnv ? new Date(skipSinceEnv) : undefined;
  if (skipCrawledSince && Number.isNaN(skipCrawledSince.getTime())) {
    throw new Error(`CRAWL_SKIP_CRAWLED_SINCE 형식 오류: ${skipSinceEnv}`);
  }

  const app = await NestFactory.createApplicationContext(CrawlAllModule, {
    logger: ['error', 'warn'],
  });

  const startedAt = Date.now();
  try {
    await app.get(PlaceService).processAllPlacesStudyCafe({
      all: process.env.CRAWL_ONLY_UNRATED !== 'true',
      skipCrawledSince,
      skipCrawledWithinHours:
        Number(process.env.CRAWL_SKIP_CRAWLED_WITHIN_HOURS) || 0,
      limit: Number(process.env.CRAWL_LIMIT) || undefined,
    });
  } finally {
    await app.close();
    console.log(
      `\n소요 시간: ${Math.round((Date.now() - startedAt) / 60000)}분`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('crawl:all 실패:', error);
    process.exit(1);
  });
