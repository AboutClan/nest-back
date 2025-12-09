import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { storeSchema } from './store.entity';
import {
  IGIFT_REPOSITORY,
  IPRIZE_REPOSITORY,
  ISTORE_REPOSITORY,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { StoreRepository } from './StoreRepository';
import { UserService } from '../../User/user/user.service';
import { UserRepository } from '../../User/user/UserRepository';
import { UserSchema } from '../../User/user/user.entity';
import { MongoGiftRepository } from '../../../routes/gift/gift.repository';
import { giftSchema } from '../../../routes/gift/gift.entity';
import { PrizeRepository } from '../prize/PrizeRepository';
import { PrizeSchema } from '../prize/prize.entity';

const storeRepositoryProvider: ClassProvider = {
  provide: ISTORE_REPOSITORY,
  useClass: StoreRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

const giftRepositoryProvider: ClassProvider = {
  provide: IGIFT_REPOSITORY,
  useClass: MongoGiftRepository,
};

const prizeRepositoryProvider: ClassProvider = {
  provide: IPRIZE_REPOSITORY,
  useClass: PrizeRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.STORE, schema: storeSchema }]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.GIFT, schema: giftSchema }]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.PRIZE, schema: PrizeSchema }]),
  ],
  controllers: [StoreController],
  providers: [
    StoreService,
    storeRepositoryProvider,
    userRepositoryProvider,
    giftRepositoryProvider,
    prizeRepositoryProvider,
  ],
  exports: [StoreService, MongooseModule, storeRepositoryProvider],
})
export class StoreModule {}
