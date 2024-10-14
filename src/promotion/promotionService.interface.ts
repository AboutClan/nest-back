import { IPromotion } from './entity/promotion.entity';

export interface IPromotionService {
  getPromotion(): Promise<IPromotion[]>;
  setPromotion(name: string): Promise<void>;
}
