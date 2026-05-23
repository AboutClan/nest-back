import puppeteer, { Browser, ElementHandle, Frame, Page } from 'puppeteer';
import * as readline from 'readline';

const TIMEOUT = 10000;

export interface RestaurantResult {
    place_id: string | null;
    name: string;
    category: string;
    origin_address: string | null;
    page?: number;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--safebrowsing-disable-auto-update',
    '--ignore-certificate-errors',
    '--ignore-ssl-errors',
    '--ignore-certificate-errors-spki-list',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    '--start-maximized',
];

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

const EXTRA_HTTP_HEADERS: Record<string, string> = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Upgrade-Insecure-Requests': '1',
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class NaverMapRestaurantCrawler {
    constructor(private readonly headless: boolean = true) {}

    private async setupPage(page: Page): Promise<void> {
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.setUserAgent(USER_AGENT);
        await page.setExtraHTTPHeaders(EXTRA_HTTP_HEADERS);

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const url = req.url();
            if (
                resourceType === 'image' ||
                /\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/i.test(url)
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    private async performSearch(page: Page, searchQuery: string): Promise<void> {
        await page.goto('https://httpbin.org/ip', {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT,
        });
        await page.goto('https://map.naver.com/', {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT,
        });

        const searchInput = await page.waitForSelector('input.input_search', {
            visible: true,
            timeout: TIMEOUT,
        });
        if (!searchInput) {
            throw new Error('검색 입력창을 찾을 수 없습니다.');
        }

        await searchInput.click({ clickCount: 3 });
        await searchInput.type(searchQuery, { delay: 50 });
        await page.keyboard.press('Enter');

        await page.waitForSelector('iframe#searchIframe', {
            visible: true,
            timeout: TIMEOUT,
        });
    }

    private async getSearchFrame(page: Page): Promise<Frame | null> {
        const iframeElement = await page.$('iframe#searchIframe');
        if (!iframeElement) {
            return null;
        }
        return iframeElement.contentFrame();
    }

    private async scrollToLoadAll(frame: Frame): Promise<void> {
        let previousCount = 0;
        let noChangeCount = 0;
        const maxNoChange = 3;

        while (true) {
            const currentRestaurants = await frame.$$('li.UEzoS');
            const currentCount = currentRestaurants.length;

            if (currentCount === previousCount) {
                noChangeCount += 1;
                if (noChangeCount >= maxNoChange) {
                    console.log('더 이상 로드할 데이터가 없습니다.');
                    break;
                }
            } else {
                noChangeCount = 0;
            }

            previousCount = currentCount;

            await frame.evaluate(() => {
                const scrollContainer =
                    document.querySelector('.Ryr1F') ||
                    document.querySelector('[role="main"]') ||
                    document.body;

                if (scrollContainer instanceof HTMLElement) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                } else {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            });

            await delay(2000);
        }
    }

    private async extractBasicInfo(
        restaurant: ElementHandle<Element>,
    ): Promise<{ name: string; category: string }> {
        const name = await restaurant.$eval('span.TYaxT', (el) =>
            el.textContent?.trim(),
        ).catch(() => '이름 없음');

        const category = await restaurant.$eval('span.KCMnt', (el) =>
            el.textContent?.trim(),
        ).catch(() => '');

        return { name: name || '이름 없음', category: category || '' };
    }

    private async extractPlaceId(
        restaurant: ElementHandle<Element>,
        page: Page,
    ): Promise<string | null> {
        const linkElem = await restaurant.$('a.place_bluelink');
        if (!linkElem) {
            return null;
        }

        await linkElem.click();
        await page.waitForFunction(
            () => window.location.href.includes('/place/'),
            { timeout: TIMEOUT },
        );

        const match = page.url().match(/\/place\/(\d+)/);
        return match ? match[1] : null;
    }

    private async extractAddressInfo(
        placeId: string,
        browser: Browser,
    ): Promise<string | null> {
        const placeDetailUrl = `https://pcmap.place.naver.com/place/${placeId}`;
        const detailPage = await browser.newPage();

        try {
            await this.setupPage(detailPage);
            await detailPage.goto(placeDetailUrl, {
                waitUntil: 'domcontentloaded',
                timeout: TIMEOUT,
            });
            await detailPage.waitForSelector('span.LDgIH', { timeout: TIMEOUT });
            const address = await detailPage.$eval('span.LDgIH', (el) =>
                el.textContent?.trim(),
            );
            return address || null;
        } finally {
            await detailPage.close();
        }
    }

    private async extractRestaurantData(
        restaurants: ElementHandle<Element>[],
        page: Page,
        browser: Browser,
    ): Promise<RestaurantResult[]> {
        const results: RestaurantResult[] = [];

        for (const restaurant of restaurants) {
            const { name, category } = await this.extractBasicInfo(restaurant);
            const place_id = await this.extractPlaceId(restaurant, page);

            let origin_address: string | null = null;
            if (place_id) {
                origin_address = await this.extractAddressInfo(place_id, browser);
            }

            results.push({
                place_id,
                name,
                category,
                origin_address,
            });

            await page.goBack({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await page.waitForSelector('iframe#searchIframe', {
                visible: true,
                timeout: TIMEOUT,
            });
        }

        return results;
    }

    async crawlSinglePage(searchQuery: string): Promise<RestaurantResult[]> {
        const browser = await puppeteer.launch({
            headless: this.headless,
            args: LAUNCH_ARGS,
            defaultViewport: null,
        });

        let results: RestaurantResult[] = [];

        try {
            const page = await browser.newPage();
            await this.setupPage(page);

            await this.performSearch(page, searchQuery);

            const frame = await this.getSearchFrame(page);
            if (!frame) {
                return results;
            }

            await this.scrollToLoadAll(frame);
            await frame.waitForSelector('li.UEzoS', {
                visible: true,
                timeout: TIMEOUT,
            });

            const restaurants = await frame.$$('li.UEzoS');
            results = await this.extractRestaurantData(restaurants, page, browser);

            console.log(`${restaurants.length}개 수집`);
        } catch (error) {
            console.error(
                `크롤링 중 오류: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            await browser.close();
        }

        return results;
    }
}

export function mergeAndDedupeResults(
    allResults: RestaurantResult[][],
    existingPlaceIds: Set<string>,
): RestaurantResult[] {
    const merged = allResults.flat();
    return merged.filter(
        (item) => item.place_id && !existingPlaceIds.has(item.place_id),
    );
}

export function printResultsSummary(results: RestaurantResult[]): void {
    console.log(`\n총 ${results.length}개 신규 식당 수집`);
    results.forEach((restaurant, i) => {
        console.log(
            `${i + 1}. ${restaurant.place_id} [${restaurant.name}] ` +
                `[${restaurant.category}] [${restaurant.page ?? ''}] ` +
                `[origin_address: ${restaurant.origin_address}] ` +
                `[address: ${restaurant.address ?? ''}] ` +
                `[latitude: ${restaurant.latitude}, longitude: ${restaurant.longitude}]`,
        );
    });
}

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main(): Promise<void> {
    try {
        const searchQuery = await prompt(
            '식당 크롤링 할 위치를 입력하세요 (공덕역 식당 등등...) : ',
        );
        console.log(`search_query: ${searchQuery}`);

        const crawler = new NaverMapRestaurantCrawler(false);
        const allResults = await crawler.crawlSinglePage(searchQuery);

        printResultsSummary(allResults);
    } catch (error) {
        console.error(
            `프로그램 실행 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export default NaverMapRestaurantCrawler;
