export interface IFcmService {
  sendNotification(token: string, message: any): Promise<string>;

  deleteToken(uid: string, platform: string): Promise<void>;

  registerToken(uid: string, fcmToken: string, platform: string): Promise<void>;

  sendNotificationToX(uid: string, title: string, body: string): Promise<void>;

  sendNotificationAllUser(title: string, body: string): Promise<void>;

  sendNotificationVoteResult(): Promise<void>;
}
