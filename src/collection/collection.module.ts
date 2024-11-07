import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './entity/collection.entity';
import { UserModule } from 'src/user/user.module';
import {
  ICOLLECTION_REPOSITORY,
  ICOLLECTION_SERVICE,
} from 'src/utils/di.tokens';
import { MongoCollectionRepository } from './collection.repository';

const collectionServiceProvider: ClassProvider = {
  provide: ICOLLECTION_SERVICE,
  useClass: CollectionService,
};

const collectionRepositoryProvider: ClassProvider = {
  provide: ICOLLECTION_REPOSITORY,
  useClass: MongoCollectionRepository,
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
  providers: [collectionServiceProvider, collectionRepositoryProvider],
  exports: [
    collectionServiceProvider,
    MongooseModule,
    collectionRepositoryProvider,
  ],
})
export class CollectionModule {}
