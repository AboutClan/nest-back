import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './collection.entity';
import { UserModule } from 'src/user/user.module';
import {
  ICOLLECTION_REPOSITORY,
  ICOLLECTION_SERVICE,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { MongoCollectionRepository } from './collection.repository';
import { MongoUserRepository } from 'src/user/user.repository';

const collectionServiceProvider: ClassProvider = {
  provide: ICOLLECTION_SERVICE,
  useClass: CollectionService,
};

const collectionRepositoryProvider: ClassProvider = {
  provide: ICOLLECTION_REPOSITORY,
  useClass: MongoCollectionRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: MongoUserRepository,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    RequestModule,
    MongooseModule.forFeature([
      { name: 'collection', schema: CollectionSchema },
    ]),
  ],
  controllers: [CollectionController],
  providers: [
    collectionServiceProvider,
    collectionRepositoryProvider,
    userRepositoryProvider,
  ],
  exports: [
    collectionServiceProvider,
    MongooseModule,
    collectionRepositoryProvider,
  ],
})
export class CollectionModule {}
