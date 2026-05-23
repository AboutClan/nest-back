import puppeteer, { HTTPRequest } from 'puppeteer';
import dbConnect from '../Database/conn';
import { IPlace, Place } from 'src/MSA/Place/entity/place.entity';

const encodeBase64 = (str: string): string =>
    Buffer.from(str).toString('base64');

interface PlaceTarget {
    placeId: string;
    placeName: string;
}

async function getPlacesFromDB(): Promise<PlaceTarget[]> {
    await dbConnect();

    const places = await Place.find({
        'operatingHours.0': { $exists: false },
    }).exec();

    const targets: PlaceTarget[] = places.map((place: IPlace) => ({
        placeId: place._id?.toString() ?? '',
        placeName: place.location.name,
    }));

    console.log(`DB에서 ${targets.length}건 조회`);
    console.log(
        '읽어온 Place 데이터:\n',
        JSON.stringify(
            places.map((p) => ({
                _id: p._id?.toString(),
                placeName: p.location.name,
                address: p.location.address,
                status: p.status,
                operatingHours: p.operatingHours,
            })),
            null,
            2,
        ),
    );

    return targets;
}

interface SessionContext {
    businessId: string;
    businessType: string;
    cookie: string;
    ncaptchaToken: string;
}

// cafe.ts와 동일한 검색 URL
function generateNaverMapUrl(placeName: string): string {
    return `https://map.naver.com/p/search/${encodeURIComponent(placeName)}`;
}

function parseBusinessFromUrl(url: string): {
    businessId: string | null;
    businessType: string;
} {
    const match = url.match(
        /pcmap\.place\.naver\.com\/([a-z]+)\/(\d+)/i,
    );
    if (!match) {
        return { businessId: null, businessType: 'restaurant' };
    }
    return { businessType: match[1], businessId: match[2] };
}

// 1단계: 상호명으로 businessId 검색 (API fallback)
async function getBusinessIdFromApi(placeName: string): Promise<string | null> {
    const encodedName = encodeURIComponent(placeName);
    const searchUrl = `https://map.naver.com/p/api/search/allSearch?query=${encodedName}&type=all`;

    const headers = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: `https://map.naver.com/p/search/${encodedName}`,
    };

    try {
        const response = await fetch(searchUrl, { headers });
        const data = await response.json();
        const placeList = data?.result?.place?.list;
        if (placeList?.length > 0) {
            return String(placeList[0].id);
        }
        return null;
    } catch (error) {
        console.error(`[${placeName}] ID 검색 API 에러:`, error);
        return null;
    }
}

