import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountSchema } from './entity/account.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Account', schema: AccountSchema }]),
  ],
  controllers: [],
  providers: [],
  exports: [MongooseModule],
})
export class AccountModule {}
