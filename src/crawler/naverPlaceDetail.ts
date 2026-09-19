/**
 * 네이버 플레이스 상세(pcmap) 페이지의 SSR 데이터(window.__APOLLO_STATE__)에서 값 추출
 * 크롤러(cafe.ts, 브라우저로 페이지를 연 뒤)와 이미지 백필 스크립트(HTML 직접 요청)가 같이 사용
 */

/** placeDetail(...) 루트 쿼리 결과 */
function getPlaceDetail(apollo: unknown): any | null {
  const root = (apollo as any)?.ROOT_QUERY;
  if (!root) return null;
  const detailKey = Object.keys(root).find((k) => k.startsWith('placeDetail('));
  return detailKey ? root[detailKey] : null;
}

/**
 * 상세 화면 첫 번째 대표 이미지 — placeDetail.images.images[0].origin
 * DB에는 기존 데이터와 같은 네이버 이미지 프록시(320x320 리사이즈) 주소로 저장
 */
export function extractRepresentativeImage(apollo: unknown): string | undefined {
  const origin = getPlaceDetail(apollo)?.images?.images?.[0]?.origin;
  if (typeof origin !== 'string' || !origin.startsWith('http')) return undefined;
  return `https://search.pstatic.net/common/?autoRotate=true&quality=95&type=f320_320&src=${encodeURIComponent(origin)}`;
}

/** pcmap HTML 문자열에서 window.__APOLLO_STATE__ JSON 파싱 (브라우저 없이 요청한 경우) */
export function parseApolloStateFromHtml(html: string): unknown | null {
  const marker = html.indexOf('window.__APOLLO_STATE__');
  if (marker < 0) return null;
  const start = html.indexOf('{', marker);
  if (start < 0) return null;

  // 문자열 안의 중괄호를 건너뛰며 JSON 객체의 끝을 찾음
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
