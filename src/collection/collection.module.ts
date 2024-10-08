import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Request, RequestSchema } from 'src/request/entity/request.entity';
import { User, UserSchema } from 'src/user/entity/user.entity';
import { RequestModule } from 'src/request/request.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [RequestModule, UserModule],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
