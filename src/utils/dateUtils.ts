import dayjs from 'dayjs';
import 'dayjs/locale/ko';

export const strToDate = (dateStr: string) => {
  return dayjs(dateStr, 'YYYY-MM-DD').startOf('day');
};

export const formatGatherDate = (date: Date | string) => {
  return `${dayjs(date).locale('ko').format('M월 D일(ddd)')}`;
};

// const dateParser = (dateStr: string) => {
//   const dayjsDate = strToDate(dateStr);
//   const date = dayjsDate.toDate();
// };
