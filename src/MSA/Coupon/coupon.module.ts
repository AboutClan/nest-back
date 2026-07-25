import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ICOUPON_REPOSITORY } from 'src/utils/di.tokens';
import { CouponController } from './core/controllers/coupon.controller';
import { CouponService } from './core/services/coupon.service';
import { couponSchema } from './entity/coupon.entity';
import { couponIssueSchema } from './entity/couponIssue.entity';
import { MongoCouponRepository } from './infra/MongoCouponRepository';

const couponRepositoryProvider: ClassProvider = {
  provide: ICOUPON_REPOSITORY,
  useClass: MongoCouponRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.COUPON, schema: couponSchema },
      { name: DB_SCHEMA.COUPON_ISSUE, schema: couponIssueSchema },
    ]),
  ],
  controllers: [CouponController],
  providers: [CouponService, couponRepositoryProvider],
  exports: [CouponService, MongooseModule, couponRepositoryProvider],
})
export class CouponModule {}
