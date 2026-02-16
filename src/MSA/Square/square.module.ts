import { ClassProvider, Module } from '@nestjs/common';
import { SquareController } from './core/controllers/square.controller';
import ImageService from 'src/routes/imagez/image.service';
import { MongooseModule } from '@nestjs/mongoose';
import { secretSquareSchema } from './entity/square.entity';
import { ISQUARE_REPOSITORY, ISQUARECOMMENT_REPOSITORY } from 'src/utils/di.tokens';
import { SquareRepository } from './infra/MongoSquareRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import SquareService from './core/services/square.service';
import { squareCommentSchema } from './entity/comment.entity';
import { MongoSquareCommentRepository } from './infra/MongoSquareCommentRepository';
import SquareCommentService from './core/services/comment.service';

const squareRepositoryProvider: ClassProvider = {
  provide: ISQUARE_REPOSITORY,
  useClass: SquareRepository,
};
const squareCommentRepositoryProvider: ClassProvider = {
  provide: ISQUARECOMMENT_REPOSITORY,
  useClass: MongoSquareCommentRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.SQUARE, schema: secretSquareSchema },
      { name: DB_SCHEMA.SQUARE_COMMENT, schema: squareCommentSchema },
    ]),
    FcmAModule,
  ],
  controllers: [SquareController],
  providers: [SquareService, SquareCommentService, ImageService, squareRepositoryProvider, squareCommentRepositoryProvider], // SquareCommentService 추가
  exports: [SquareService, MongooseModule, squareRepositoryProvider],
})
export class SquareModule { }