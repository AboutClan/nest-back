// import puppeteer, { Browser, Page, Frame } from 'puppeteer';
// import mongoose from 'mongoose';
// import dbConnect from '../Database/conn';
// import { logger } from '../logger';
// import { Place, IPlace } from '../routes/place/place.entity';
// import { threadId } from 'worker_threads';

// // Interface for Naver Map crawling results
// interface NaverMapInfo {
//   placeName: string;
//   placeId: string;
//   address: string | null;
//   phone?: string;
//   category?: string;
//   rating?: number;
//   reviewCount?: number;
//   imageUrl?: string;
//   crawledAt: Date;
// }

// class NaverMapCrawler {
//   private db: any;
//   // Browser instance is now managed per-crawl, not for the whole session
//   private browser: Browser | null = null;

//   constructor() {
//     this.db = null;
//   }

//   // Connect to DB and initialize browser
//   async initialize() {
//     try {
//       this.db = await dbConnect();
//       console.log('Database connection successful');
//       // Browser initialization is moved inside the loop
//     } catch (error) {
//       logger.error('Initialization failed:', error);
//       throw error;
//     }
//   }

//   // Get data from the Place collection
//   async getPlacesFromDB(): Promise<IPlace[]> {
//     try {
//       const places = await Place.find({ image: null }).exec();
//       console.log(`Fetched ${places.length} active places from DB.`);
//       return places;
//     } catch (error) {
//       logger.error('Failed to retrieve Place data:', error);
//       throw error;
//     }
//   }

//   // Generate Naver Map URL
//   private generateNaverMapUrl(placeName: string): string {
//     const encodedName = encodeURIComponent(placeName);
//     return `https://map.naver.com/p/search/${encodedName}`;
//   }

//   // Main function for crawling Naver Maps
//   async crawlNaverMaps(): Promise<NaverMapInfo[]> {
//     const naverMapInfos: NaverMapInfo[] = [];
//     let successCount = 0;
//     let errorCount = 0;

//     const places = await this.getPlacesFromDB();

//     for (const place of places) {
//       let page: Page | null = null;
//       try {
//         // ***** CHANGED *****
//         // Launch a new browser for each place
//         console.log('--- Launching new browser instance... ---');
//         this.browser = await puppeteer.launch({
//           headless: true,
//           args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-accelerated-2d-canvas',
//             '--no-first-run',
//             '--no-zygote',
//             '--disable-gpu',
//           ],
//         });

//         const placeName = place.location.name;
//         const naverMapUrl = this.generateNaverMapUrl(placeName);

//         console.log(
//           `[${successCount + errorCount + 1}/${places.length}] Starting crawl: ${placeName}`,
//         );
//         console.log(naverMapUrl);

//         page = await this.browser.newPage();
//         await page.setUserAgent(
//           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
//         );

//         await page.goto(naverMapUrl, {
//           waitUntil: 'networkidle2',
//           timeout: 6000,
//         });

//         console.log('extractPlaceInfoWithPuppeteer');
//         const placeInfo = await this.extractPlaceInfoWithPuppeteer(
//           page,
//           placeName,
//           place._id?.toString() || '',
//         );

//         if (placeInfo && placeInfo.imageUrl) {
//           await Place.findByIdAndUpdate(place._id, {
//             image: placeInfo.imageUrl,
//           });
//           console.log(`✅ Success: ${placeName} - DB updated.`);
//           naverMapInfos.push(placeInfo);
//           successCount++;
//         } else {
//           logger.warn(`⚠️ Failed to find image for ${placeName}.`);
//           errorCount++;
//         }
//       } catch (placeError) {
//         errorCount++;
//         logger.error(
//           `❌ Critical error on place: ${place.location.name}`,
//           placeError,
//         );
//         continue;
//       } finally {
//         // ***** CHANGED *****
//         // Close the entire browser instance after each crawl
//         if (this.browser) {
//           console.log('--- Closing browser instance... ---');
//           await this.browser.close();
//         }
//         const delayTime = 1500 + Math.random() * 1000;
//         console.log(`--- Waiting for ${delayTime.toFixed(0)}ms... ---\n`);
//         await this.delay(delayTime);
//       }
//     }

//     console.log(
//       `Crawling finished - Success: ${successCount}, Failed: ${errorCount}, Total collected: ${naverMapInfos.length}`,
//     );
//     return naverMapInfos;
//   }

//   // Extract place info from Naver Map using Puppeteer (iframe logic added)
//   // Extract place info from Naver Map using Puppeteer (iframe logic ADDED)
//   private async extractPlaceInfoWithPuppeteer(
//     page: Page,
//     placeName: string,
//     placeId: string,
//   ): Promise<NaverMapInfo | null> {
//     try {
//       const entryIframeSelector = '#entryIframe';
//       const searchIframeSelector = '#searchIframe';

