import { ClassProvider, Module } from '@nestjs/common';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';
import { MongooseModule } from '@nestjs/mongoose';
import { giftSchema } from './entity/gift.entity';
import { IGIFT_SERVICE } from 'src/utils/di.tokens';

const giftServiceProvider: ClassProvider = {
  provide: IGIFT_SERVICE,
  useClass: GiftService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'GiftModel', schema: giftSchema }]),
  ],
  controllers: [GiftController],
  providers: [giftServiceProvider],
  exports: [giftServiceProvider, MongooseModule],
})
export class GiftModule {}
