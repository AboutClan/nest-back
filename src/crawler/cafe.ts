import * as path from 'path';
import { Browser, HTTPRequest, HTTPResponse, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IPlace, Place } from 'src/MSA/Place/entity/place.entity';
import dbConnect from '../Database/conn';
import { logger } from '../logger';
import {
  StudyCafeMeta,
  StudyCafeMetaGptAnalyzer,
  StudyCafeMetaResult,
} from './studyCafeMeta/studyCafeMetaGpt';
import { is24HoursFromOperatingHours } from './studyCafeMeta/keywordMetaRules';
import { extractRepresentativeImage } from './naverPlaceDetail';

puppeteer.use(StealthPlugin());

const GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql';

const CRAWL_CONFIG = {
  headless: process.env.CRAWL_HEADLESS === 'true',
  batchSize: Number(process.env.CRAWL_BATCH_SIZE) || 1000,
  /** 장소 간 대기 (ms). 크롤링 본문에는 딜레이 없음 */
  betweenPlacesMs: Number(process.env.CRAWL_BETWEEN_PLACES_MS) || 0,
  /** 지정 시 해당 이름(location.name)의 장소만 크롤링 — 단건 테스트용 */
  placeName: process.env.CRAWL_PLACE_NAME,
  /** 방문자 리뷰 최대 페이지 수 (페이지당 50개) */
  reviewMaxPages: Number(process.env.CRAWL_REVIEW_MAX_PAGES) || 4,
  /** 카공 관련 리뷰가 이만큼 모이면 추가 페이지 요청 중단 */
  reviewStudyTarget: Number(process.env.CRAWL_REVIEW_STUDY_TARGET) || 15,
  /** 리뷰 페이지 요청 사이 대기 (ms) */
  reviewPageDelayMs: Number(process.env.CRAWL_REVIEW_PAGE_DELAY_MS) || 1000,
  userDataDir:
    process.env.CRAWL_USER_DATA_DIR ||
    path.join(process.cwd(), '.naver-crawl-profile'),
};

/** GraphQL 요청/응답 전문 로그 (카페당 수천 줄) — CRAWL_LOG_GRAPHQL=false로 끔 */
const GRAPHQL_LOG_ENABLED = () => process.env.CRAWL_LOG_GRAPHQL !== 'false';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

const RATE_LIMIT_PATTERNS = [
  '과도한 서비스 요청',
  '이용이 제한',
  '비정상적인 접근',
  '잠시 후 다시',
];

const encodeBase64 = (str: string): string =>
  Buffer.from(str).toString('base64');

interface SessionContext {
  businessId: string;
  businessType: string;
  cookie: string;
  ncaptchaToken: string;
  pcmapUrl: string;
  /** pcmap 페이지 SSR 데이터에서 추출한 영업시간 (없으면 []) */
  operatingHours: string[][];
  /** pcmap 상세 첫 번째 대표 이미지 (네이버 이미지 주소) */
  image?: string;
}

/** DB(Place.location) 좌표 — 검색 결과 중 같은 지점 선택에 사용 */
interface PlaceCoord {
  latitude?: number;
  longitude?: number;
}

/** 검색 결과가 DB 좌표에서 이 거리(km) 이상 떨어져 있으면 다른 장소로 간주 */
const SEARCH_MATCH_MAX_KM = 1;

/** DB(Place.naverKeywords)에 저장되는 방문자 키워드 투표 */
interface NaverKeywords {
  totalCount: number;
  details: { name: string; count: number }[];
}

/** DB(Place.naverPlace)에 저장되는 네이버 플레이스 식별자 */
interface NaverPlaceRef {
  businessId: string;
  businessType: string;
}

interface GraphqlBatchItem {
  operationName: string;
  variables: Record<string, unknown>;
  query: string;
}

export interface CrawlPlaceResult {
  placeId: string;
  operatingHours: string[][];
  studyCafeMeta?: StudyCafeMeta;
  visitorReviews: string[];
  naverPlace: NaverPlaceRef;
  naverKeywords?: NaverKeywords;
  /** 카공 관점 AI 요약 ("어바웃 AI" 리뷰 본문) */
  aiSummary?: string;
  /** 상세 첫 번째 대표 이미지 → Place.image */
  image?: string;
}

interface NaverMapInfo {
  placeName: string;
  placeId: string;
  businessId?: string;
  businessType?: string;
  operatingHours?: string[][];
  image?: string;
  graphqlBatch?: unknown[];
  studyCafeMeta?: StudyCafeMeta;
  crawledAt: Date;
}

