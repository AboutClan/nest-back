import { ClassProvider, Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import SquareService from './square.service';
import ImageService from 'src/routes/imagez/image.service';
import { MongooseModule } from '@nestjs/mongoose';
import { secretSquareSchema } from './square.entity';
import { ISQUARE_REPOSITORY, ISQUARE_SERVICE } from 'src/utils/di.tokens';
import { SquareRepository } from './square.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { WebPushModule } from '../webpush/webpush.module';
import { FcmAModule } from '../fcm/fcm.module';
import { CommentModule } from '../comment/comment.module';

const squareRepositoryProvider: ClassProvider = {
  provide: ISQUARE_REPOSITORY,
  useClass: SquareRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.SQUARE, schema: secretSquareSchema },
    ]),
    WebPushModule,
    FcmAModule,
    CommentModule,
  ],
  controllers: [SquareController],
  providers: [SquareService, ImageService, squareRepositoryProvider],
  exports: [SquareService, MongooseModule, squareRepositoryProvider],
})
export class SquareModule {}