// cafe.ts iframe 흐름 + 쿠키·ncaptcha·businessId 수집
async function bootstrapSession(placeName: string): Promise<SessionContext | null> {
    const naverMapUrl = generateNaverMapUrl(placeName);
    let ncaptchaToken = '';

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        const captureNcaptcha = (req: HTTPRequest) => {
            const token = req.headers()['x-wtm-ncaptcha-token'];
            if (token && req.url().includes('graphql')) {
                ncaptchaToken = token;
            }
        };
        page.on('request', captureNcaptcha);

        await page.goto(naverMapUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

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
                `[${placeName}] searchIframe 스킵: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        const frameHandle = await page.$(entryIframeSelector);
        const frame = frameHandle
            ? await frameHandle.contentFrame()
            : null;

        await frame?.waitForSelector('.place_on_pcmap', { timeout: 10000 });

        let businessId: string | null = null;
        let businessType = 'restaurant';

        if (frame) {
            const parsed = parseBusinessFromUrl(frame.url());
            businessId = parsed.businessId;
            businessType = parsed.businessType;
        }

        if (!businessId) {
            businessId = await getBusinessIdFromApi(placeName);
        }

        if (!businessId) {
            return null;
        }

        // pcmap 상세 페이지 방문 → graphql 요청·쿠키 확보
        const pcmapUrl = `https://pcmap.place.naver.com/${businessType}/${businessId}/home`;
        await page.goto(pcmapUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        const graphqlResult = await page.evaluate(async (businessId, businessType, ncaptchaToken) => {
            // 이 내부는 브라우저 환경이므로 btoa 사용 가능
            const wtmPayload = JSON.stringify({ arg: businessId, type: businessType, source: 'place' });
            const dynamicWtmGraphql = btoa(wtmPayload);

            const headers: Record<string, string> = {
                'content-type': 'application/json',
                'x-wtm-graphql': dynamicWtmGraphql,
            };
            if (ncaptchaToken) headers['x-wtm-ncaptcha-token'] = ncaptchaToken;
            // 쿠키, referer 등은 브라우저가 알아서 완벽하게 자동으로 붙여줍니다!

            const bodyData = [{
                operationName: 'getAnnouncements',
                variables: { businessId, businessType, deviceType: 'pcmap' },
                query: `query getAnnouncements($businessId: String!, $businessType: String!, $deviceType: String!) { announcements: announcementsViaCP0(businessId: $businessId, businessType: $businessType, deviceType: $deviceType) { feedId title __typename } }`
            }];

            const response = await fetch('https://pcmap-api.place.naver.com/graphql', {
                method: 'POST',
                headers,
                body: JSON.stringify(bodyData)
            });

            return await response.json();
        }, businessId, businessType, ncaptchaToken);

        console.log("브라우저 내 Fetch 결과:", graphqlResult);

        // await new Promise((r) => setTimeout(r, 2000));

        // const cookies = await page.cookies(
        //     'https://pcmap.place.naver.com',
        //     'https://map.naver.com',
        //     'https://naver.com',
        // );
        // const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

        // if (!ncaptchaToken) {
        //     console.warn(
        //         `[${placeName}] x-wtm-ncaptcha-token 미수집 — GraphQL이 실패할 수 있습니다.`,
        //     );
        // }

        // return {
        //     businessId,
        //     businessType,
        //     cookie,
        //     ncaptchaToken,
        // };
    } finally {
        await browser.close();
    }
}

// 2단계: GraphQL 배치 요청
async function crawlNaverPlaceBatch(ctx: SessionContext) {
    const { businessId, businessType, cookie, ncaptchaToken } = ctx;
    const url = 'https://pcmap-api.place.naver.com/graphql';

    const wtmPayload = JSON.stringify({
        arg: businessId,
        type: businessType,
        source: 'place',
    });
    const dynamicWtmGraphql = encodeBase64(wtmPayload);

    const headers: Record<string, string> = {
        accept: '*/*',
        'content-type': 'application/json',
        referer: `https://pcmap.place.naver.com/${businessType}/${businessId}/home`,
        'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-wtm-graphql': dynamicWtmGraphql,
        cookie,
    };

    if (ncaptchaToken) {
        headers['x-wtm-ncaptcha-token'] = ncaptchaToken;
    }

    const bodyData = [
        {
            operationName: 'getAnnouncements',
            variables: {
                businessId,
                businessType,
                deviceType: 'pcmap',
            },
            query: `query getAnnouncements($businessId: String!, $businessType: String!, $deviceType: String!) {
        announcements: announcementsViaCP0(
          businessId: $businessId
          businessType: $businessType
          deviceType: $deviceType
        ) {
          feedId
          title
          __typename
        }
      }`,
        },
    ];

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    const rawText = await response.text();
    console.log(`[Raw Response] ${rawText.slice(0, 500)}`); // 응답 앞부분 출력

    try {
        return JSON.parse(rawText);
    } catch (e) {
        throw new Error("JSON 파싱 실패. 네이버가 HTML(캡차)을 반환했을 수 있습니다.");
    }
}

async function processPlaces(targets: PlaceTarget[]) {
    for (const { placeId, placeName } of targets) {
        console.log(
            `\n🔍 [placeId: ${placeId}] [placeName: ${placeName}] 탐색 시작...`,
        );

        const session = await bootstrapSession(placeName);
        if (!session) {
            console.log(`❌ [${placeName}] businessId를 찾을 수 없습니다.`);
            continue;
        }

        console.log(`✅ businessId: ${session.businessId}`);
        console.log(`   businessType: ${session.businessType}`);
        console.log(`   cookie length: ${session.cookie.length}`);
        console.log(
            `   ncaptcha: ${session.ncaptchaToken ? '수집됨' : '없음'}`,
        );

        try {
            const result = await crawlNaverPlaceBatch(session);
            const count = result[0]?.data?.announcements?.length ?? 0;
            console.log(
                `🎉 [${placeName}] GraphQL 성공 (공지사항: ${count}건)`,
            );
            console.log(
                'GraphQL 응답:\n',
                JSON.stringify(result, null, 2),
            );
        } catch (error) {
            console.error(
                `❌ [${placeName}] GraphQL 실패:`,
                error instanceof Error ? error.message : error,
            );
        }

        await new Promise((r) => setTimeout(r, 3000));
    }
}

async function main() {
    const targets = await getPlacesFromDB();

    if (targets.length === 0) {
        console.log('처리할 Place가 없습니다.');
        return;
    }

    await processPlaces(targets);
    console.log('\n크롤링 작업 완료');
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('실행 실패:', err);
        process.exit(1);
    });
