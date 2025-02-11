import { IPromotion } from './promotion.entity';

export interface IPromotionService {
  getPromotion(): Promise<IPromotion[]>;
  setPromotion(name: string): Promise<void>;
}
