import { IStoreApplicant } from './gift.entity';

export interface IGiftService {
  getAllGift(): Promise<IStoreApplicant[]>;
  getGift(id: number): Promise<IStoreApplicant[]>;
  setGift(name: string, cnt: number, giftId: number): Promise<IStoreApplicant>;
}
