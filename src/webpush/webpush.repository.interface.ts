import { INotificationSub } from './entity/notificationsub.entity';

export interface WebpushRepository {
  enrollSubscribe(uid: string, subscription: any): Promise<null>;
  //type이 잘 작동할지가 의문이네요
  findAll(): Promise<INotificationSub[]>;
  findByUid(uid: string): Promise<INotificationSub[]>;
  findByArray(targetArr: string[]): Promise<INotificationSub[]>;
}
