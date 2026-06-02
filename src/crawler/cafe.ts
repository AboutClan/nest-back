import * as path from 'path';
import { Browser, HTTPRequest, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IPlace, Place } from 'src/MSA/Place/entity/place.entity';
import dbConnect from '../Database/conn';
import { logger } from '../logger';
import {
  StudyCafeMeta,
  StudyCafeMetaGptAnalyzer
} from './studyCafeMeta/studyCafeMetaGpt';

puppeteer.use(StealthPlugin());

const GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql';

const CRAWL_CONFIG = {
  headless: process.env.CRAWL_HEADLESS === 'true',
  batchSize: Number(process.env.CRAWL_BATCH_SIZE) || 1000,
  /** 장소 간 대기 (ms). 크롤링 본문에는 딜레이 없음 */
  betweenPlacesMs: Number(process.env.CRAWL_BETWEEN_PLACES_MS) || 0,
  userDataDir:
    process.env.CRAWL_USER_DATA_DIR ||
    path.join(process.cwd(), '.naver-crawl-profile'),
};

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
}

interface NaverMapInfo {
  placeName: string;
  placeId: string;
  businessId?: string;
  businessType?: string;
  operatingHours?: string[][];
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

function buildGetVisitorReviewsQuery(
  businessId: string,
  businessType: string,
): GraphqlBatchItem {
  return {
    operationName: 'getVisitorReviews',
    variables: {
      input: {
        businessId,
        bookingBusinessId: null,
        businessType,
        size: 50,
        includeContent: true,
      },
    },
    query: `query getVisitorReviews($input: VisitorReviewsInput) {
  visitorReviews(input: $input) {
    items {
      id
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
): GraphqlBatchItem {
  return {
    operationName: 'getVisitorReviews',
    variables: {
      input: {
        businessId,
        bookingBusinessId: null,
        businessType,
        size: 50,
        includeContent: true,
      },
    },
    query: `query getVisitorReviews($input: VisitorReviewsInput) {
  visitorReviews(input: $input) {
    items {
      id
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

/** GraphQL 응답 JSON에서 영업시간 형태 배열 탐색 */
function extractOperatingHoursFromGraphql(data: unknown): string[][] {
  const results: string[][] = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const obj = node as Record<string, unknown>;

    for (const key of [
      'businessHours',
      'operatingHours',
      'bizHours',
      'openingHours',
      'schedule',
    ]) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0) {
        const parsed = parseHoursArray(val);
        if (parsed.length > 0) {
          results.push(...parsed);
        }
      }
    }

    Object.values(obj).forEach(walk);
  };

  walk(data);
  return results;
}

function parseHoursArray(val: unknown[]): string[][] {
  const rows: string[][] = [];
  for (const item of val) {
    if (Array.isArray(item)) {
      const texts = item
        .map((v) => (typeof v === 'string' ? v : String(v ?? '')))
        .filter(Boolean);
      if (texts.length >= 2) rows.push(texts);
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const day =
        (o.day as string) ??
        (o.weekday as string) ??
        (o.dayName as string) ??
        '';
      const time =
        (o.businessHours as string) ??
        (o.hours as string) ??
        (o.time as string) ??
        (o.description as string) ??
        '';
      if (day && time) rows.push([day, time]);
    }
  }
  return rows;
}

class NaverMapCrawler {
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
  ): Promise<StudyCafeMeta | undefined> {
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
    console.log(`\n[${placeName}] ─── GraphQL 요청 (${label}) ───`);
    console.log(JSON.stringify(body, null, 2));
  }

  private logGraphqlResponse(
    placeName: string,
    label: string,
    data: unknown,
  ): void {
    console.log(`\n[${placeName}] ─── GraphQL 응답 (${label}) ───`);
    console.log(JSON.stringify(data, null, 2));
  }

  /** 배치 응답 배열을 operation별로 분리 로그 */
  private logGraphqlBatchByOperation(placeName: string, result: unknown): void {
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

  /** test.ts와 동일: map 검색 → iframe → businessId → pcmap (딜레이 없음) */
  private async bootstrapSession(
    page: Page,
    placeName: string,
    getNcaptchaToken: () => string,
  ): Promise<SessionContext | null> {
    const naverMapUrl = generateNaverMapUrl(placeName);
    console.log(`[${placeName}] ① map 접속: ${naverMapUrl}`);

    await page.goto(naverMapUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`[${placeName}] ② map 로드 완료`);

    if (await this.isRateLimited(page)) {
      throw new Error('RATE_LIMITED');
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

    const pcmapUrl = `https://pcmap.place.naver.com/${businessType}/${businessId}/home`;
    console.log(`[${placeName}] ⑨ pcmap 이동: ${pcmapUrl}`);

    await page.goto(pcmapUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`[${placeName}] ⑩ pcmap 로드 완료`);

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
      const places = await Place.find({
        studyCafeMeta: { $exists: false },
      }).exec();
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
  ): Promise<NaverMapInfo | null> {
    const { getNcaptchaToken } = this.attachGraphqlListeners(page, placeName);

    try {
      const session = await this.bootstrapSession(
        page,
        placeName,
        getNcaptchaToken,
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

      let operatingHours: string[][] = [];
      for (const res of graphqlBatch) {
        const found = extractOperatingHoursFromGraphql(res);
        if (found.length > 0) {
          operatingHours = found;
          break;
        }
      }

      console.log(
        `[${placeName}] GraphQL에서 추출한 operatingHours:`,
        operatingHours,
      );

      return {
        placeName,
        placeId: dbPlaceId,
        businessId: session.businessId,
        businessType: session.businessType,
        operatingHours,
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
        );

        if (placeInfo?.businessId) {
          const studyCafeMeta = await this.inferStudyCafeMeta(
            placeName,
            placeInfo.graphqlBatch,
          );
          if (studyCafeMeta) {
            placeInfo.studyCafeMeta = studyCafeMeta;
          }

          const updateData: {
            operatingHours: string[][];
            studyCafeMeta?: StudyCafeMeta;
          } = {
            operatingHours: placeInfo.operatingHours ?? [],
          };
          if (studyCafeMeta) {
            updateData.studyCafeMeta = studyCafeMeta;
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

  /** GraphQL 배치에서 방문자 리뷰 텍스트 + 태그 추출 (getVisitorReviews = index 2) */
  private extractVisitorReviews(graphqlBatch: unknown): string[] {
    const batch = Array.isArray(graphqlBatch) ? graphqlBatch : [graphqlBatch];
    try {
      // index 2 = getVisitorReviews
      const reviewItems: any[] =
        (batch[2] as any)?.data?.visitorReviews?.items ?? [];

      const texts: string[] = [];

      for (const r of reviewItems) {
        if (typeof r.body === 'string' && r.body.length > 0) {
          texts.push(r.body);
        }
        // tags는 string[] — 객체 배열이 아님
        const tags: string[] = Array.isArray(r.tags)
          ? r.tags.filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
          : [];
        if (tags.length > 0) {
          texts.push(`[태그: ${tags.join(', ')}]`);
        }
      }

      // index 3 = getVisitorReviewStats (null 방어)
      const stats = (batch[3] as any)?.data?.visitorReviewStats;
      if (stats?.analysis?.votedKeyword?.details) {
        const keywords: string[] = (stats.analysis.votedKeyword.details as any[])
          .map((d: any) => d.displayName)
          .filter((d: unknown): d is string => typeof d === 'string' && d.length > 0);
        if (keywords.length > 0) {
          texts.push(`[키워드: ${keywords.join(', ')}]`);
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
    places: Array<{ _id: string; location: { name?: string } }>,
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
        );

        console.log(placeInfo);
        if (!placeInfo?.businessId) continue;

        const studyCafeMeta = await this.inferStudyCafeMeta(
          placeName,
          placeInfo.graphqlBatch,
        );
        const visitorReviews = this.extractVisitorReviews(
          placeInfo.graphqlBatch,
        );

        const result: CrawlPlaceResult = {
          placeId: place._id,
          operatingHours: placeInfo.operatingHours ?? [],
          studyCafeMeta,
          visitorReviews,
        };

        results.push(result);

        if (onResult) {
          await onResult(result);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'RATE_LIMITED') break;
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
