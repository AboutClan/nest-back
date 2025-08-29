import { ClassProvider, Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmTokenSchema } from './fcmToken.entity';
import {
  IFCM_LOG_REPOSITORY,
  IFCM_REPOSITORY,
  IFCM_SERVICE,
} from 'src/utils/di.tokens';
import { MongoFcmRepository } from './fcm.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherSchema } from '../gather/gather.entity';
import { GroupStudySchema } from '../groupStudy/groupStudy.entity';
import { MongoFcmLogRepository } from './fcmLog.repository';
import { FcmLogSchema } from './fcmLog.entity';

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
export class FcmAModule {}
