// import dayjs from 'dayjs';
// import { User } from '../db/models/user';
// import AdminVoteService from '../services/adminVoteServices';
// import WebPushService from '../services/webPushService';
// import FcmService from '../services/fcmService';

// const schedule = require('node-schedule');

// export function sendNoti() {
//   try {
//     const rule = new schedule.RecurrenceRule();
//     rule.dayOfWeek = [2, 3, 5, 6]; // 월, 화, 수, 금, 토
//     rule.hour = 18; // 오후 6시
//     rule.minute = 0;
//     rule.tz = 'Asia/Seoul'; // 한국 시간대

//     const webPushServiceInstance = new WebPushService();
//     const fcmServiceInstance = new FcmService();

//     const job = schedule.scheduleJob(
//       rule,
//       webPushServiceInstance.sendNotificationAllUser,
//       () =>
//         fcmServiceInstance.sendNotificationAllUser(
//           '스터디 투표',
//           '스터디 마감이 얼마 남지 않았어요. 지금 신청하세요!',
//         ),
//     );
//   } catch (err: any) {
//     throw new Error(err);
//   }
// }
// sendNoti();

// // export const noti = schedule.scheduleJob("*/1 * * * *", () => {
// //   console.log("Sending request...");
// //   const webPushServiceInstance = new WebPushService();
// //   webPushServiceInstance.sendNotificationAllUser();
// //   return;
// // });

// //투표 결과 발표
// export const voteResult = schedule.scheduleJob('0 9 * * *', async () => {
//   try {
//     const adminVoteServiceInstance = new AdminVoteService();
//     const webPushServiceInstance = new WebPushService();
//     const fcmServiceInstance = new FcmService();

//     const date = dayjs().format('YYYY-MM-DD');
//     await adminVoteServiceInstance.confirm(date);
//     await webPushServiceInstance.sendNotificationVoteResult();
//     await fcmServiceInstance.sendNotificationVoteResult();

//     console.log('vote result succeess.');
//   } catch (err: any) {
//     throw new Error(err);
//   }
// });

// //매월 monthScore 초기화
// export const initMonthScore = schedule.scheduleJob('0 0 1 * *', async () => {
//   try {
//     await User.updateMany({}, { monthScore: 0 });
//     console.log('month score init success');
//   } catch (err: any) {
//     throw new Error(err);
//   }
// });
