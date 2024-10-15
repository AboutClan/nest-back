import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import PromotionService from './promotion.service';
import { MongooseModule } from '@nestjs/mongoose';
import { promotionSchema } from './entity/promotion.entity';
import { UserModule } from 'src/user/user.module';
import { IPROMOTION_SERVICE } from 'src/utils/di.tokens';

const promotionServiceProvider: ClassProvider = {
  provide: IPROMOTION_SERVICE,
  useClass: PromotionService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Promotion', schema: promotionSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [PromotionController],
  providers: [promotionServiceProvider],
  exports: [promotionServiceProvider, MongooseModule],
})
export class PromotionModule {}
