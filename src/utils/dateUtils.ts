import dayjs from 'dayjs';

import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

const TZ_SEOUL = 'Asia/Seoul';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(TZ_SEOUL);

export const now = () => dayjs().tz(TZ_SEOUL);

export const strToDate = (dateStr: string) => {
  return dayjs(dateStr, 'YYYY-MM-DD').tz(TZ_SEOUL).startOf('day');
};

// const dateParser = (dateStr: string) => {
//   const dayjsDate = strToDate(dateStr);
//   const date = dayjsDate.toDate();
// };
