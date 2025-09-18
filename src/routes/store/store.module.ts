import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { storeSchema } from './store.entity';
import { ISTORE_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { StoreRepository } from './StoreRepository';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/UserRepository';
import { UserSchema } from '../user/user.entity';

const storeRepositoryProvider: ClassProvider = {
  provide: ISTORE_REPOSITORY,
  useClass: StoreRepository,
};

const userServiceProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.STORE, schema: storeSchema }]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
  ],
  controllers: [StoreController],
  providers: [StoreService, storeRepositoryProvider, userServiceProvider],
  exports: [StoreService, MongooseModule, storeRepositoryProvider],
})
export class StoreModule {}
