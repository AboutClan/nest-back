import { Module } from '@nestjs/common';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';
import { MongooseModule } from '@nestjs/mongoose';
import { GiftModel, giftSchema } from './entity/gift.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'GiftModel', schema: giftSchema }]),
  ],
  controllers: [GiftController],
  providers: [GiftService],
  exports: [GiftService, MongooseModule],
})
export class GiftModule {}
