import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/routes/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './collection.entity';
import { UserModule } from 'src/routes/user/user.module';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { MongoUserRepository } from 'src/routes/user/user.repository';
import { CollectionRepository } from './CollectionRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WebPushModule } from '../webpush/webpush.module';
import { FcmAModule } from '../fcm/fcm.module';

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
      { name: DB_SCHEMA.COLLECTION, schema: CollectionSchema },
    ]),
    forwardRef(() => WebPushModule),
    forwardRef(() => FcmAModule),
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
