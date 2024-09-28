import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import PromotionService from './promotion.service';

@Controller('promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  async getPromotion() {
    try {
      const promotionData = await this.promotionService.getPromotion();
      return promotionData;
    } catch (err) {
      throw new HttpException(
        'Error fetching promotion data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async setPromotion(@Body('name') name: string) {
    try {
      await this.promotionService.setPromotion(name);
      return { status: 'success' };
    } catch (err) {
      throw new HttpException(
        'Error setting promotion',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
