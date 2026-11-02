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

/** now의 KST 날짜 'YYYY-MM-DD' */
const getKstDate = (now: Date) =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Apps Script가 보내는 응답 하나. 예전 형식(선택지 문구 배열)도 받는다. 이름·연락처는 받지 않는다. */
export type FormResponseInput =
  | string[]
  | {
      selected?: string[];
      gender?: string;
      birthYear?: string | number;
      submittedAt?: string;
    };

export interface RegularFormApplicant {
  gender: '남성' | '여성' | null;
  birthYear: number | null;
  keys: string[];
  submittedAt: Date | null;
}

const toGender = (text?: string): RegularFormApplicant['gender'] =>
  text?.includes('여') ? '여성' : text?.includes('남') ? '남성' : null;

/** "2001", "01", "2001년생" → 2001. 범위를 벗어나면 null */
export function toBirthYear(value?: string | number, now: Date = new Date()) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  let year = Number(digits.length >= 4 ? digits.slice(0, 4) : digits.slice(-2));
  if (digits.length < 4) {
    year += year <= now.getFullYear() % 100 ? 2000 : 1900;
  }
  return year >= 1960 && year <= now.getFullYear() - 10 ? year : null;
}

/**
 * 응답 목록 → 신청 집계와 신청자 목록.
 * 폼에는 여러 주의 날짜가 함께 있으므로, 날짜를 고른 응답은 아직 지나지 않은 날짜(오늘 포함, KST)만 세고
 * 남은 날짜가 하나도 없으면 그 응답은 통째로 뺀다(그 응답의 콘텐츠 선택도 세지 않음).
 * 날짜 선택지가 아예 없는 응답은 그대로 센다.
 */
export function countFormResponses(
  responses: FormResponseInput[],
  slots: RegularSlotProps[],
  contents: RegularContentProps[],
  now: Date = new Date(),
): {
  roundKey: string;
  total: number;
  byOption: Record<string, number>;
  applicants: RegularFormApplicant[];
} {
  const roundKey = getRoundKey(now);
  const today = getKstDate(now);
  const byOption: Record<string, number> = {};
  const applicants: RegularFormApplicant[] = [];

  for (const response of responses) {
    const input = Array.isArray(response)
      ? { selected: response }
      : (response ?? {});
    const texts = (input.selected ?? []).filter(
      (text): text is string => typeof text === 'string',
    );
    const dated = texts.map((text) => ({
      text,
      parsed: parseDateOption(text, now),
    }));
    const hasDate = dated.some(({ parsed }) => parsed);
    const upcoming = dated.filter(
      ({ parsed }) => !parsed || parsed.date >= today,
    );
    if (hasDate && !upcoming.some(({ parsed }) => parsed)) continue;

    const keys = new Set<string>();
    for (const { text } of upcoming) {
      for (const key of matchOption(text, slots, contents, now)) keys.add(key);
    }
    for (const key of keys) byOption[key] = (byOption[key] ?? 0) + 1;

    const submittedAt = input.submittedAt ? new Date(input.submittedAt) : null;
    applicants.push({
      gender: toGender(input.gender),
      birthYear: toBirthYear(input.birthYear, now),
      keys: [...keys],
      submittedAt:
        submittedAt && !Number.isNaN(submittedAt.getTime())
          ? submittedAt
          : null,
    });
  }
  return { roundKey, total: applicants.length, byOption, applicants };
}