function generateNaverMapUrl(placeName: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(placeName)}`;
}

function parseBusinessFromUrl(url: string): {
  businessId: string | null;
  businessType: string;
} {
  const match = url.match(/pcmap\.place\.naver\.com\/([a-z]+)\/(\d+)/i);
  if (!match) {
    return { businessId: null, businessType: 'restaurant' };
  }
  return { businessType: match[1], businessId: match[2] };
}

function parseGraphqlPostData(postData: string | undefined): string[] {
  if (!postData) return [];
  try {
    const parsed = JSON.parse(postData);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .map((item: { operationName?: string }) => item.operationName)
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

function buildWtmGraphqlHeader(
  businessId: string,
  businessType: string,
): string {
  return encodeBase64(
    JSON.stringify({ arg: businessId, type: businessType, source: 'place' }),
  );
}

function buildGetAnnouncementsQuery(
  businessId: string,
  businessType: string,
): GraphqlBatchItem {
  return {
    operationName: 'getAnnouncements',
    variables: { businessId, businessType, deviceType: 'pcmap' },
    query: `query getAnnouncements($businessId: String!, $businessType: String!, $deviceType: String!) {
  announcements: announcementsViaCP0(
    businessId: $businessId
    businessType: $businessType
    deviceType: $deviceType
  ) {
    feedId
    title
    url
    isNews
    __typename
  }
}`,
  };
}

function buildGetAiBriefingQuery(
  businessId: string,
  businessType: string,
): GraphqlBatchItem {
  return {
    operationName: 'getAiBriefing',
    variables: { input: { businessId, businessType } },
    query: `query getAiBriefing($input: AiBriefingInput) {
  aiBriefing(input: $input) {
    textSummaries {
      sentence
      relatedReviews {
        snippet
        userName
        __typename
      }
      __typename
    }
    relatedQueries {
      query
      __typename
    }
    __typename
  }
}`,
  };
}

/** 네이버 visitorReviews 1회 최대 개수 (100 요청 시 null 응답) */
const REVIEW_PAGE_SIZE = 50;

/** after: 이전 페이지 마지막 item의 cursor (커서 기반 페이지네이션) */
function buildGetVisitorReviewsQuery(
  businessId: string,
  businessType: string,
  after?: string,
): GraphqlBatchItem {
  return {
    operationName: 'getVisitorReviews',
    variables: {
      input: {
        businessId,
        bookingBusinessId: null,
        businessType,
        size: REVIEW_PAGE_SIZE,
        includeContent: true,
        ...(after && { after }),
      },
    },
    query: `query getVisitorReviews($input: VisitorReviewsInput) {
  visitorReviews(input: $input) {
    items {
      id
      cursor
      rating
      author {
        nickname
        __typename
      }
      body
      visitedDate
      tags
      __typename
    }
    total
    starDistribution {
      score
      count
      __typename
    }
    __typename
  }
}`,
  };
}

/** tags 필드 없는 fallback용 — tags 스키마 오류 시 재시도에 사용 */
function buildGetVisitorReviewsQueryFallback(
  businessId: string,
  businessType: string,
  after?: string,
): GraphqlBatchItem {
  return {
    operationName: 'getVisitorReviews',
    variables: {
      input: {
        businessId,
        bookingBusinessId: null,
        businessType,
        size: REVIEW_PAGE_SIZE,
        includeContent: true,
        ...(after && { after }),
      },
    },
    query: `query getVisitorReviews($input: VisitorReviewsInput) {
  visitorReviews(input: $input) {
    items {
      id
      cursor
      rating
      author {
        nickname
        __typename
      }
      body
      visitedDate
      __typename
    }
    total
    starDistribution {
      score
      count
      __typename
    }
    __typename
  }
}`,
  };
}

function buildGetVisitorReviewStatsQuery(
  businessId: string,
  businessType: string,
  itemId?: string,
): GraphqlBatchItem {
  return {
    operationName: 'getVisitorReviewStats',
    variables: {
      businessType,
      id: businessId,
      ...(itemId !== undefined && { itemId }),
    },
    query: `query getVisitorReviewStats($id: String, $itemId: String, $businessType: String = "place") {
  visitorReviewStats(
    input: { businessId: $id, itemId: $itemId, businessType: $businessType }
  ) {
    id
    name
    review {
      avgRating
      totalCount
      starDistribution {
        count
        score
        __typename
      }
      __typename
    }
    analysis {
      themes {
        label
        count
        __typename
      }
      votedKeyword {
        totalCount
        details {
          displayName
          count
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}`,
  };
}

/** GraphQL 배치 요청 body (4개 operation) */
function buildGraphqlBatchBody(
  businessId: string,
  businessType: string,
): GraphqlBatchItem[] {
  return [
    buildGetAnnouncementsQuery(businessId, businessType),   // index 0
    buildGetAiBriefingQuery(businessId, businessType),      // index 1
    buildGetVisitorReviewsQuery(businessId, businessType),  // index 2
    buildGetVisitorReviewStatsQuery(businessId, businessType), // index 3
  ];
}

const GRAPHQL_OPERATION_NAMES = [
  'getAnnouncements',
  'getAiBriefing',
  'getVisitorReviews',
  'getVisitorReviewStats',
] as const;

/** 카공 판단에 쓰는 리뷰 본문 키워드 */
const STUDY_REVIEW_PATTERN = new RegExp(
  [
    // 공부 환경
    '공부|카공|노트북|작업|콘센트|충전|조용|시끄|와이파이|책|오래|혼자',
    // 자리 여유·혼잡도 (자리 여유 = 자리 + 사람 적음)
    '좌석|자리|넓|붐비|북적|복작|혼잡|번잡|만석|꽉 ?차|웨이팅|줄 ?서|사람 ?많|사람이 많|한산|여유롭|여유 ?있|여유가 있|사람 ?없|사람이 없',
  ].join('|'),
);

/** 카공 판단에 쓰는 네이버 키워드 투표 항목 (예: 집중하기 좋아요, 좌석이 편해요) */
const STUDY_VOTED_KEYWORD_PATTERN =
  /집중|좌석|오래|넓|차분|조용|아늑|혼자|콘센트|와이파이|대화/;

/** 이보다 짧은 리뷰 본문은 판단 근거가 없어 제외 */
const MIN_REVIEW_LENGTH = 10;

const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * GPT에 넘길 카공 관련 리뷰 선별 — 카공 단어 포함, 짧은 리뷰 제외, 작성자당 1개
 * 페이지네이션 중단 기준과 extractVisitorReviews가 같은 규칙을 쓰도록 공유
 */
function selectStudyReviews(
  reviewItems: any[],
): { body: string; author?: string }[] {
  const seenAuthors = new Set<string>();
  const selected: { body: string; author?: string }[] = [];

  for (const r of reviewItems) {
    const body = typeof r?.body === 'string' ? normalizeText(r.body) : '';
    if (body.length < MIN_REVIEW_LENGTH) continue;
    if (!STUDY_REVIEW_PATTERN.test(body)) continue;

    const author: string | undefined = r.author?.nickname;
    if (author) {
      if (seenAuthors.has(author)) continue;
      seenAuthors.add(author);
    }
    selected.push({ body, author });
  }
  return selected;
}

/** 두 좌표 사이 거리(km) — 하버사인 */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * allSearch 응답의 place 목록에서 DB 좌표와 가장 가까운 장소 선택 (x=경도, y=위도)
 * 좌표가 없으면 첫 결과, 가장 가까운 곳도 SEARCH_MATCH_MAX_KM 밖이면 null
 */
function pickSearchResult(list: any[], coord?: PlaceCoord): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const lat = Number(coord?.latitude);
  const lng = Number(coord?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return list[0];

  let best: any = null;
  let bestKm = Infinity;
  for (const item of list) {
    const km = distanceKm(lat, lng, Number(item?.y), Number(item?.x));
    if (km < bestKm) {
      best = item;
      bestKm = km;
    }
  }
  return bestKm <= SEARCH_MATCH_MAX_KM ? best : null;
}

/** getVisitorReviewStats(index 3)의 키워드 투표 전체 추출 — 없으면 undefined */
function extractNaverKeywords(graphqlBatch: unknown): NaverKeywords | undefined {
  const batch = Array.isArray(graphqlBatch) ? graphqlBatch : [graphqlBatch];
  const voted = (batch[3] as any)?.data?.visitorReviewStats?.analysis
    ?.votedKeyword;
  const details = (Array.isArray(voted?.details) ? voted.details : [])
    .filter((d: any) => typeof d?.displayName === 'string')
    .map((d: any) => ({ name: d.displayName, count: Number(d.count) || 0 }));
  if (details.length === 0) return undefined;
  return { totalCount: Number(voted.totalCount) || 0, details };
}

/** "HH:mm" → 분. 형식이 아니면 null */
const toMinutes = (hhmm: unknown): number | null => {
  const m = typeof hhmm === 'string' ? hhmm.match(/^(\d{1,2}):(\d{2})$/) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** 영업 시간 길이(분). 종료가 시작보다 이르면 자정을 넘기는 영업으로 계산 */
const businessMinutes = (t: any): number | null => {
  const start = toMinutes(t?.start);
  const end = toMinutes(t?.end);
  if (start === null || end === null) return null;
  return end > start ? end - start : end + 24 * 60 - start;
};

/**
 * pcmap 상세 페이지의 window.__APOLLO_STATE__에서 영업시간 추출
 * placeDetail.newBusinessHours(오늘부터 7일간 날짜별 시간) 중 가장 긴 하루를 대표값으로 사용
 * 요일별 차이·휴무일·연휴 시간은 고려하지 않음 → [['영업시간', 'HH:mm - HH:mm']]
 * 매장 외 드라이브스루·배달 항목이 함께 오므로 '매장'을 우선 사용
 */
function extractOperatingHoursFromApollo(apollo: unknown): string[][] {
  const root = (apollo as any)?.ROOT_QUERY;
  if (!root) return [];
  const detailKey = Object.keys(root).find((k) => k.startsWith('placeDetail('));
  const entries: any[] = detailKey ? (root[detailKey]?.newBusinessHours ?? []) : [];

  const dayHours = (e: any): any[] =>
    (Array.isArray(e?.businessHours) ? e.businessHours : [])
      .map((b: any) => b?.businessHours)
      .filter((t: any) => businessMinutes(t) !== null);
  const store =
    entries.find((e) => e?.name === '매장' && dayHours(e).length > 0) ??
    entries.find((e) => dayHours(e).length > 0);
  if (!store) return [];

  const longest = dayHours(store).reduce((a, b) =>
    businessMinutes(b)! > businessMinutes(a)! ? b : a,
  );
  return [['영업시간', `${longest.start} - ${longest.end}`]];
}

class NaverMapCrawler {
  /** crawlPlacesList가 네이버 이용 제한으로 중단됐는지 */
  wasRateLimited = false;
  private db: unknown = null;
  private browser: Browser | null = null;
  private studyCafeMetaAnalyzer: StudyCafeMetaGptAnalyzer | null = null;

  private getStudyCafeMetaAnalyzer(): StudyCafeMetaGptAnalyzer | null {
    if (process.env.CRAWL_SKIP_GPT === 'true') {
      return null;
    }
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }
    if (!this.studyCafeMetaAnalyzer) {
      this.studyCafeMetaAnalyzer = new StudyCafeMetaGptAnalyzer();
    }
    return this.studyCafeMetaAnalyzer;
  }

  private async inferStudyCafeMeta(
    placeName: string,
    graphqlBatch: unknown,
  ): Promise<StudyCafeMetaResult | undefined> {
    const analyzer = this.getStudyCafeMetaAnalyzer();
    if (!analyzer) {
      console.log(
        `[${placeName}] GPT 스킵 (OPENAI_API_KEY 없음 또는 CRAWL_SKIP_GPT=true)`,
      );
      return undefined;
    }

    if (!graphqlBatch) {
      console.warn(`[${placeName}] GraphQL 배치 없음 — studyCafeMeta 스킵`);
      return undefined;
    }

    try {
      return await analyzer.analyze(graphqlBatch);
    } catch (error) {
      logger.error(`[${placeName}] studyCafeMeta GPT 분석 실패:`, error);
      return undefined;
    }
  }

  /**
   * "어바웃 AI" 리뷰 본문용 카공 요약 — 선별 리뷰·카공 키워드 투표·네이버 AI 요약 문장으로 별도 GPT 호출
   * 실패해도 크롤링 결과에는 영향 없음 (undefined → 기존 AI 리뷰 본문 유지)
   */
  private async summarizePlace(
    placeName: string,
    graphqlBatch: unknown,
  ): Promise<string | undefined> {
    const analyzer = this.getStudyCafeMetaAnalyzer();
    if (!analyzer || !graphqlBatch) return undefined;

    const batch = Array.isArray(graphqlBatch) ? graphqlBatch : [graphqlBatch];
    const briefing: string[] = (
      (batch[1] as any)?.data?.aiBriefing?.textSummaries ?? []
    )
      .map((t: any) => t?.sentence)
      .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0);
    const evidence = [
      ...this.extractVisitorReviews(graphqlBatch),
      ...(briefing.length > 0 ? [`[네이버 AI 요약] ${briefing.join(' ')}`] : []),
    ];

    try {
      return await analyzer.summarize(evidence);
    } catch (error) {
      logger.error(`[${placeName}] 카공 요약 GPT 실패:`, error);
      return undefined;
    }
  }

  /** is24Hours는 GPT 대신 추출한 영업시간(00:00 - 24:00) 기준 — 영업시간이 없으면 GPT 결과 유지 */
  private withHoursBasedMeta(
    meta: StudyCafeMeta | undefined,
    operatingHours?: string[][],
  ): StudyCafeMeta | undefined {
    const is24Hours = is24HoursFromOperatingHours(operatingHours);
    return meta && is24Hours !== undefined ? { ...meta, is24Hours } : meta;
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logSessionContext(placeName: string, ctx: SessionContext): void {
    console.log(`\n[${placeName}] ─── GraphQL 세션 데이터 ───`);
    console.log(`  businessId     : ${ctx.businessId}`);
    console.log(`  businessType   : ${ctx.businessType}`);
    console.log(`  pcmapUrl       : ${ctx.pcmapUrl}`);
    console.log(
      `  ncaptchaToken  : ${ctx.ncaptchaToken ? ctx.ncaptchaToken.slice(0, 40) + '...' : '(없음)'}`,
    );
    console.log(`  cookie length  : ${ctx.cookie.length}`);
    console.log(
      `  x-wtm-graphql    : ${buildWtmGraphqlHeader(ctx.businessId, ctx.businessType)}`,
    );
  }

  private logGraphqlPayload(
    placeName: string,
    label: string,
    body: GraphqlBatchItem[],
  ): void {
    if (!GRAPHQL_LOG_ENABLED()) return;
    console.log(`\n[${placeName}] ─── GraphQL 요청 (${label}) ───`);
    console.log(JSON.stringify(body, null, 2));
  }

  private logGraphqlResponse(
    placeName: string,
    label: string,
    data: unknown,
  ): void {
    if (!GRAPHQL_LOG_ENABLED()) return;
    console.log(`\n[${placeName}] ─── GraphQL 응답 (${label}) ───`);
    console.log(JSON.stringify(data, null, 2));
  }

  /** 배치 응답 배열을 operation별로 분리 로그 */
  private logGraphqlBatchByOperation(placeName: string, result: unknown): void {
    if (!GRAPHQL_LOG_ENABLED()) return;
    const wrapper = result as { status?: number; ok?: boolean; body?: unknown };
    const responses = Array.isArray(wrapper?.body)
      ? wrapper.body
      : Array.isArray(result)
        ? result
        : [result];

    console.log(
      `\n[${placeName}] ═══ GraphQL 배치 응답 (${responses.length}건) ═══`,
    );
    if (wrapper?.status != null) {
      console.log(`  HTTP status: ${wrapper.status}, ok: ${wrapper.ok}`);
    }

    responses.forEach((item, index) => {
      const label = GRAPHQL_OPERATION_NAMES[index] ?? `operation #${index + 1}`;
      console.log(`\n[${placeName}] ─── ${label} ───`);
      console.log(JSON.stringify(item, null, 2));
    });
  }

  /**
   * ncaptcha 토큰만 수집 (response body 읽기 금지 — res.text() 시 Puppeteer 교착 가능)
   */
  private attachGraphqlListeners(
    page: Page,
    placeName: string,
  ): {
    getNcaptchaToken: () => string;
  } {
    let ncaptchaToken = '';
    let ncaptchaLogged = false;

    const onRequest = (req: HTTPRequest) => {
      if (!req.url().includes('graphql')) return;

      const token = req.headers()['x-wtm-ncaptcha-token'];
      if (token) {
        ncaptchaToken = token;
        if (!ncaptchaLogged) {
          ncaptchaLogged = true;
          console.log(
            `[${placeName}] ncaptcha 토큰 수집: ${token.slice(0, 40)}...`,
          );
        }
      }

      // pcmap 페이지 자체 GraphQL (참고용, body는 읽지 않음)
      const ops = parseGraphqlPostData(req.postData());
      if (ops.length >= 3) {
        console.log(`[${placeName}] (페이지) GraphQL: ${ops.join(', ')}`);
      }
    };

    page.on('request', onRequest);

    return { getNcaptchaToken: () => ncaptchaToken };
  }

  private detachGraphqlListeners(page: Page): void {
    page.removeAllListeners('request');
    page.removeAllListeners('response');
  }

  private async isRateLimited(page: Page): Promise<boolean> {
    try {
      const bodyText = await page.evaluate(
        () => document.body?.innerText ?? '',
      );
      return RATE_LIMIT_PATTERNS.some((p) => bodyText.includes(p));
    } catch {
      return false;
    }
  }

  private async setupPage(page: Page): Promise<void> {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    });
  }

  private async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: CRAWL_CONFIG.headless,
      userDataDir: CRAWL_CONFIG.userDataDir,
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--lang=ko-KR',
      ],
    });
  }

  /** 가로챈 allSearch 응답에서 DB 좌표와 일치하는 장소의 businessId 추출 */
  private async pickFromSearchResponse(
    placeName: string,
    response: HTTPResponse | null,
    coord?: PlaceCoord,
  ): Promise<NaverPlaceRef | null> {
    if (!response) {
      console.warn(`[${placeName}] allSearch 응답 없음 — 검색 결과 클릭으로 진행`);
      return null;
    }
    try {
      const data: any = await response.json();
      const list: any[] = data?.result?.place?.list ?? [];
      const picked = pickSearchResult(list, coord);
      console.log(
        `[${placeName}] ③ allSearch ${list.length}건 → ${picked ? `${picked.name} (${picked.id})` : '좌표 일치 없음'}`,
      );
      if (!picked?.id) return null;
      return { businessId: String(picked.id), businessType: 'restaurant' };
    } catch (error) {
      console.warn(
        `[${placeName}] allSearch 응답 파싱 실패:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private async getBusinessIdFromApi(
    placeName: string,
  ): Promise<string | null> {
    const encodedName = encodeURIComponent(placeName);
    const searchUrl = `https://map.naver.com/p/api/search/allSearch?query=${encodedName}&type=all`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: `https://map.naver.com/p/search/${encodedName}`,
        },
      });
      const data = await response.json();
      const id = data?.result?.place?.list?.[0]?.id;
      return id != null ? String(id) : null;
    } catch (error) {
      console.error(`[${placeName}] businessId API fallback 실패:`, error);
      return null;
    }
  }

  /**
   * map 검색 → iframe → businessId → pcmap (딜레이 없음)
   * knownPlace(DB에 저장된 businessId)가 있으면 map 검색을 건너뛰고 pcmap으로 바로 이동
   */
  private async bootstrapSession(
    page: Page,
    placeName: string,
    getNcaptchaToken: () => string,
    knownPlace?: Partial<NaverPlaceRef>,
    coord?: PlaceCoord,
  ): Promise<SessionContext | null> {
    if (knownPlace?.businessId) {
      console.log(
        `[${placeName}] ① 저장된 businessId 사용: ${knownPlace.businessId} (map 검색 생략)`,
      );
      return this.openPcmapSession(
        page,
        placeName,
        getNcaptchaToken,
        knownPlace.businessId,
        knownPlace.businessType ?? 'restaurant',
      );
    }

    const naverMapUrl = generateNaverMapUrl(placeName);
    console.log(`[${placeName}] ① map 접속: ${naverMapUrl}`);

    // map 페이지가 직접 보내는 allSearch 응답을 가로챔 — 페이지 요청에는 ncaptcha 토큰이 붙어 있음
    // (Node에서 직접 호출하면 searchCoord 필수 + ncaptcha CE_EMPTY_TOKEN으로 빈 결과)
    const searchResponse = page
      .waitForResponse((res) => res.url().includes('/api/search/allSearch'), {
        timeout: 20000,
      })
      .catch(() => null);

    await page.goto(naverMapUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`[${placeName}] ② map 로드 완료`);

    if (await this.isRateLimited(page)) {
      throw new Error('RATE_LIMITED');
    }

    const searched = await this.pickFromSearchResponse(
      placeName,
      await searchResponse,
      coord,
    );
    if (searched) {
      return this.openPcmapSession(
        page,
        placeName,
        getNcaptchaToken,
        searched.businessId,
        searched.businessType,
      );
    }

    const entryIframeSelector = '#entryIframe';
    const searchIframeSelector = '#searchIframe';

    console.log(`[${placeName}] ③ iframe 대기...`);
    await page.waitForSelector(
      `${entryIframeSelector}, ${searchIframeSelector}`,
      { timeout: 30000 },
    );
    console.log(`[${placeName}] ④ iframe 감지됨`);

    try {
      const searchFrameHandle = await page.$(searchIframeSelector);
      if (searchFrameHandle) {
        const searchFrame = await searchFrameHandle.contentFrame();
        if (searchFrame) {
          console.log(`[${placeName}] ⑤ searchIframe 첫 결과 클릭...`);
          const firstResultSelector = 'li[data-laim-exp-id] a';
          await searchFrame.waitForSelector(firstResultSelector, {
            timeout: 15000,
          });
          await searchFrame.click(firstResultSelector);
          await page.waitForSelector(entryIframeSelector, {
            timeout: 15000,
          });
          console.log(`[${placeName}] ⑥ entryIframe 로드됨`);
        }
      }
    } catch (error) {
      console.warn(
        `[${placeName}] searchIframe 스킵:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    const frameHandle = await page.$(entryIframeSelector);
    const frame = frameHandle ? await frameHandle.contentFrame() : null;

    let businessId: string | null = null;
    let businessType = 'restaurant';

    if (frame) {
      console.log(`[${placeName}] ⑦ businessId 추출 중...`);
      await frame
        .waitForSelector('.place_on_pcmap', { timeout: 15000 })
        .catch(() => null);
      const parsed = parseBusinessFromUrl(frame.url());
      businessId = parsed.businessId;
      businessType = parsed.businessType;
      console.log(`[${placeName}] entryIframe URL: ${frame.url()}`);
    }

    if (!businessId) {
      console.log(`[${placeName}] ⑧ API fallback businessId 조회...`);
      businessId = await this.getBusinessIdFromApi(placeName);
      console.log(`[${placeName}] API fallback businessId: ${businessId}`);
    }

    if (!businessId) {
      return null;
    }

    return this.openPcmapSession(
      page,
      placeName,
      getNcaptchaToken,
      businessId,
      businessType,
    );
  }

  /** pcmap 상세 페이지를 열어 GraphQL 호출에 필요한 쿠키·ncaptcha 토큰 확보 */
  private async openPcmapSession(
    page: Page,
    placeName: string,
    getNcaptchaToken: () => string,
    businessId: string,
    businessType: string,
  ): Promise<SessionContext> {
    const pcmapUrl = `https://pcmap.place.naver.com/${businessType}/${businessId}/home`;
    console.log(`[${placeName}] ⑨ pcmap 이동: ${pcmapUrl}`);

    await page.goto(pcmapUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`[${placeName}] ⑩ pcmap 로드 완료`);

    const apolloState = await page
      .evaluate(() => (window as any).__APOLLO_STATE__ ?? null)
      .catch(() => null);
    const operatingHours = extractOperatingHoursFromApollo(apolloState);
    const image = extractRepresentativeImage(apolloState);

    const cookies = await page.cookies(
      'https://pcmap.place.naver.com',
      'https://map.naver.com',
      'https://naver.com',
    );
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const ncaptchaToken = getNcaptchaToken();

    const ctx: SessionContext = {
      businessId,
      businessType,
      cookie,
      ncaptchaToken,
      pcmapUrl,
      operatingHours,
      image,
    };

    this.logSessionContext(placeName, ctx);
    return ctx;
  }

  /** Node fetch — Puppeteer page.evaluate fetch는 응답 대기에서 멈추는 경우가 많아 기본 경로로 사용 */
  private async fetchGraphqlBatch(
    placeName: string,
    ctx: SessionContext,
    bodyData: GraphqlBatchItem[],
  ): Promise<unknown> {
    this.logGraphqlPayload(placeName, 'Node 배치 fetch', bodyData);

    const headers: Record<string, string> = {
      accept: '*/*',
      'content-type': 'application/json',
      referer: ctx.pcmapUrl,
      'user-agent': USER_AGENT,
      'x-wtm-graphql': buildWtmGraphqlHeader(ctx.businessId, ctx.businessType),
      cookie: ctx.cookie,
    };
    if (ctx.ncaptchaToken) {
      headers['x-wtm-ncaptcha-token'] = ctx.ncaptchaToken;
    }

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData),
      signal: AbortSignal.timeout(20_000),
    });

    const rawText = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        `GraphQL JSON 파싱 실패 (HTTP ${response.status}): ${rawText.slice(0, 300)}`,
      );
    }

    this.logGraphqlResponse(
      placeName,
      `Node fetch HTTP ${response.status}`,
      parsed,
    );
    return parsed;
  }

  /**
   * 첫 페이지 이후 리뷰를 after 커서로 이어서 수집
   * 카공 관련 리뷰가 reviewStudyTarget개 모이거나 reviewMaxPages에 도달하면 중단
   */
  private async fetchMoreVisitorReviews(
    placeName: string,
    session: SessionContext,
    firstPage: unknown,
  ): Promise<any[]> {
    const firstReviews = (firstPage as any)?.data?.visitorReviews;
    const items: any[] = [...(firstReviews?.items ?? [])];
    const total: number = firstReviews?.total ?? 0;
    const countStudy = () => selectStudyReviews(items).length;

    let lastPageSize = items.length;
    let pages = 1;

    while (
      pages < CRAWL_CONFIG.reviewMaxPages &&
      lastPageSize === REVIEW_PAGE_SIZE &&
      items.length < total &&
      countStudy() < CRAWL_CONFIG.reviewStudyTarget
    ) {
      const after = items[items.length - 1]?.cursor;
      if (!after) break;

      await this.delay(CRAWL_CONFIG.reviewPageDelayMs);
      try {
        const result = await this.fetchGraphqlBatch(placeName, session, [
          buildGetVisitorReviewsQuery(
            session.businessId,
            session.businessType,
            after,
          ),
        ]);
        const pageItems: any[] =
          (Array.isArray(result) ? result[0] : result)?.data?.visitorReviews
            ?.items ?? [];
        if (pageItems.length === 0) break;

        items.push(...pageItems);
        lastPageSize = pageItems.length;
        pages++;
      } catch (error) {
        console.warn(
          `[${placeName}] 리뷰 ${pages + 1}페이지 요청 실패 — 수집분까지만 사용:`,
          error instanceof Error ? error.message : String(error),
        );
        break;
      }
    }

    console.log(
      `[${placeName}] 방문자 리뷰 ${items.length}/${total}개 수집 (${pages}페이지, 카공 관련 ${countStudy()}개)`,
    );
    return items;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await dbConnect();
      console.log('Database connection successful');
    } catch (error) {
      logger.error('Initialization failed:', error);
      throw error;
    }
  }

  async getPlacesFromDB(): Promise<IPlace[]> {
    try {
      const places = await Place.find(
        CRAWL_CONFIG.placeName
          ? { 'location.name': CRAWL_CONFIG.placeName }
          : { studyCafeMeta: { $exists: false } },
      ).exec();
      console.log(`Fetched ${places.length} places from DB.`);
      return places;
    } catch (error) {
      logger.error('Failed to retrieve Place data:', error);
      throw error;
    }
  }

  private async extractPlaceInfoWithGraphql(
    page: Page,
    placeName: string,
    dbPlaceId: string,
    knownPlace?: Partial<NaverPlaceRef>,
    coord?: PlaceCoord,
  ): Promise<NaverMapInfo | null> {
    const { getNcaptchaToken } = this.attachGraphqlListeners(page, placeName);

    try {
      const session = await this.bootstrapSession(
        page,
        placeName,
        getNcaptchaToken,
        knownPlace,
        coord,
      );
      if (!session) {
        console.error(`[${placeName}] businessId를 찾을 수 없습니다.`);
        return null;
      }

      const bodyData = buildGraphqlBatchBody(
        session.businessId,
        session.businessType,
      );

      console.log(
        `[${placeName}] ⑪ GraphQL Node 배치 요청 (${bodyData.length} operations):`,
        bodyData.map((q) => q.operationName).join(', '),
      );

      const nodeGraphql = await this.fetchGraphqlBatch(
        placeName,
        session,
        bodyData,
      );
      console.log(`[${placeName}] ⑫ GraphQL Node 배치 완료`);
      this.logGraphqlBatchByOperation(placeName, nodeGraphql);

      const graphqlBatch: unknown[] = Array.isArray(nodeGraphql)
        ? nodeGraphql
        : [nodeGraphql];

      // visitorReviews(index 2) 에러 시 tags 없는 fallback으로 재시도
      const reviewSlot = graphqlBatch[2] as any;
      const hasReviewError =
        reviewSlot?.errors?.length > 0 ||
        reviewSlot?.data?.visitorReviews == null;

      if (hasReviewError) {
        console.warn(`[${placeName}] visitorReviews 에러 감지 — tags 없이 재시도`);
        try {
          const fallbackResult = await this.fetchGraphqlBatch(placeName, session, [
            buildGetVisitorReviewsQueryFallback(session.businessId, session.businessType),
          ]);
          const fallbackArr = Array.isArray(fallbackResult) ? fallbackResult : [fallbackResult];
          if (fallbackArr[0]) graphqlBatch[2] = fallbackArr[0];
        } catch (fallbackErr) {
          console.error(`[${placeName}] fallback도 실패:`, fallbackErr);
        }
      }

      // 페이지네이션으로 모은 리뷰 전체를 index 2에 합침 — 두 GPT 분석 모두 같은 리뷰 사용
      const visitorReviewItems = await this.fetchMoreVisitorReviews(
        placeName,
        session,
        graphqlBatch[2],
      );
      const firstReviews = (graphqlBatch[2] as any)?.data?.visitorReviews;
      if (firstReviews) firstReviews.items = visitorReviewItems;

      const { operatingHours } = session;
      console.log(
        `[${placeName}] pcmap 페이지에서 추출한 operatingHours:`,
        operatingHours,
      );

      return {
        placeName,
        placeId: dbPlaceId,
        businessId: session.businessId,
        businessType: session.businessType,
        operatingHours,
        image: session.image,
        graphqlBatch,
        crawledAt: new Date(),
      };
    } finally {
      this.detachGraphqlListeners(page);
    }
  }

  async crawlNaverMaps(): Promise<NaverMapInfo[]> {
    const naverMapInfos: NaverMapInfo[] = [];
    let successCount = 0;
    let errorCount = 0;

    const places = (await this.getPlacesFromDB()).slice(
      0,
      CRAWL_CONFIG.batchSize,
    );
    console.log(
      `이번 실행: ${places.length}건 (장소 간 대기 ${CRAWL_CONFIG.betweenPlacesMs}ms)`,
    );

    this.browser = await this.launchBrowser();

    for (const place of places) {
      let page: Page | null = null;
      try {
        const placeName = place.location.name;
        console.log(
          `\n[${successCount + errorCount + 1}/${places.length}] ${placeName}`,
        );

        page = await this.browser!.newPage();
        await this.setupPage(page);

        const placeInfo = await this.extractPlaceInfoWithGraphql(
          page,
          placeName,
          place._id?.toString() || '',
          place.naverPlace,
          place.location,
        );

        if (placeInfo?.businessId) {
          const studyCafeMeta = this.withHoursBasedMeta(
            (await this.inferStudyCafeMeta(placeName, placeInfo.graphqlBatch))
              ?.meta,
            placeInfo.operatingHours,
          );
          if (studyCafeMeta) {
            placeInfo.studyCafeMeta = studyCafeMeta;
          }

          const updateData: {
            operatingHours?: string[][];
            studyCafeMeta?: StudyCafeMeta;
            naverPlace: NaverPlaceRef;
            naverKeywords?: NaverKeywords;
            image?: string;
          } = {
            naverKeywords: extractNaverKeywords(placeInfo.graphqlBatch),
            naverPlace: {
              businessId: placeInfo.businessId,
              businessType: placeInfo.businessType ?? 'restaurant',
            },
          };
          if (studyCafeMeta) {
            updateData.studyCafeMeta = studyCafeMeta;
          }
          // 영업시간·대표 이미지를 못 찾은 경우 기존 값 유지
          if (placeInfo.operatingHours?.length) {
            updateData.operatingHours = placeInfo.operatingHours;
          }
          if (placeInfo.image) {
            updateData.image = placeInfo.image;
          }

          await Place.findByIdAndUpdate(place._id, updateData);

          console.log(
            `✅ ${placeName} - DB updated` +
              (studyCafeMeta
                ? ` (studyCafeMeta: ${JSON.stringify(studyCafeMeta)})`
                : ''),
          );
          naverMapInfos.push(placeInfo);
          successCount++;
        } else {
          logger.warning(`⚠️ ${placeName} - 크롤 실패`);
          errorCount++;
        }
      } catch (placeError) {
        const message =
          placeError instanceof Error ? placeError.message : String(placeError);
        if (message === 'RATE_LIMITED') {
          console.error('🚫 네이버 이용 제한 감지 — 중단');
          break;
        }
        errorCount++;
        logger.error(`❌ ${place.location.name}`, placeError);
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => undefined);
        }
        await this.delay(CRAWL_CONFIG.betweenPlacesMs);
      }
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log(
      `완료 - 성공: ${successCount}, 실패: ${errorCount}, 수집: ${naverMapInfos.length}`,
    );
    return naverMapInfos;
  }

  /**
   * GraphQL 배치에서 카공 판단에 필요한 텍스트만 추출
   * - getVisitorReviewStats(index 3): 카공 관련 키워드 투표 수 (전체 리뷰 기준)
   * - getVisitorReviews(index 2): 카공 단어가 포함된 리뷰 (작성자당 1개, 짧은 리뷰 제외)
   * - getAiBriefing(index 1): 카공 단어가 포함된 근거 리뷰 스니펫
   */
  private extractVisitorReviews(graphqlBatch: unknown): string[] {
    const batch = Array.isArray(graphqlBatch) ? graphqlBatch : [graphqlBatch];
    try {
      const texts: string[] = [];

      // index 3 = getVisitorReviewStats (null 방어)
      const votedKeyword = (batch[3] as any)?.data?.visitorReviewStats?.analysis
        ?.votedKeyword;
      const keywordDetails: any[] = votedKeyword?.details ?? [];
      const studyKeywords = keywordDetails
        .filter(
          (d) =>
            typeof d?.displayName === 'string' &&
            STUDY_VOTED_KEYWORD_PATTERN.test(d.displayName),
        )
        .map((d) => `${d.displayName} ${d.count ?? 0}`);
      if (studyKeywords.length > 0) {
        texts.push(
          `[카공 키워드 투표 (전체 ${votedKeyword?.totalCount ?? '?'}표 중)] ${studyKeywords.join(' / ')}`,
        );
      }

      // index 2 = getVisitorReviews
      const reviewItems: any[] =
        (batch[2] as any)?.data?.visitorReviews?.items ?? [];
      // AI 요약 스니펫 중복 판정용 — 작성자 중복으로 건너뛴 리뷰까지 포함
      const allBodies = reviewItems
        .map((r) => (typeof r.body === 'string' ? normalizeText(r.body) : ''))
        .filter(Boolean);
      const seenAuthors = new Set<string>();

      for (const { body, author } of selectStudyReviews(reviewItems)) {
        if (author) seenAuthors.add(author);
        texts.push(body);
      }

      // index 1 = getAiBriefing — 네이버 AI 요약의 근거 리뷰 중 카공 관련만
      const summaries: any[] =
        (batch[1] as any)?.data?.aiBriefing?.textSummaries ?? [];
      for (const s of summaries) {
        for (const rr of s?.relatedReviews ?? []) {
          const snippet =
            typeof rr?.snippet === 'string' ? normalizeText(rr.snippet) : '';
          if (!snippet || !STUDY_REVIEW_PATTERN.test(snippet)) continue;
          if (rr.userName && seenAuthors.has(rr.userName)) continue;
          if (allBodies.some((b) => b.includes(snippet))) continue;

          if (rr.userName) seenAuthors.add(rr.userName);
          texts.push(snippet);
        }
      }

      return texts;
    } catch {
      return [];
    }
  }

  /**
   * 외부에서 places 목록을 받아 크롤 결과만 반환 (DB 업데이트 없음).
   * NestJS PlaceService에서 호출할 때 사용.
   */
  async crawlPlacesList(
    places: Array<{
      _id: string;
      location: { name?: string } & PlaceCoord;
      naverPlace?: Partial<NaverPlaceRef>;
    }>,
    onResult?: (result: CrawlPlaceResult) => Promise<void>,
  ): Promise<CrawlPlaceResult[]> {
    const results: CrawlPlaceResult[] = [];

    this.browser = await this.launchBrowser();

    for (const place of places) {
      let page: Page | null = null;
      try {
        const placeName = place.location.name;
        if (!placeName) continue;
        page = await this.browser!.newPage();
        await this.setupPage(page);

        const placeInfo = await this.extractPlaceInfoWithGraphql(
          page,
          placeName,
          place._id,
          place.naverPlace,
          place.location,
        );

        console.log(placeInfo);
        if (!placeInfo?.businessId) continue;

        const metaResult = await this.inferStudyCafeMeta(
          placeName,
          placeInfo.graphqlBatch,
        );
        const studyCafeMeta = this.withHoursBasedMeta(
          metaResult?.meta,
          placeInfo.operatingHours,
        );
        const visitorReviews = this.extractVisitorReviews(
          placeInfo.graphqlBatch,
        );

        const result: CrawlPlaceResult = {
          placeId: place._id,
          operatingHours: placeInfo.operatingHours ?? [],
          studyCafeMeta,
          visitorReviews,
          naverKeywords: extractNaverKeywords(placeInfo.graphqlBatch),
          image: placeInfo.image,
          aiSummary: await this.summarizePlace(
            placeName,
            placeInfo.graphqlBatch,
          ),
          naverPlace: {
            businessId: placeInfo.businessId,
            businessType: placeInfo.businessType ?? 'restaurant',
          },
        };

        results.push(result);

        if (onResult) {
          await onResult(result);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'RATE_LIMITED') {
          this.wasRateLimited = true;
          break;
        }
        logger.error(`❌ ${place.location.name}`, error);
      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(() => undefined);
        }
      }
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    return results;
  }

  async cleanup(): Promise<void> {
    console.log('Cleanup process.');
  }

  async run(): Promise<NaverMapInfo[]> {
    try {
      await this.initialize();
      return await this.crawlNaverMaps();
    } catch (error) {
      logger.error('An error occurred while running the crawler:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

export class NaverMapService {
  private crawler: NaverMapCrawler;

  constructor() {
    this.crawler = new NaverMapCrawler();
  }

  async startCrawling(): Promise<NaverMapInfo[]> {
    try {
      return await this.crawler.run();
    } catch (error) {
      logger.error('Crawling service failed to run:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const crawler = new NaverMapCrawler();
  crawler
    .run()
    .then((results) => {
      console.log(`\n완료. ${results.length}건 처리`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Crawling task failed:', error);
      process.exit(1);
    });
}

export default NaverMapCrawler;
