import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export class DateUtils {
  //'2023-12-03'
  static strToDate(dateStr: string) {
    return dayjs(dateStr, 'YYYY-MM-DD').startOf('day');
  }

  static formatGatherDate(date: Date | string) {
    return `${dayjs(date).locale('ko').format('M월 D일(ddd)')}`;
  }

  static getKoreaTime(): string {
    const nowInSeoul = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
    return nowInSeoul;
  }

  static getKoreaTimeYYYYDDMM(): string {
    const nowInSeoul = dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
    return nowInSeoul;
  }

  static getKoreaToday(): Date {
    const today = new Date();
    const koreaToday = new Date(
      today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );
    return koreaToday;
  }

  static getTodayYYYYMMDD(): string {
    const today = new Date();
    const koreaToday = new Date(
      today.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );
    const year = koreaToday.getFullYear();
    const month = String(koreaToday.getMonth() + 1).padStart(2, '0');
    const day = String(koreaToday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static formatDateToYYYYMMDD(dateString: string): string {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
