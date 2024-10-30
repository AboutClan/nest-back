// import { Injectable } from '@nestjs/common';
// const PushNotifications = require('node-pushnotifications');

// @Injectable()
// export default class ScheduleService {
//   constructor() {}
//   async sendNotificationAllUser() {
//     const subscriptions = await this.WebpushRepository.findAll();

//     for (const subscription of subscriptions) {
//       try {
//         const push = new PushNotifications(this.settings);

//         // Create payload
//         await push.send(subscription, this.basePayload);
//       } catch (err) {
//         console.log(
//           `Failed to send notification to subscription: ${subscription}, error: ${err}`,
//         );
//         // Continue to the next subscription without breaking the loop
//         continue;
//       }
//     }

//     console.log('sending notification success');
//     return;
//   }
// }
