import dayjs from 'dayjs';

export const strToDate = (dateStr: string) => {
  return dayjs(dateStr, 'YYYY-MM-DD').startOf('day');
};

// const dateParser = (dateStr: string) => {
//   const dayjsDate = strToDate(dateStr);
//   const date = dayjsDate.toDate();
// };
