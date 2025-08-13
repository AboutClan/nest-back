import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ko';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');
dayjs.locale('ko');

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
    const dates = Array.from({ length: 7 }, (_, i) =>
      dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
    );
    return dates;
  }

  static getKoreaDate(date: string): Date {
    return dayjs(date).tz('Asia/Seoul').toDate();
  }

  static getKoreaToday(): Date {
    return dayjs().tz('Asia/Seoul').toDate();
  }

  static getTodayYYYYMMDD(): string {
    return dayjs().format('YYYY-MM-DD');
  }

  static formatDateToYYYYMMDD(dateString: string): string {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
