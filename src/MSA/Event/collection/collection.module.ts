import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/MSA/Notice/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './collection.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { ICOLLECTION_REPOSITORY, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { CollectionRepository } from './CollectionRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../../Notification/fcm/fcm.module';
import { UserRepository } from 'src/MSA/User/infra/UserRepository';

const collectionRepositoryProvider: ClassProvider = {
  provide: ICOLLECTION_REPOSITORY,
  useClass: CollectionRepository,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    RequestModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.COLLECTION, schema: CollectionSchema },
    ]),
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
