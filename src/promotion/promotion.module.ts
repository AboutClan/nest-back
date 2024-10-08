import { Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import PromotionService from './promotion.service';
import { UserService } from 'src/user/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Promotion, promotionSchema } from './entity/promotion.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: promotionSchema },
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService, UserService],
  exports: [PromotionService, MongooseModule],
})
export class PromotionModule {}
