import { ClassProvider, Module } from '@nestjs/common';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';
import { MongooseModule } from '@nestjs/mongoose';
import { giftSchema } from './gift.entity';
import { IGIFT_REPOSITORY } from 'src/utils/di.tokens';
import { MongoGiftRepository } from './gift.repository';

const giftRepositoryProvider: ClassProvider = {
  provide: IGIFT_REPOSITORY,
  useClass: MongoGiftRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'GiftModel', schema: giftSchema }]),
  ],
  controllers: [GiftController],
  providers: [GiftService, giftRepositoryProvider],
  exports: [GiftService, MongooseModule, giftRepositoryProvider],
})
export class GiftModule {}
