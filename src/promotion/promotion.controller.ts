import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { IPROMOTION_SERVICE } from 'src/utils/di.tokens';
import { IPromotionService } from './promotionService.interface';

@Controller('promotion')
export class PromotionController {
  constructor(
    @Inject(IPROMOTION_SERVICE) private promotionService: IPromotionService,
  ) {}

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
