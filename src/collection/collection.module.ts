import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Request, RequestSchema } from 'src/request/entity/request.entity';
import { User, UserSchema } from 'src/user/entity/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Request.name, schema: RequestSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
