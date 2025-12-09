import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import PromotionService from './core/services/promotion.service';
import { MongooseModule } from '@nestjs/mongoose';
import { promotionSchema } from './entity/promotion.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { IPROMOTION_REPOSITORY } from 'src/utils/di.tokens';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { MongoPromotionRepository } from './core/interfaces/promotion.repository.interface';
import { PromotionController } from './core/controllers/promotion.controller';

const promotionRepositoryProvider: ClassProvider = {
  provide: IPROMOTION_REPOSITORY,
  useClass: MongoPromotionRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.PROMOTION, schema: promotionSchema },
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [PromotionController],
  providers: [PromotionService, promotionRepositoryProvider],
  exports: [PromotionService, MongooseModule, promotionRepositoryProvider],
})
export class PromotionModule {}
