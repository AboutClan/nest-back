import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, HTTPRequest, HTTPResponse, Page } from 'puppeteer';
import * as path from 'path';
import dbConnect from '../Database/conn';
import { logger } from '../logger';
import { IPlace, Place } from 'src/MSA/Place/entity/place.entity';

puppeteer.use(StealthPlugin());

const GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql';

const CRAWL_CONFIG = {
    headless: process.env.CRAWL_HEADLESS === 'true',
    batchSize: Number(process.env.CRAWL_BATCH_SIZE) || 100,
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

const encodeBase64 = (str: string): string => Buffer.from(str).toString('base64');

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

interface NaverMapInfo {
    placeName: string;
    placeId: string;
    address: string | null;
    businessId?: string;
    businessType?: string;
    imageUrl?: string;
    operatingHours?: string[][];
    graphqlResponses?: unknown[];
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

function buildWtmGraphqlHeader(businessId: string, businessType: string): string {
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
                size: 3,
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

/** GraphQL 배치 요청 body (5개 operation) */
function buildGraphqlBatchBody(
    businessId: string,
    businessType: string,
): GraphqlBatchItem[] {
    return [
        buildGetAnnouncementsQuery(businessId, businessType),
        buildGetAiBriefingQuery(businessId, businessType),
        buildGetVisitorReviewsQuery(businessId, businessType),
        buildGetVisitorReviewStatsQuery(businessId, businessType, '0'),
        buildGetVisitorReviewStatsQuery(businessId, businessType),
    ];
}

const GRAPHQL_OPERATION_NAMES = [
    'getAnnouncements',
    'getAiBriefing',
    'getVisitorReviews',
    'getVisitorReviewStats (item)',
    'getVisitorReviewStats (total)',
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
    private capturedGraphqlResponses: unknown[] = [];

    private delay(ms: number): Promise<void> {
        if (ms <= 0) return Promise.resolve();
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private logSessionContext(placeName: string, ctx: SessionContext): void {
        console.log(`\n[${placeName}] ─── GraphQL 세션 데이터 ───`);
        console.log(`  businessId     : ${ctx.businessId}`);
        console.log(`  businessType   : ${ctx.businessType}`);
        console.log(`  pcmapUrl       : ${ctx.pcmapUrl}`);
        console.log(`  ncaptchaToken  : ${ctx.ncaptchaToken ? ctx.ncaptchaToken.slice(0, 40) + '...' : '(없음)'}`);
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

    private logGraphqlResponse(placeName: string, label: string, data: unknown): void {
        console.log(`\n[${placeName}] ─── GraphQL 응답 (${label}) ───`);
        console.log(JSON.stringify(data, null, 2));
    }

    /** 배치 응답 배열을 operation별로 분리 로그 */
    private logGraphqlBatchByOperation(
        placeName: string,
        result: unknown,
    ): void {
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
            const label =
                GRAPHQL_OPERATION_NAMES[index] ??
                `operation #${index + 1}`;
            console.log(`\n[${placeName}] ─── ${label} ───`);
            console.log(JSON.stringify(item, null, 2));
        });
    }

    private attachGraphqlListeners(page: Page, placeName: string): {
        getNcaptchaToken: () => string;
    } {
        let ncaptchaToken = '';
        this.capturedGraphqlResponses = [];

        const onRequest = (req: HTTPRequest) => {
            const token = req.headers()['x-wtm-ncaptcha-token'];
            if (token && req.url().includes('graphql')) {
                ncaptchaToken = token;
                console.log(
                    `[${placeName}] ncaptcha 토큰 수집 (요청): ${token.slice(0, 40)}...`,
                );
            }
        };

        const onResponse = async (res: HTTPResponse) => {
            if (!res.url().includes('graphql')) return;
            try {
                const text = await res.text();
                const parsed = JSON.parse(text);
                this.capturedGraphqlResponses.push(parsed);
                this.logGraphqlResponse(
                    placeName,
                    `자동 캡처 ${this.capturedGraphqlResponses.length}`,
                    parsed,
                );
            } catch {
                // non-json
            }
        };

        page.on('request', onRequest);
        page.on('response', onResponse);

        return { getNcaptchaToken: () => ncaptchaToken };
    }

    private detachGraphqlListeners(page: Page): void {
        page.removeAllListeners('request');
        page.removeAllListeners('response');
    }

    private async isRateLimited(page: Page): Promise<boolean> {
        try {
            const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
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

    private async getBusinessIdFromApi(placeName: string): Promise<string | null> {
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
        console.log(`[${placeName}] 접속: ${naverMapUrl}`);

        await page.goto(naverMapUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        if (await this.isRateLimited(page)) {
            throw new Error('RATE_LIMITED');
        }

        const entryIframeSelector = '#entryIframe';
        const searchIframeSelector = '#searchIframe';

        await page.waitForSelector(
            `${entryIframeSelector}, ${searchIframeSelector}`,
            { timeout: 30000 },
        );

        try {
            const searchFrameHandle = await page.$(searchIframeSelector);
            if (searchFrameHandle) {
                const searchFrame = await searchFrameHandle.contentFrame();
                if (searchFrame) {
                    const firstResultSelector = 'li[data-laim-exp-id] a';
                    await searchFrame.waitForSelector(firstResultSelector, {
                        timeout: 5000,
                    });
                    await searchFrame.click(firstResultSelector);
                    await page.waitForSelector(entryIframeSelector, {
                        timeout: 10000,
                    });
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
            await frame.waitForSelector('.place_on_pcmap', { timeout: 10000 }).catch(() => null);
            const parsed = parseBusinessFromUrl(frame.url());
            businessId = parsed.businessId;
            businessType = parsed.businessType;
            console.log(`[${placeName}] entryIframe URL: ${frame.url()}`);
        }

        if (!businessId) {
            businessId = await this.getBusinessIdFromApi(placeName);
            console.log(`[${placeName}] API fallback businessId: ${businessId}`);
        }

        if (!businessId) {
            return null;
        }

        const pcmapUrl = `https://pcmap.place.naver.com/${businessType}/${businessId}/home`;
        console.log(`[${placeName}] pcmap 즉시 이동: ${pcmapUrl}`);

        await page.goto(pcmapUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

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

    /** 브라우저 컨텍스트에서 GraphQL POST (test.ts page.evaluate 방식) */
    private async fetchGraphqlInBrowser(
        page: Page,
        placeName: string,
        ctx: SessionContext,
        bodyData: GraphqlBatchItem[],
    ): Promise<unknown> {
        this.logGraphqlPayload(placeName, '배치 fetch (5 operations)', bodyData);

        const result = await page.evaluate(
            async (url, body, businessId, businessType, ncaptchaToken) => {
                const wtmPayload = JSON.stringify({
                    arg: businessId,
                    type: businessType,
                    source: 'place',
                });
                const dynamicWtmGraphql = btoa(wtmPayload);

                const headers: Record<string, string> = {
                    'content-type': 'application/json',
                    'x-wtm-graphql': dynamicWtmGraphql,
                };
                if (ncaptchaToken) {
                    headers['x-wtm-ncaptcha-token'] = ncaptchaToken;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                });

                const text = await response.text();
                return {
                    status: response.status,
                    ok: response.ok,
                    body: JSON.parse(text),
                };
            },
            GRAPHQL_URL,
            bodyData,
            ctx.businessId,
            ctx.businessType,
            ctx.ncaptchaToken,
        );

        this.logGraphqlResponse(placeName, '배치 fetch 원본', result);
        return result;
    }

    /** Node fetch (test.ts crawlNaverPlaceBatch) — 쿠키·토큰 로그 후 호출 */
    private async fetchGraphqlBatch(
        placeName: string,
        ctx: SessionContext,
        bodyData: GraphqlBatchItem[],
    ): Promise<unknown> {
        this.logGraphqlPayload(placeName, 'Node fetch', bodyData);

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

        this.logGraphqlResponse(placeName, `Node fetch HTTP ${response.status}`, parsed);
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
                'operatingHours.0': { $exists: false },
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
            const session = await this.bootstrapSession(page, placeName, getNcaptchaToken);
            if (!session) {
                console.error(`[${placeName}] businessId를 찾을 수 없습니다.`);
                return null;
            }

            const bodyData = buildGraphqlBatchBody(
                session.businessId,
                session.businessType,
            );

            console.log(
                `[${placeName}] GraphQL 배치 요청 (${bodyData.length} operations):`,
                bodyData.map((q) => q.operationName).join(', '),
            );

            // pcmap 세션 확보 직후 배치 전체 요청 (딜레이 없음)
            const browserGraphql = await this.fetchGraphqlInBrowser(
                page,
                placeName,
                session,
                bodyData,
            );
            this.logGraphqlBatchByOperation(placeName, browserGraphql);

            let nodeGraphql: unknown;
            try {
                nodeGraphql = await this.fetchGraphqlBatch(
                    placeName,
                    session,
                    bodyData,
                );
                this.logGraphqlBatchByOperation(placeName, nodeGraphql);
            } catch (error) {
                console.warn(
                    `[${placeName}] Node GraphQL 배치 실패 (브라우저 결과 사용):`,
                    error instanceof Error ? error.message : error,
                );
            }

            const batchBody =
                (browserGraphql as { body?: unknown })?.body ?? browserGraphql;

            const allResponses = [
                ...this.capturedGraphqlResponses,
                ...(Array.isArray(batchBody) ? batchBody : [batchBody]),
                ...(nodeGraphql
                    ? [
                          (nodeGraphql as { body?: unknown })?.body ??
                              nodeGraphql,
                      ]
                    : []),
            ];

            let operatingHours: string[][] = [];
            for (const res of allResponses) {
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
                address: null,
                businessId: session.businessId,
                businessType: session.businessType,
                operatingHours,
                graphqlResponses: allResponses,
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

        const places = (await this.getPlacesFromDB()).slice(0, CRAWL_CONFIG.batchSize);
        console.log(`이번 실행: ${places.length}건 (장소 간 대기 ${CRAWL_CONFIG.betweenPlacesMs}ms)`);

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
                    const updateData = {
                        operatingHours: placeInfo.operatingHours ?? [],
                    };
                    await Place.findByIdAndUpdate(place._id, updateData);

                    if ((placeInfo.operatingHours?.length ?? 0) > 0) {
                        console.log(`✅ ${placeName} - DB updated`);
                        naverMapInfos.push(placeInfo);
                        successCount++;
                    } else {
                        logger.warning(`⚠️ ${placeName} - GraphQL에 영업시간 없음`);
                        naverMapInfos.push(placeInfo);
                        successCount++;
                    }
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
