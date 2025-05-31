import { ClassProvider, Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmTokenSchema } from './fcmToken.entity';
import { IFCM_REPOSITORY, IFCM_SERVICE } from 'src/utils/di.tokens';
import { MongoFcmRepository } from './fcm.repository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { GatherSchema } from '../gather/gather.entity';
import { GroupStudySchema } from '../groupStudy/groupStudy.entity';

const fcmRepositoryProvider: ClassProvider = {
  provide: IFCM_REPOSITORY,
  useClass: MongoFcmRepository,
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
  ],
  controllers: [FcmController],
  providers: [FcmService, fcmRepositoryProvider],
  exports: [FcmService, MongooseModule, fcmRepositoryProvider],
})
export class FcmAModule {}
