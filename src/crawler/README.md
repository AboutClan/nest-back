# 네이버 지도 크롤러

이 크롤러는 DB의 place collection에서 장소 데이터를 가져와서 네이버 지도에서 추가 정보를 수집하는 도구입니다.

## 기능

- Place collection에서 활성 장소 데이터 조회
- 네이버 지도 URL 자동 생성 및 접속
- 장소명, 주소, 전화번호, 카테고리, 평점, 리뷰수, 이미지 정보 수집
- 에러 처리 및 로깅
- 요청 간 지연으로 서버 부하 방지

## 설치된 의존성

- `axios`: HTTP 요청
- `cheerio`: HTML 파싱
- `mongoose`: MongoDB 연결
- `winston`: 로깅

## 사용법

### 1. 환경 변수 설정

`.env` 파일에 MongoDB 연결 정보를 설정하세요:

```env
MONGODB_URI=mongodb://localhost:27017/your-database-name
```

### 2. Place collection 데이터 확인

DB의 place collection에 `status: 'active'`인 장소 데이터가 있는지 확인하세요. 각 장소는 `location.name` 필드를 가져야 합니다.

### 3. CSS 선택자 수정

네이버 지도의 실제 HTML 구조에 맞게 CSS 선택자를 수정하세요:

```typescript
// 네이버 지도 정보 추출 부분
const address = $('.address').text().trim() || '';
const phone = $('.phone').text().trim() || '';
const category = $('.category').text().trim() || '';
const rating = parseFloat($('.rating .score').text().trim()) || 0;
const reviewCount = parseInt($('.review_count').text().trim()) || 0;
const imageUrl = $('.place_photo img').attr('src') || '';
```

### 4. 실행

#### 스크립트로 실행

```bash
npm run crawl:naver
```

#### 코드에서 사용

```typescript
import { NaverMapService } from './crawler/cafeImg';

const service = new NaverMapService();

// 전체 크롤링 실행
const results = await service.startCrawling();

// 특정 장소만 크롤링
const result = await service.crawlSpecificPlace('스타벅스 강남점');
```

## 수집되는 데이터 구조

크롤링 결과는 다음과 같은 구조로 반환됩니다:

```typescript
interface NaverMapInfo {
  placeName: string; // 장소명
  placeId: string; // Place collection의 _id
  address: string; // 주소
  phone?: string; // 전화번호
  category?: string; // 카테고리
  rating?: number; // 평점
  reviewCount?: number; // 리뷰 수
  imageUrl?: string; // 이미지 URL
  crawledAt: Date; // 크롤링 시간
}
```

## 에러 처리

- 개별 장소 크롤링 실패 시에도 다른 장소는 계속 처리
- HTTP 오류, 네트워크 오류 등에 대한 적절한 로깅
- Place collection 조회 실패 시 전체 크롤링 중단

## 주의사항

1. **로봇 배제 표준(robots.txt) 준수**: 크롤링 전 네이버 지도의 robots.txt를 확인하세요.
2. **요청 간격**: 서버 부하를 방지하기 위해 요청 간 2초 지연이 설정되어 있습니다.
3. **User-Agent**: 실제 브라우저처럼 보이도록 User-Agent를 설정했습니다.
4. **타임아웃**: 요청 타임아웃이 15초로 설정되어 있습니다.

## 커스터마이징

### 새로운 필드 추가

`NaverMapInfo` 인터페이스와 `extractPlaceInfo` 메서드를 수정하여 새로운 필드를 추가할 수 있습니다:

```typescript
interface NaverMapInfo {
  placeName: string;
  placeId: string;
  address: string;
  phone?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  businessHours?: string; // 새 필드 추가
  priceRange?: string; // 새 필드 추가
  crawledAt: Date;
}
```

### 크롤링 로직 수정

`extractPlaceInfo()` 메서드에서 네이버 지도의 실제 HTML 구조에 맞게 선택자를 수정할 수 있습니다.

## 로그

모든 크롤링 활동은 winston 로거를 통해 기록됩니다. 로그 레벨에 따라 다음과 같은 정보를 확인할 수 있습니다:

- `info`: 일반적인 진행 상황
- `warn`: 경고 (예: HTTP 4xx 응답)
- `error`: 오류 발생
