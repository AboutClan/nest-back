import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { storeSchema } from './store.entity';
import { ISTORE_REPOSITORY } from 'src/utils/di.tokens';
import { StoreRepository } from './StoreRepository';

const storeRepositoryProvider: ClassProvider = {
  provide: ISTORE_REPOSITORY,
  useClass: StoreRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.STORE, schema: storeSchema }]),
  ],
  controllers: [StoreController],
  providers: [StoreService, storeRepositoryProvider],
  exports: [StoreService, MongooseModule, storeRepositoryProvider],
})
export class StoreModule {}
