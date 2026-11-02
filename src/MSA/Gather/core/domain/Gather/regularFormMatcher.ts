import { RegularContentProps, RegularSlotProps } from './Gather';

/**
 * 상시 행사 구글폼 응답(응답마다 고른 선택지 문구)을 slot·content key별 신청 수로 바꾼다.
 * 폼 선택지는 "11월 6일(금) 오후 7시", "11월 7일(토) 오후 4시 / 피노키오의 숲",
 * "D＇FESTA THE ORIGIN", "죽여주는 이야기 🎟️ 제휴 할인 가능" 같은 자유 문구라서
 * - 날짜 문구 → 날짜·시간으로 풀어 slot에 연결 (매주 slot은 요일+시간, 날짜 slot은 날짜+시간)
 * - 그 밖의 문구 → content 제목과 기호·공백을 뺀 글자로 비교
 * - 콘텐츠 전용 slot을 고르면 그 content도 함께 센다
 * 한 응답이 같은 key를 여러 번 골라도 1로 센다.
 */

const DATE_RE = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
const TIME_RE =
  /(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?|(\d{1,2}):(\d{2})/;

const pad = (n: number) => String(n).padStart(2, '0');

/** 기호·이모지·공백을 빼고 소문자 영문·숫자·한글만 남긴다 (D＇FESTA == D'FESTA) */
const normalize = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '');

/** "11월 6일(금) 오후 7시" → { date: '2026-11-06', weekday: 5, time: '19:00' } */
export function parseDateOption(
  text: string,
  now: Date = new Date(),
): { date: string; weekday: number; time: string } | null {
  const dm = text.match(DATE_RE);
  const tm = text.match(TIME_RE);
  if (!dm || !tm) return null;

  const month = Number(dm[1]);
  const day = Number(dm[2]);
  // 연도는 적혀 있지 않다. 지금보다 6개월 넘게 이전 달이면 내년으로 본다(12월에 1월 일정을 받는 경우).
  let year = now.getFullYear();
  if (month < now.getMonth() + 1 - 6) year += 1;

  let hour: number;
  let minute: number;
  if (tm[4] !== undefined) {
    hour = Number(tm[4]);
    minute = Number(tm[5]);
  } else {
    hour = Number(tm[2]);
    minute =
      tm[3] !== undefined ? Number(tm[3]) : tm[0].includes('반') ? 30 : 0;
    if (tm[1] === '오후' && hour < 12) hour += 12;
    if (tm[1] === '오전' && hour === 12) hour = 0;
  }

  const date = `${year}-${pad(month)}-${pad(day)}`;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { date, weekday, time: `${pad(hour)}:${pad(minute)}` };
}

/** 선택지 문구 하나가 가리키는 slot·content key들 */
export function matchOption(
  text: string,
  slots: RegularSlotProps[],
  contents: RegularContentProps[],
  now: Date = new Date(),
): string[] {
  const keys = new Set<string>();

  const parsed = parseDateOption(text, now);
  if (parsed) {
    for (const slot of slots) {
      const sameTime = slot.time === parsed.time;
      const hit = slot.date
        ? slot.date === parsed.date && sameTime
        : slot.weekday === parsed.weekday && sameTime;
      if (hit) {
        keys.add(slot.key);
        if (slot.contentKey) keys.add(slot.contentKey);
      }
    }
  }

  const normText = normalize(text);
  if (normText) {
    for (const content of contents) {
      const normTitle = normalize(content.title);
      if (!normTitle) continue;
      if (
        normText.includes(normTitle) ||
        (normText.length >= 4 && normTitle.includes(normText))
      ) {
        keys.add(content.key);
      }
    }
  }

  return [...keys];
}

/** now가 속한 주의 월요일(KST) 'YYYY-MM-DD'. 프론트 getCurrentRoundKey와 같은 값이다. */
export function getRoundKey(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const back = (kst.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - back),
  );
  return monday.toISOString().slice(0, 10);
}

/** roundKey(월요일) ~ 그 주 일요일 사이 날짜인가 ('YYYY-MM-DD'끼리 문자열 비교) */
const isInRound = (date: string, roundKey: string) => {
  const end = new Date(`${roundKey}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return date >= roundKey && date <= end.toISOString().slice(0, 10);
};

/**
 * 응답 목록 → 이번 주 회차 신청 집계.
 * 폼에는 여러 주의 날짜가 함께 있으므로, 날짜를 고른 응답은 이번 주(월~일) 날짜만 세고
 * 이번 주 날짜가 하나도 없으면 그 응답은 통째로 뺀다(그 응답의 콘텐츠 선택도 세지 않음).
 * 날짜 선택지가 아예 없는 응답은 그대로 센다.
 */
export function countFormResponses(
  responses: string[][],
  slots: RegularSlotProps[],
  contents: RegularContentProps[],
  now: Date = new Date(),
): { roundKey: string; total: number; byOption: Record<string, number> } {
  const roundKey = getRoundKey(now);
  const byOption: Record<string, number> = {};
  let total = 0;

  for (const selected of responses) {
    const texts = (selected ?? []).filter(
      (text): text is string => typeof text === 'string',
    );
    const dated = texts.map((text) => ({
      text,
      parsed: parseDateOption(text, now),
    }));
    const hasDate = dated.some(({ parsed }) => parsed);
    const inRound = dated.filter(
      ({ parsed }) => !parsed || isInRound(parsed.date, roundKey),
    );
    if (hasDate && !inRound.some(({ parsed }) => parsed)) continue;

    const keys = new Set<string>();
    for (const { text } of inRound) {
      for (const key of matchOption(text, slots, contents, now)) keys.add(key);
    }
    total += 1;
    for (const key of keys) byOption[key] = (byOption[key] ?? 0) + 1;
  }
  return { roundKey, total, byOption };
}
