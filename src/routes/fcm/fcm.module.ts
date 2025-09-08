import { ClassProvider, Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmTokenSchema } from './fcmToken.entity';
import {
  IFCM_LOG_REPOSITORY,
  IFCM_REPOSITORY,
  IFCM_SERVICE,
  IREALTIME_REPOSITORY,
  IVOTE2_REPOSITORY,
} from 'src/utils/di.tokens';
import { MongoFcmRepository } from './fcm.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherSchema } from '../gather/gather.entity';
import { GroupStudySchema } from '../groupStudy/groupStudy.entity';
import { MongoFcmLogRepository } from './fcmLog.repository';
import { FcmLogSchema } from './fcmLog.entity';
import { Vote2Repository } from '../vote2/Vote2Repository';
import { Vote2Schema } from '../vote2/vote2.entity';
import { RealtimeRepository } from '../realtime/RealtimeRepository';
import { RealtimeSchema } from '../realtime/realtime.entity';

const fcmRepositoryProvider: ClassProvider = {
  provide: IFCM_REPOSITORY,
  useClass: MongoFcmRepository,
};

const fcmLogRepositoryProvider: ClassProvider = {
  provide: IFCM_LOG_REPOSITORY,
  useClass: MongoFcmLogRepository,
};

const vote2RepositoryProvider: ClassProvider = {
  provide: IVOTE2_REPOSITORY,
  useClass: Vote2Repository,
};

const realtimeRepositoryProvider: ClassProvider = {
  provide: IREALTIME_REPOSITORY,
  useClass: RealtimeRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GROUPSTUDY, schema: GroupStudySchema },
    ]),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
    ]),
    MongooseModule.forFeature([{ name: 'FcmToken', schema: FcmTokenSchema }]),
    MongooseModule.forFeature([{ name: 'FcmLog', schema: FcmLogSchema }]),
    MongooseModule.forFeature([{ name: DB_SCHEMA.VOTE, schema: Vote2Schema }]),
    MongooseModule.forFeature([
      { name: DB_SCHEMA.REALTIME, schema: RealtimeSchema },
    ]),
  ],
  controllers: [FcmController],
  providers: [
    FcmService,
    fcmRepositoryProvider,
    fcmLogRepositoryProvider,
    vote2RepositoryProvider,
    realtimeRepositoryProvider,
  ],
  exports: [
    FcmService,
    MongooseModule,
    fcmRepositoryProvider,
    fcmLogRepositoryProvider,
  ],
})
export class FcmAModule {}
