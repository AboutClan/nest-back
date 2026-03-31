import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/MSA/User/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import { ImageModule } from 'src/routes/imagez/image.module';
import {
  IGATHERCOMMENT_REPOSITORY,
  IGATHER_REPOSITORY,
} from 'src/utils/di.tokens';
import { RequestModule } from '../Notice/request.module';
import { FcmAModule } from '../Notification/fcm.module';
import { GatherController } from './core/controllers/gather.controller';
import GatherCommentService from './core/services/comment.service';
import { GatherService } from './core/services/gather.service';
import { gatherCommentSchema } from './entity/comment.entity';
import { GatherSchema } from './entity/gather.entity';
import { MongoGatherCommentRepository } from './infra/MongoGatherCommentRepository';
import { GatherRepository } from './infra/MongoGatherRepository';

const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: GatherRepository,
};

const gatherCommentRepositoryProvider: ClassProvider = {
  provide: IGATHERCOMMENT_REPOSITORY,
  useClass: MongoGatherCommentRepository,
};
@Module({
  imports: [
    UserModule,
    CounterModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
      { name: DB_SCHEMA.GATHER_COMMENT, schema: gatherCommentSchema },
    ]),
    FcmAModule,
    ImageModule,
    RequestModule,
  ],
  controllers: [GatherController],
  providers: [
    GatherService,
    GatherCommentService,
    gatherRepositoryProvider,
    gatherCommentRepositoryProvider,
  ],
  exports: [GatherService, MongooseModule, gatherRepositoryProvider],
})
export class GatherModule {}
