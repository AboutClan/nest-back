import { forwardRef, Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import PromotionService from './promotion.service';
import { UserService } from 'src/user/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Promotion, promotionSchema } from './entity/promotion.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Promotion', schema: promotionSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService, MongooseModule],
})
export class PromotionModule {}
