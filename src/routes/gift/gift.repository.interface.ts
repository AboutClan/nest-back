import { IStoreApplicant } from './gift.entity';

export interface GiftRepository {
  findAllSort(): Promise<IStoreApplicant[]>;
  findById(giftId: number): Promise<IStoreApplicant[]>;
  findByUidGiftId(uid: string, giftId: string): Promise<IStoreApplicant>;
  updateGift(uid: string, giftData: Partial<IStoreApplicant>);
  createGift(giftData: Partial<IStoreApplicant>): Promise<IStoreApplicant>;
}
