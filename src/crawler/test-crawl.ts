import { NaverMapService } from './cafeImg';

async function testCrawl() {
  const service = new NaverMapService();

  try {
    console.log('테스트 크롤링 시작...');
    const result = await service.crawlSpecificPlace('스타벅스 강남점');
    console.log('크롤링 결과:', result);
  } catch (error) {
    console.error('크롤링 실패:', error);
  }
}

testCrawl();
