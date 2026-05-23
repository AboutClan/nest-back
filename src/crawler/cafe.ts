import puppeteer, { Browser, Frame, Page } from 'puppeteer';
import dbConnect from '../Database/conn';
import { logger } from '../logger';
import { IPlace, Place } from 'src/MSA/Place/entity/place.entity';

interface NaverMapInfo {
    placeName: string;
    placeId: string;
    address: string | null;
    phone?: string;
    category?: string;
    rating?: number;
    reviewCount?: number;
    imageUrl?: string;
    operatingHours?: string[][];
    crawledAt: Date;
}

class NaverMapCrawler {
    private db: unknown = null;
    private browser: Browser | null = null;

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

    /** map.naver.com 검색창 → searchIframe 방식으로 검색 */
    private async searchOnNaverMap(page: Page, keyword: string): Promise<Frame | null> {
        await page.goto('https://map.naver.com/v5/', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        const searchInputSelector = 'input.input_search';
        await page.waitForSelector(searchInputSelector, { timeout: 10000 });
        await page.click(searchInputSelector, { clickCount: 3 });
        await page.type(searchInputSelector, keyword, { delay: 50 });
        await page.keyboard.press('Enter');

        await page.waitForSelector('iframe#searchIframe', { timeout: 10000 });
        const frameElement = await page.$('iframe#searchIframe');
        if (!frameElement) {
            return null;
        }
        return frameElement.contentFrame();
    }

    /** searchIframe 내 검색 결과 클릭 (이름 일치 우선, 없으면 첫 항목) */
    private async clickSearchResult(
        searchFrame: Frame,
        placeName: string,
    ): Promise<void> {
        const resultSelector =
            'li[data-laim-exp-id] a, a.place_bluelink, .place_bluelink';
        await searchFrame.waitForSelector(resultSelector, { timeout: 10000 });

        const clicked = await searchFrame.evaluate((name, selector) => {
            const links = Array.from(
                document.querySelectorAll<HTMLAnchorElement>(selector),
            );
            const normalizedName = name.replace(/\s/g, '');

            const match = links.find((link) => {
                const text = (link.textContent ?? '').replace(/\s/g, '');
                return text.includes(normalizedName) || normalizedName.includes(text);
            });

            const target = match ?? links[0];
            if (!target) {
                return false;
            }
            target.click();
            return true;
        }, placeName, resultSelector);

        if (!clicked) {
            throw new Error(`[${placeName}] 검색 결과를 클릭할 수 없습니다.`);
        }
    }

    async crawlNaverMaps(): Promise<NaverMapInfo[]> {
        const naverMapInfos: NaverMapInfo[] = [];
        let successCount = 0;
        let errorCount = 0;

        const places = await this.getPlacesFromDB();

        for (const place of places) {
            try {
                console.log('--- Launching new browser instance... ---');
                this.browser = await puppeteer.launch({
                    headless: false,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                    ],
                });

                const placeName = place.location.name;

                console.log(
                    `[${successCount + errorCount + 1}/${places.length}] Starting crawl: ${placeName}`,
                );

                const page = await this.browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                );

                const placeInfo = await this.extractPlaceInfoWithPuppeteer(
                    page,
                    placeName,
                    place._id?.toString() || '',
                );

                if (placeInfo) {
                    const updateData: {
                        image?: string;
                        operatingHours: string[][];
                    } = {
                        operatingHours: placeInfo.operatingHours ?? [],
                    };

                    await Place.findByIdAndUpdate(place._id, updateData);

                    if (
                        placeInfo.imageUrl ||
                        (placeInfo.operatingHours?.length ?? 0) > 0
                    ) {
                        console.log(`✅ Success: ${placeName} - DB updated.`);
                        naverMapInfos.push(placeInfo);
                        successCount++;
                    } else {
                        logger.warning(
                            `⚠️ Failed to find image and operating hours for ${placeName}.`,
                        );
                        errorCount++;
                    }
                } else {
                    logger.warning(`⚠️ Failed to crawl place info for ${placeName}.`);
                    errorCount++;
                }
            } catch (placeError) {
                errorCount++;
                logger.error(
                    `❌ Critical error on place: ${place.location.name}`,
                    placeError,
                );
            } finally {
                if (this.browser) {
                    console.log('--- Closing browser instance... ---');
                    await this.browser.close();
                    this.browser = null;
                }
                const delayTime = 1500 + Math.random() * 1000;
                console.log(`--- Waiting for ${delayTime.toFixed(0)}ms... ---\n`);
                await this.delay(delayTime);
            }
        }

