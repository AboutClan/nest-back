import { forwardRef, Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './entity/collection.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    MongooseModule.forFeature([
      { name: 'collection', schema: CollectionSchema },
    ]),
    RequestModule,
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService, MongooseModule],
})
export class CollectionModule {}
