export class DateUtils {
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
}



