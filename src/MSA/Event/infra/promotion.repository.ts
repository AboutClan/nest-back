import { IPromotion } from '../entity/promotion.entity';

export interface PromotionRepository {
  findAll(): Promise<IPromotion[]>;
  findByName(name: string): Promise<IPromotion>;
  updatePromotion(
    name: string,
    promotionData: Partial<IPromotion>,
  ): Promise<null>;
  createPromotion(promotionData: Partial<IPromotion>): Promise<IPromotion>;
}
