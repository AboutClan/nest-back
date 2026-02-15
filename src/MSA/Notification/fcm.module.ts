import { ClassProvider, Module } from '@nestjs/common';
import { FcmService } from './core/services/fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmTokenSchema } from './entity/fcmToken.entity';
import { IFCM_LOG_REPOSITORY, IFCM_REPOSITORY } from 'src/utils/di.tokens';
import { MongoFcmRepository } from './infra/MongoFcmRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherSchema } from '../Gather/entity/gather.entity';
import { GroupStudySchema } from '../GroupStudy/entity/groupStudy.entity';
import { MongoFcmLogRepository } from './infra/MongoFcmLogRepository';
import { FcmLogSchema } from './entity/fcmLog.entity';
import { Vote2Schema } from '../Study/entity/vote2.entity';
import { RealtimeSchema } from '../Study/entity/realtime.entity';
import { FcmController } from './core/controllers/fcm.controller';

const fcmRepositoryProvider: ClassProvider = {
  provide: IFCM_REPOSITORY,
  useClass: MongoFcmRepository,
};

const fcmLogRepositoryProvider: ClassProvider = {
  provide: IFCM_LOG_REPOSITORY,
  useClass: MongoFcmLogRepository,
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
  providers: [FcmService, fcmRepositoryProvider, fcmLogRepositoryProvider],
  exports: [
    FcmService,
    MongooseModule,
    fcmRepositoryProvider,
    fcmLogRepositoryProvider,
  ],
})
export class FcmAModule { }
