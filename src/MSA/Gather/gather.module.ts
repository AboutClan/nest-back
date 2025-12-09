import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './entity/gather.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import {
  IGATHER_REPOSITORY,
  IGATHERCOMMENT_REPOSITORY,
} from 'src/utils/di.tokens';
import { GatherService } from './core/services/gather.service';
import { GatherRepository } from './infra/GatherRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { ImageModule } from 'src/routes/imagez/image.module';
import { GatherController } from './core/controllers/gather.controller';
import { MongoGatherCommentRepository } from './infra/MongoGatherCommentRepository';
import GatherCommentService from './core/services/comment.service';
import { gatherCommentSchema } from './entity/comment.entity';

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
