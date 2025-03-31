import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './collection.entity';
import { UserModule } from 'src/user/user.module';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoUserRepository } from 'src/user/user.repository';
import { CollectionRepository } from './CollectionRepository';

const collectionRepositoryProvider: ClassProvider = {
  provide: ICOLLECTION_REPOSITORY,
  useClass: CollectionRepository,
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
    CollectionService,
    collectionRepositoryProvider,
    userRepositoryProvider,
  ],
  exports: [CollectionService, MongooseModule, collectionRepositoryProvider],
})
export class CollectionModule {}