//       // entryIframe 또는 searchIframe이 나타날 때까지 최대 30초 대기
//       await page.waitForSelector(
//         `${entryIframeSelector}, ${searchIframeSelector}`,
//         {
//           timeout: 3000,
//         },
//       );

//       // searchIframe이 존재하는지 확인 (검색 결과가 목록으로 표시되는 경우)
//       const searchFrameHandle = await page.$(searchIframeSelector);
//       if (searchFrameHandle) {
//         console.log(
//           `[${placeName}] Search list detected. Clicking the first item...`,
//         );
//         const searchFrame = await searchFrameHandle.contentFrame();
//         if (searchFrame) {
//           // 첫 번째 검색 결과의 selector (네이버 지도 구조 변경 시 업데이트 필요)
//           const firstResultSelector = 'li[data-laim-exp-id] a';
//           await searchFrame.waitForSelector(firstResultSelector, {
//             timeout: 3000,
//           });
//           await searchFrame.click(firstResultSelector);

//           // 첫 번째 항목 클릭 후 entryIframe이 로드될 때까지 대기
//           await page.waitForSelector(entryIframeSelector, { timeout: 30000 });
//         }
//       }

//       // 이제 entryIframe이 확실히 존재하므로, 내부 정보 추출
//       const frameHandle = await page.$(entryIframeSelector);
//       if (!frameHandle) {
//         console.error(
//           `Could not find entry iframe for ${placeName} even after handling search list.`,
//         );
//         return null;
//       }
//       const frame = await frameHandle.contentFrame();
//       if (!frame) {
//         console.error(`Could not get content frame for ${placeName}`);
//         return null;
//       }

//       // 대표 이미지 selector
//       const imageSelector = 'div.place_thumb img'; // 보다 안정적인 selector로 변경
//       await frame.waitForSelector(imageSelector, {
//         visible: true,
//         timeout: 5000,
//       });

//       const imageUrl = await frame.evaluate((selector) => {
//         const imgElement = document.querySelector(selector) as HTMLImageElement;
//         // 'src' 속성이 "data:image"로 시작하는 경우 로딩 중인 플레이스홀더일 수 있으므로 제외
//         if (
//           imgElement &&
//           imgElement.src &&
//           !imgElement.src.startsWith('data:image')
//         ) {
//           return imgElement.src;
//         }
//         return undefined;
//       }, imageSelector);

//       if (!imageUrl) {
//         logger.warn(`Image URL not found for ${placeName} even after waiting.`);
//       }

//       return {
//         placeName,
//         placeId,
//         address: null, // 필요 시 이 부분도 파싱 로직 추가
//         imageUrl: imageUrl || undefined,
//         crawledAt: new Date(),
//       };
//     } catch (error) {
//       console.error(
//         `Failed to extract info for: ${placeName}. The page structure might have changed or the place was not found.`,
//         error,
//       );
//       return {
//         placeName,
//         placeId,
//         address: null,
//         crawledAt: new Date(),
//         imageUrl: undefined,
//       };
//     }
//   }

//   private delay(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async cleanup() {
//     // Browser is cleaned up in the loop, this method is for other resources if needed
//     console.log('Cleanup process.');
//   }

//   async run(): Promise<NaverMapInfo[]> {
//     try {
//       await this.initialize(); // Only connects to DB now
//       const naverMapInfos = await this.crawlNaverMaps();
//       return naverMapInfos;
//     } catch (error) {
//       logger.error('An error occurred while running the crawler:', error);
//       throw error;
//     } finally {
//       await this.cleanup();
//     }
//   }
// }

// // Example usage and script execution remains the same...
// export class NaverMapService {
//   private crawler: NaverMapCrawler;
//   constructor() {
//     this.crawler = new NaverMapCrawler();
//   }
//   async startCrawling(): Promise<NaverMapInfo[]> {
//     try {
//       return await this.crawler.run();
//     } catch (error) {
//       logger.error('Crawling service failed to run:', error);
//       throw error;
//     }
//   }
// }

// if (require.main === module) {
//   const crawler = new NaverMapCrawler();
//   crawler
//     .run()
//     .then((results) => {
//       console.log(
//         `\nCrawling task finished. Collected data for ${results.length} places.`,
//       );
//       // console.log('Collected data details:', results);
//       process.exit(0);
//     })
//     .catch((error) => {
//       logger.error('Crawling task failed:', error);
//       process.exit(1);
//     });
// }

// export default NaverMapCrawler;
