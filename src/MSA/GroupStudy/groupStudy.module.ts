import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/MSA/User/user.module';
import { RedisModule } from 'src/redis/redis.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import {
  IGATHER_REPOSITORY,
  IGROUPCOMMENT_REPOSITORY,
  IGROUPSTUDY_REPOSITORY,
  ILOG_TEMPERATURE_REPOSITORY,
} from 'src/utils/di.tokens';
import { OpenAIModule } from 'src/utils/gpt/gpt.module';
import { GatherSchema } from '../Gather/entity/gather.entity';
import { GatherRepository } from '../Gather/infra/MongoGatherRepository';
import { noticeSchema } from '../Notice/entity/notice.entity';
import { FcmAModule } from '../Notification/fcm.module';
import { LogTemperatureSchema } from '../User/entity/logTemperature.entity';
import { LogTemperatureRepository } from '../User/infra/MongoLogTemperatureRepository';
import { GroupStudyController } from './core/controllers/groupStudy.controller';
import GroupCommentService from './core/services/groupComment.service';
import GroupStudyService from './core/services/groupStudy.service';
import { groupCommentSchema } from './entity/groupComment.entity';
import { GroupStudySchema } from './entity/groupStudy.entity';
import { MongoGroupCommentRepository } from './infra/MongoGroupCommentRepository';
import { GroupStudyRepository } from './infra/MongoGroupStudyRepository';

const groupStudyRepositoryProvider: ClassProvider = {
  provide: IGROUPSTUDY_REPOSITORY,
  useClass: GroupStudyRepository,
};
const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: GatherRepository,
};
const logTemperatureRepositoryProvider: ClassProvider = {
  provide: ILOG_TEMPERATURE_REPOSITORY,
  useClass: LogTemperatureRepository,
};

const groupCommentRepositoryProvider: ClassProvider = {
  provide: IGROUPCOMMENT_REPOSITORY,
  useClass: MongoGroupCommentRepository,
};

@Module({
  imports: [
    RedisModule,
    UserModule,
    CounterModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GROUPSTUDY, schema: GroupStudySchema },
      { name: DB_SCHEMA.NOTICE, schema: noticeSchema },
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
      { name: DB_SCHEMA.GROUP_COMMENT, schema: groupCommentSchema },
      { name: DB_SCHEMA.LOG_TEMPERATURE, schema: LogTemperatureSchema },
    ]),
    FcmAModule,
    OpenAIModule,
  ],
  controllers: [GroupStudyController],
  providers: [
    GroupStudyService,
    GroupCommentService,
    groupStudyRepositoryProvider,
    logTemperatureRepositoryProvider,
    gatherRepositoryProvider,
    groupCommentRepositoryProvider,
  ],
  exports: [
    GroupStudyService,
    MongooseModule,
    groupStudyRepositoryProvider,
    logTemperatureRepositoryProvider,
  ],
})
export class GroupStudyModule {}
