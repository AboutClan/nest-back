import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { RegisterModule } from 'src/MSA/User/register.module';
import { UserModule } from 'src/MSA/User/user.module';
import { CookiepayController } from './cookiepay.controller';
import { CookiepayService } from './cookiepay.service';
import { cookiepayOrderSchema } from './cookiepayOrder.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.COOKIEPAY_ORDER, schema: cookiepayOrderSchema },
    ]),
    RegisterModule,
    UserModule,
  ],
  controllers: [CookiepayController],
  providers: [CookiepayService],
})
export class CookiepayModule {}
