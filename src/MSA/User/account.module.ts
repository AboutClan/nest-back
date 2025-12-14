import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { AccountSchema } from './entity/account.entity';

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