        console.log(
            `Crawling finished - Success: ${successCount}, Failed: ${errorCount}, Total collected: ${naverMapInfos.length}`,
        );
        return naverMapInfos;
    }

    private async extractPlaceInfoWithPuppeteer(
        page: Page,
        placeName: string,
        placeId: string,
    ): Promise<NaverMapInfo | null> {
        try {
            const entryIframeSelector = '#entryIframe';

            console.log(`[${placeName}] 검색창으로 검색 중...`);
            const searchFrame = await this.searchOnNaverMap(page, placeName);
            if (!searchFrame) {
                console.error(`[${placeName}] searchIframe을 찾을 수 없습니다.`);
                return null;
            }

            console.log(`[${placeName}] searchIframe에서 결과 클릭...`);
            await this.clickSearchResult(searchFrame, placeName);
            await page.waitForSelector(entryIframeSelector, { timeout: 10000 });

            const frameHandle = await page.$(entryIframeSelector);
            if (!frameHandle) {
                console.error(
                    `Could not find entry iframe for ${placeName} even after handling search list.`,
                );
                return null;
            }

            const frame = await frameHandle.contentFrame();
            if (!frame) {
                console.error(`Could not get content frame for ${placeName}`);
                return null;
            }

            const imageSelectors = ['img#business_1', 'img#visitor_1'];
            await frame
                .waitForSelector(imageSelectors.join(', '), {
                    visible: true,
                    timeout: 5000,
                })
                .catch(() => null);

            const imageUrl = await frame.evaluate((selectors) => {
                for (const selector of selectors) {
                    const imgElement = document.querySelector(
                        selector,
                    ) as HTMLImageElement | null;

                    if (
                        imgElement?.src &&
                        !imgElement.src.startsWith('data:image')
                    ) {
                        return imgElement.src;
                    }
                }
                return undefined;
            }, imageSelectors);

            const operatingHours = await this.extractOperatingHours(
                frame,
                placeName,
            );

            if (!imageUrl) {
                logger.warning(
                    `Image URL not found for ${placeName} even after waiting.`,
                );
            }

            console.log(`[${placeName}] Operating hours:`, operatingHours);

            return {
                placeName,
                placeId,
                address: null,
                imageUrl: imageUrl || undefined,
                operatingHours,
                crawledAt: new Date(),
            };
        } catch (error) {
            console.error(
                `Failed to extract info for: ${placeName}. The page structure might have changed or the place was not found.`,
                error,
            );
            return {
                placeName,
                placeId,
                address: null,
                crawledAt: new Date(),
                imageUrl: undefined,
                operatingHours: [],
            };
        }
    }

    private async extractOperatingHours(
        frame: Frame,
        placeName: string,
    ): Promise<string[][]> {
        console.log(`[${placeName}] Extracting operating hours...`);
        const hoursToggleSelector = 'a.gKP9i.RMgN0[role="button"]';
        const expandedHoursRowSelector =
            'a.gKP9i.RMgN0[role="button"][aria-expanded="true"] div.H3ua4';

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await frame.waitForSelector(hoursToggleSelector, {
                    visible: true,
                    timeout: 5000,
                });

                const isExpanded = await frame.$eval(
                    hoursToggleSelector,
                    (element) => element.getAttribute('aria-expanded') === 'true',
                );

                if (!isExpanded) {
                    await frame.click(hoursToggleSelector);
                    await frame.waitForFunction(
                        (selector) => {
                            const button = document.querySelector(selector);
                            return button?.getAttribute('aria-expanded') === 'true';
                        },
                        { timeout: 4000 },
                        hoursToggleSelector,
                    );
                }

                await this.delay(300);

                await frame.waitForSelector(expandedHoursRowSelector, {
                    visible: true,
                    timeout: 4000,
                });

                const operatingHours = await frame.evaluate((selector) => {
                    const expandedButton = document.querySelector(
                        `${selector}[aria-expanded="true"]`,
                    );

                    if (!expandedButton) {
                        return [];
                    }

                    return Array.from(
                        expandedButton.querySelectorAll('span.A_cdD'),
                    )
                        .map((item) =>
                            Array.from(item.children)
                                .filter(
                                    (child) =>
                                        child.tagName === 'SPAN' ||
                                        child.tagName === 'DIV',
                                )
                                .map((child) => child.textContent?.trim() ?? '')
                                .filter(Boolean),
                        )
                        .filter((texts) => texts.length >= 2);
                }, hoursToggleSelector);

                if (operatingHours.length > 0) {
                    return operatingHours;
                }
            } catch (error) {
                console.log(
                    `[${placeName}] Failed to extract operating hours on attempt ${attempt}.`,
                    error,
                );
            }

            await this.delay(700 * attempt);
        }

        logger.warning(`[${placeName}] Operating hours could not be extracted.`);
        return [];
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
            console.log(
                `\nCrawling task finished. Collected data for ${results.length} places.`,
            );
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Crawling task failed:', error);
            process.exit(1);
        });
}

export default NaverMapCrawler;
