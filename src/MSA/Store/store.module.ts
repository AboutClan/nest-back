import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './core/controllers/store.controller';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { storeSchema } from './entity/store.entity';
import {
  IGIFT_REPOSITORY,
  IPRIZE_REPOSITORY,
  ISTORE_REPOSITORY,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { StoreRepository } from './infra/MongoStoreRepository';
import { UserSchema } from '../User/entity/user.entity';
import { MongoGiftRepository } from '../../routes/gift/gift.repository';
import { giftSchema } from '../../routes/gift/gift.entity';
import { PrizeRepository } from './infra/MongoPrizeRepository';
import { PrizeSchema } from './entity/prize.entity';
import { UserRepository } from 'src/MSA/User/infra/MongoUserRepository';
import { StoreService } from './core/services/store.service';

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
export class StoreModule { }
