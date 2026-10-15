# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

어바웃(About)·카공지도 프론트가 호출하는 NestJS 백엔드입니다. 도메인 규칙·API 목록은 [../about-docs/summary.md](../about-docs/summary.md)와 `../about-docs/domains/*.md`(gather, study, cafe-map, point-score 등)에 정리돼 있으니 거기를 보세요. 이 문서는 코드 한 파일만 봐서는 드러나지 않는 것만 다룹니다.

## Commands

```bash
npm run start:dev        # localhost:3001 (nest start --watch). 프론트 About은 3000
npm run build            # nest build → dist/
npm run lint             # 주의: --fix가 붙어 있어 파일을 직접 고칩니다. 검사만 하려면 npx eslint "src/**/*.ts"
npm test                 # jest, spec은 3개뿐(app.controller, MSA/User/test/*) — 회귀 안전망으로 기대하지 마세요
npx jest src/MSA/User/test/user.service.spec.ts   # 단일 테스트
```

**서버를 띄우기 전에 3001 포트가 이미 쓰이는지 먼저 확인하고, 중복 기동하지 마세요.**

## 로컬 실행 시 위험 요소

- **스케줄러:** `src/schedule/schedule.module.ts`는 `NODE_ENV === 'development'`일 때만 `NotificationScheduler`를 빼고, 그 외 값(미설정 포함)이면 cron을 등록합니다. cron에는 DB 백업(mongodump→S3), 번개 보증금 분배·패널티, 월간 점수·티켓·멤버십 초기화, 결석비 차감, 전체 푸시 등이 들어 있습니다. 로컬 `.env`의 `MONGODB_URI`가 운영 DB를 가리키면 로컬에서 실제 운영 데이터가 바뀝니다. 중복 실행은 `ScheduleLog`(flag=날짜 + 이름)로 막기 때문에, 로컬이 먼저 돌면 운영 서버는 그날 해당 작업을 건너뜁니다. 스케줄 메서드를 수동으로 호출하지 마세요.
- **Redis 필수:** `BullModule.forRoot`(app.module.ts)가 `REDIS_HOST/PORT/PASSWORD`로 연결합니다. Bull 큐를 쓰는 processor는 현재 0개이고, 실제 Redis 사용처는 GroupStudy(`src/redis/redis.module.ts`의 `REDIS_CLIENT` → groupStudy 서비스·인터셉터 캐시)뿐입니다.
- **DB:** `src/Database/database.module.ts`가 `MONGODB_URI`가 없으면 부팅 시 throw합니다. 그 밖에 코드가 읽는 env 이름: `JWT_TOKEN`(next-auth JWT 복호화), `OPENAI_API_KEY`, `AWS_KEY`/`AWS_ACCESS_KEY`, `PORTONE_*`, `FCM_INFO`, `cryptoKey`, `KAKAO_*`/`APPLE_*`/`NICE_*`, `COOKIEPAY_INTERNAL_KEY`. 운영 값 목록은 `scripts/deploy.sh`가 Secrets Manager(`about/backend`)에서 만드는 `.env`가 기준입니다. `.env` 값은 읽거나 출력하지 마세요.

## 크롤러 / 카공지도 장소 평가

`crawl:*` 스크립트는 AppModule 대신 DB + PlaceModule만 띄우는 단독 실행 스크립트입니다(스케줄러·Bull은 안 뜸). 대부분 **운영 DB에 바로 씁니다.**

| 명령 | 하는 일 |
|---|---|
| `crawl:all` | 전체 place 네이버 크롤링 + GPT 평가, **DB 반영**. `CRAWL_LIMIT`, `CRAWL_ONLY_UNRATED`, `CRAWL_SKIP_CRAWLED_SINCE` 등(파일 상단 주석) |
| `crawl:naver` | `src/crawler/cafe.ts` 단독 실행(Puppeteer). `CRAWL_PLACE_NAME`, `CRAWL_HEADLESS` 등 |
| `crawl:rescore-space` | space 점수만 재채점(mood/power 유지). 기본은 미리보기, `RESCORE_APPLY=true`여야 DB 반영 |
| `crawl:backfill-meta` | 저장된 키워드/영업시간으로 studyCafeMeta 재계산. `BACKFILL_APPLY=true`여야 반영 |
| `crawl:backfill-images` | 네이버 대표 이미지로 `Place.image` 채움(기존 값 덮어씀). `BACKFILL_APPLY=true`여야 반영 |
| `crawl:test-hours` | 저장된 GraphQL JSON에서 영업시간 파싱만 테스트 |
| `crawl:restaurant` | **깨져 있음** — 대상 파일 `src/crawler/naverMapRestaurant.ts`가 없습니다 |

