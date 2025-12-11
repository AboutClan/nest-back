import { ClassProvider, Module } from '@nestjs/common';
import { SquareController } from './core/controllers/square.controller';
import ImageService from 'src/routes/imagez/image.service';
import { MongooseModule } from '@nestjs/mongoose';
import { secretSquareSchema } from './entity/square.entity';
import { ISQUARE_REPOSITORY, ISQUARE_SERVICE } from 'src/utils/di.tokens';
import { SquareRepository } from './infra/square.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { CommentModule } from '../../routes/comment/comment.module';
import SquareService from './core/services/square.service';

const squareRepositoryProvider: ClassProvider = {
  provide: ISQUARE_REPOSITORY,
  useClass: SquareRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.SQUARE, schema: secretSquareSchema },
    ]),
    FcmAModule,
    CommentModule,
  ],
  controllers: [SquareController],
  providers: [SquareService, ImageService, squareRepositoryProvider],
  exports: [SquareService, MongooseModule, squareRepositoryProvider],
})
export class SquareModule {}
