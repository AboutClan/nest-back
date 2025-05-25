import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

export class DateUtils {
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

  static getKoreaToday(): Date {
    const today = new Date();
    const koreaToday = new Date(
      today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );
    return koreaToday;
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
