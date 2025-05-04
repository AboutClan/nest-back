import { ClassProvider, Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { IPAYMENT_REPOSITORY } from 'src/utils/di.tokens';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { MongooseModule } from '@nestjs/mongoose';
import { paymentSchema } from './payment.entity';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const paymentRepositoryProvider: ClassProvider = {
  provide: IPAYMENT_REPOSITORY,
  useClass: PaymentRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.PAYMENT, schema: paymentSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, paymentRepositoryProvider],
  exports: [MongooseModule],
})
export class PaymentModule {}
