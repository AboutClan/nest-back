import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');
dayjs.locale('ko');

/** 한 번의 출석 인증으로 공부 기록에 쌓을 수 있는 최대 시간(분). */
export const MAX_STUDY_MINUTES_PER_ATTEND = 12 * 60;

/**
 * 'HH:mm' 또는 ISO 문자열에서 KST 시:분만 분(0~1439)으로 꺼낸다.
 * 파싱할 수 없으면 null.
 */
export const toMinutesOfDayKst = (raw: string): number | null => {
  if (!raw) return null;

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hour, minute] = raw.split(':').map(Number);
    return hour * 60 + minute;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return (
    (parsed.getUTCHours() * 60 + parsed.getUTCMinutes() + 9 * 60) % (24 * 60)
  );
};

/**
 * 시:분만 살려서 `dateStr`(YYYY-MM-DD, KST) 기준 실제 시각으로 맞춘다.
 *
 * 저장된 값의 날짜는 믿을 수 없다 — 프론트가 시각을 만들 때 `parseTimeToDayjs`로
 * **오늘 날짜**를 쓰기 때문에, 미래 날짜의 신청(vote2 `dateArr`)이나 개설(realtime
 * `basicVote`)에는 스터디 날짜가 아니라 조작한 날짜가 박혀 있다. 그 값을 절대 시각으로
 * 비교하면 지각 판정·출석 누락 알림이 전부 어긋난다.
 */
export const getScheduledAtOnDate = (
  dateStr: string,
  raw: string,
): Date | null => {
  const minutes = toMinutesOfDayKst(raw);
  if (minutes === null) return null;

  const [year, month, day] = (dateStr ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;

  // KST 자정 = 같은 날 00:00 UTC에서 9시간 뺀 시각
  const kstMidnightUtc = Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000;
  return new Date(kstMidnightUtc + minutes * 60 * 1000);
};

/**
 * 출석 시점부터 예정 종료 시각까지의 분. 공부 기록(studyRecord)에 누적된다.
 *
 * 예전에는 vote2·realtime 서비스가 각자 `Math.abs(now - end)`로 계산했다. abs를 쓰면
 * 종료 시각이 이미 지난 값일 때(구버전 클라이언트, 자정을 넘긴 입력) 지나간 시간이
 * 그대로 공부 시간으로 더해진다. 음수는 0으로 접고 상한을 둔다.
 *
 * 주의: 이 값은 사용자가 출석 시 신고한 "예정" 종료 시각 기준이므로 실제 체류 시간이
 * 아니다. 일찍 나가도 기록은 줄지 않는다.
 */
export const getStudyMinutesUntil = (
  end: string | Date,
  now: Date = new Date(),
): number => {
  const endTime = new Date(end).getTime();
  if (Number.isNaN(endTime)) return 0;

  const diffMinutes = Math.floor((endTime - now.getTime()) / 1000 / 60);

  return Math.min(Math.max(diffMinutes, 0), MAX_STUDY_MINUTES_PER_ATTEND);
};

export class DateUtils {
  static getStartOfMonth(date?: string): Dayjs {
    return dayjs().subtract(1, 'month').startOf('month');
  }

  static getEndOfMonth(date?: string): Dayjs {
    return dayjs().subtract(1, 'month').endOf('month');
  }

  static getMonth(date?: string) {
    if (date) {
      return dayjs(date).get('M') + 1; // dayjs returns month as 0-indexed, so we add 1
    } else {
      return dayjs().get('M') + 1; // current month
    }
  }

  static getLatestMonday() {
    return dayjs()
      .subtract(1, 'day')
      .startOf('week')
      .add(1, 'day')
      .format('YYYY-MM-DD');
  }

  static getMinutesDiffFromNow(date: string): number {
    return dayjs(date).diff(dayjs(), 'm');
  }

  static getDayDiff(date1: string, date2: string): number {
    return dayjs(date1).diff(dayjs(date2), 'day');
  }

  static getDayJsDate(date: string): Date {
    return dayjs(date).toDate();
  }

  static getNowDate(): Date {
    return dayjs().toDate();
  }

  static getMillisecondsNow(): number {
    return dayjs().tz('Asia/Seoul').toDate().getTime();
  }

  static getFirstDayOfWeek(date: Date | string): Dayjs {
    return dayjs(date).startOf('isoWeek' as dayjs.OpUnitType);
  }

  static getFirstDayOfLastMonth(): string {
    return dayjs()
      .subtract(1, 'month') // 한 달을 뺀 뒤
      .startOf('month') // 그 달의 첫째 날로 이동
      .format('YYYY-MM-DD'); // 포맷 지정
  }

  //'2023-12-03' -> dayjs object
  static strToDate(dateStr: string) {
    return dayjs(dateStr, 'YYYY-MM-DD').startOf('day').toDate();
  }

  static formatGatherDate(date: Date | string) {
    return `${dayjs(date).locale('ko').format('M월 D일(ddd)')}`;
  }

  static getKoreaTime(): string {
    const nowInSeoul = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    return nowInSeoul;
  }

  static getDayJsYYYYMMDD(date?: Date): Dayjs {
    if (date) {
      return dayjs(date, 'YYYY-MM-DD');
    } else {
      return dayjs('YYYY-MM-DD');
    }
  }

  static getKoreaTimeYYYYDDMM(date?: Date): string {
    if (date) {
      const nowInSeoul = dayjs(date).tz('Asia/Seoul').format('YYYY-MM-DD');
      return nowInSeoul;
    } else {
      const nowInSeoul = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
      return nowInSeoul;
    }
  }

  static getWeekDate() {
    const dates = Array.from({ length: 8 }, (_, i) =>
      dayjs().add(i, 'day').format('YYYY-MM-DD'),
    );
    return dates;
  }

  static getKoreaDate(date: string): Date {
    return dayjs(date).tz('Asia/Seoul').toDate();
  }

  static getKoreaToday(): Date {
    return dayjs().tz('Asia/Seoul').toDate();
  }

  // Asia/Seoul 기준, 오늘에서 monthsAgo만큼 이전 달 (1=지난달, 2=지지난달)
  static getSeoulMonthRangeByMonthsAgo(monthsAgo: number): {
    start: Date;
    end: Date;
  } {
    const d = dayjs().tz('Asia/Seoul').subtract(monthsAgo, 'month');
    return {
      start: d.startOf('month').toDate(),
      end: d.endOf('month').toDate(),
    };
  }

  static getTodayYYYYMMDD(): string {
    return dayjs().format('YYYY-MM-DD');
  }
  static getYesterdayYYYYMMDD(): string {
    return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  }
  static getTomorrowYYYYMMDD(): string {
    return dayjs().add(1, 'day').format('YYYY-MM-DD');
  }

  //년-월
  static getYearMonth(): string {
    return dayjs().format('YYYY-MM');
  }

  //년-월-주차
  static getYearMonthWeek(): string {
    const now = dayjs();

    const year = now.format('YYYY');
    const month = now.format('MM');

    const weekOfMonth = Math.ceil(now.date() / 7);

    return `${year}-${month}-${weekOfMonth}`;
  }
  //년-월-일-시간
  static getYearMonthDayHour(): string {
    return dayjs().format('YYYY-MM-DD-HH');
  }

  static formatDateToYYYYMMDD(dateString: string): string {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
