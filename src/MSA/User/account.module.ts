import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountSchema } from '../entity/account.entity';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.ACCOUNT, schema: AccountSchema },
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [MongooseModule],
})
export class AccountModule {}
