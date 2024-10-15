export const WEB_PUSH_SERVICE = Symbol('IWebPushService');

export interface IWebPushService {
  subscribe(subscription: any): Promise<void>;
  sendNotificationAllUser(): Promise<void>;
  sendNotificationToX(
    uid: string,
    title?: string,
    description?: string,
  ): Promise<void>;
  sendNotificationGroupStudy(groupStudyId: string): Promise<void>;
  sendNotificationToManager(location: string): Promise<void>;
  sendNotificationVoteResult(): Promise<void>;
}