- **GPT 채점 프롬프트(`src/MSA/Place/core/services/place.service.ts` 상단, mood/power/space/etc 규칙)는 확정된 규칙입니다. 명시적으로 요청받지 않으면 문구·기준을 바꾸지 마세요.**
- space는 2026-09-25에 "좌석 수"가 아니라 **"방문객 대비 빈자리가 있는가"**로 재정의됐습니다. 재채점은 `npm run crawl:rescore-space`로 합니다.
- rescore-space는 저장소 루트에 `rescore-space-<시각>.json`과 `*.failed.txt`(실패 place id, `RESCORE_IDS`로 재시도용)를 남깁니다. git에 추적되지 않는 산출물이므로 커밋하지 마세요.
- 네이버는 짧은 간격으로 연속 요청하면 429를 반환합니다. 스크립트에 들어 있는 대기·재시도 간격을 줄이지 마세요.

## 인증 / 권한

- 전역 `AuthGuard`(`src/auth/auth.guard.ts`)와 `TokenValidatorMiddleware`는 **next-auth JWT가 유효한지만** 확인합니다(`JWT_TOKEN`으로 decode). `@Public()`이면 가드를 건너뜁니다. 결제 webhook/cookiepay 경로는 미들웨어에서 제외되고 `src/utils/internalAuth.ts`의 내부 키로 인증합니다.
- **역할(role) 가드는 없습니다.** `admin/*` 라우트를 포함해 관리자 기능의 권한 확인은 프론트엔드에서만 합니다. 서버에서 role을 확인하는 곳은 서비스 안에 하드코딩된 몇 군데뿐입니다(예: `user.service.ts` `getUserWithTelephone`, `gather.service.ts`의 불참 처리 — `ADMIN_UIDS` 하드코딩). 권한이 필요한 새 엔드포인트를 만들면 서비스에서 직접 확인해야 합니다.

## 구조상 주의

- `src/MSA/`는 마이크로서비스가 아닙니다. 모든 도메인 모듈이 `app.module.ts` 하나에 import되어 한 프로세스로 뜹니다. 도메인마다 `core/`(controllers·services·domain), `infra/`(Mongo repository), `entity/`, `dtos/` 구조를 따릅니다. `src/routes/`(admin, payment, cookiepay, imagez, logz, gift)는 이 계층 구조를 따르지 않습니다.
- **더미 참여자는 반드시 API(`POST /gather/invite/dummy` → `gatherService.inviteDummyGather`)로만 추가하세요.** 이 경로가 `role: 'dummy'` User를 먼저 만들고 participant.user에 연결합니다. DB에 participant를 직접 insert해서 user가 연결되지 않으면 프론트 gather 상세 페이지가 크래시합니다.

## 배포

CodeBuild(`buildspec.yml`, Docker 빌드 → ECR) → CodeDeploy(`appspec.yml`) → EC2에서 `scripts/deploy.sh`(Secrets Manager로 `.env` 생성 → 컨테이너 교체, 3001). `deploy.sh`는 EC2 전용입니다(sudo, `/home/ubuntu/app`, 운영 컨테이너 stop/rm). **로컬에서 실행하지 마세요.** 운영 이미지에는 백업 cron용 `mongodb-database-tools`가 들어 있습니다(Dockerfile).

## Git

다른 프로세스가 이 워킹트리를 복원하거나 커밋·푸시하는 경우가 있습니다. **스테이징 전에 `git log`와 `git status`를 확인하고 `origin`과 비교한 뒤** 진행하세요. 루트의 `rescore-space-*` 산출물은 커밋하지 마세요.
