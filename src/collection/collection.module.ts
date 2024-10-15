import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './entity/collection.entity';
import { UserModule } from 'src/user/user.module';
import { ICOLLECTION_SERVICE } from 'src/utils/di.tokens';

const collectionServiceProvider: ClassProvider = {
  provide: ICOLLECTION_SERVICE,
  useClass: CollectionService,
};

@Module({
  imports: [
    forwardRef(() => UserModule),
    MongooseModule.forFeature([
      { name: 'collection', schema: CollectionSchema },
    ]),
    RequestModule,
  ],
  controllers: [CollectionController],
  providers: [collectionServiceProvider],
  exports: [collectionServiceProvider, MongooseModule],
})
export class CollectionModule {}
