/**
 * studyCafeMeta 일부 필드를 네이버 키워드 투표·영업시간으로 판단하는 코드 규칙
 * ─────────────────────────────
 * GPT는 리뷰 200개 중 한 번만 언급돼도 true로 판단해 좌석·화장실 등이 90% 이상 true가 됨
 * → 키워드 투표 비율(전체 투표 대비 %)·표 수로 판단해 필터로 쓸 수 있는 비율(상위 20~30%)로 맞춤
 * 키워드 투표가 없는 place는 GPT 결과를 유지. hasGoodWifi·hasTimeLimit은 해당 키워드가 없어 GPT 결과 사용.
 */

export interface NaverKeywordVotes {
  totalCount: number;
  details: { name: string; count: number }[];
}

interface KeywordRule {
  keywords: string[];
  /** 전체 투표 대비 비율(%) 이상 — 품질 항목(좋다/나쁘다) */
  minRatio: number;
  /** 표 수 이상 */
  minVotes: number;
}

/**
 * 좌석·화장실·가성비·주차: 비율 기준 (리뷰 많은 카페가 표 수만으로 쉽게 통과하지 않도록)
 * 단체석: 관련 키워드 투표 자체가 적어 표 수만
 */
export const KEYWORD_META_RULES: Record<
  'hasComfortableSeats' | 'hasCleanRestroom' | 'hasGoodValueDrinks' | 'hasParking' | 'hasGroupSeats',
  KeywordRule
> = {
  hasComfortableSeats: { keywords: ['좌석이 편해요'], minRatio: 4, minVotes: 10 },
  hasCleanRestroom: { keywords: ['화장실이 깨끗해요'], minRatio: 2, minVotes: 10 },
  hasGoodValueDrinks: { keywords: ['가성비가 좋아요'], minRatio: 3, minVotes: 10 },
  hasParking: { keywords: ['주차하기 편해요'], minRatio: 1, minVotes: 5 },
  hasGroupSeats: {
    keywords: ['단체모임 하기 좋아요', '룸이 잘 되어있어요'],
    minRatio: 0,
    minVotes: 3,
  },
};

/** 키워드 투표 기준으로 meta 필드를 덮어쓴 새 객체 반환 (투표 없으면 그대로) */
export function applyKeywordMetaRules<T extends Record<string, unknown>>(
  meta: T,
  votes?: NaverKeywordVotes | null,
): T {
  const total = Number(votes?.totalCount) || 0;
  if (!votes?.details?.length || total === 0) return meta;

  const next: Record<string, unknown> = { ...meta };
  for (const [field, rule] of Object.entries(KEYWORD_META_RULES)) {
    const count = votes.details
      .filter((d) => rule.keywords.includes(d.name))
      .reduce((sum, d) => sum + (Number(d.count) || 0), 0);
    next[field] = count >= rule.minVotes && (count / total) * 100 >= rule.minRatio;
  }
  next.goodForDate = isGoodForDate(votes);
  return next as T;
}

/* ───────────── 카공데이트(goodForDate) ─────────────
 * 모든 place는 이미 카공하기 좋은 곳이므로 데이트 분위기 키워드 비율만 봄.
 * 리뷰 원문은 저장하지 않으므로 리뷰 언급 수는 쓰지 않음 (크롤링·재계산 결과를 같게 유지)
 */

/** 데이트 분위기 키워드 ("대화하기 좋아요"는 대부분 카페에 많아서 제외) */
const DATE_KEYWORD_PATTERN = /인테리어|아늑|사진|뷰가|데이트|분위기가 좋|특별한 날|로맨틱/;

/** 분위기 키워드 합이 전체 투표의 20% 이상이면서 50표 이상 → 약 상위 20% */
const GOOD_FOR_DATE_RULE = { minRatio: 20, minVotes: 50 };

/** 데이트 분위기 키워드 비율(%) — 섹션 정렬에도 사용 */
export function dateKeywordRatio(votes?: NaverKeywordVotes | null): {
  votes: number;
  ratio: number;
} {
  const total = Number(votes?.totalCount) || 0;
  const count = (votes?.details ?? [])
    .filter((d) => DATE_KEYWORD_PATTERN.test(d.name))
    .reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  return { votes: count, ratio: total > 0 ? (count / total) * 100 : 0 };
}

export function isGoodForDate(votes?: NaverKeywordVotes | null): boolean {
  const { votes: count, ratio } = dateKeywordRatio(votes);
  return count >= GOOD_FOR_DATE_RULE.minVotes && ratio >= GOOD_FOR_DATE_RULE.minRatio;
}

/** is24Hours: 24시간 영업이 아니어도 이 시각(분) 이후까지 영업하면 true — 새벽 2시 */
const LATE_NIGHT_MIN_CLOSE_MINUTES = 2 * 60;

const toMinutes = (hhmm: string): number | null => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * is24Hours = 24시간 영업 또는 새벽 2시 이후까지 영업 (예: 10:00 - 02:00, 12:00 - 03:00)
 * 영업시간 [['영업시간', 'HH:mm - HH:mm']] 기준 — 영업시간이 없으면 undefined (GPT 결과 유지)
 */
export function is24HoursFromOperatingHours(
  operatingHours?: string[][] | null,
): boolean | undefined {
  const hours = operatingHours?.[0]?.[1];
  if (!hours) return undefined;

  const [startText, endText] = hours.split(' - ');
  if (endText === '24:00') return true;
  const start = toMinutes(startText ?? '');
  const end = toMinutes(endText ?? '');
  if (start === null || end === null) return undefined;

  // 종료가 시작보다 이르면 자정을 넘기는 영업 → 새벽 2시 이후 마감인지 확인
  return end < start && end >= LATE_NIGHT_MIN_CLOSE_MINUTES;
}
