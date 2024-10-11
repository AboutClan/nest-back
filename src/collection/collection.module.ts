import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { RequestModule } from 'src/request/request.module';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CollectionSchema } from './entity/collection.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'collection', schema: CollectionSchema },
    ]),
    RequestModule,
    UserModule,
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
