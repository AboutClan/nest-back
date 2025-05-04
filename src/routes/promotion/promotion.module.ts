import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import PromotionService from './promotion.service';
import { MongooseModule } from '@nestjs/mongoose';
import { promotionSchema } from './promotion.entity';
import { UserModule } from 'src/routes/user/user.module';
import { IPROMOTION_REPOSITORY, IPROMOTION_SERVICE } from 'src/utils/di.tokens';
import { MongoPromotionRepository } from './promotion.repository.interface';

const promotionRepositoryProvider: ClassProvider = {
  provide: IPROMOTION_REPOSITORY,
  useClass: MongoPromotionRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Promotion', schema: promotionSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [PromotionController],
  providers: [PromotionService, promotionRepositoryProvider],
  exports: [PromotionService, MongooseModule, promotionRepositoryProvider],
})
export class PromotionModule {}
