import { ClassProvider, Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmTokenSchema } from './entity/fcmToken.entity';
import { IFCM_REPOSITORY, IFCM_SERVICE } from 'src/utils/di.tokens';
import { MongoFcmRepository } from './fcm.repository';

const fcmServiceProvider: ClassProvider = {
  provide: IFCM_SERVICE,
  useClass: FcmService,
};

const fcmRepositoryProvider: ClassProvider = {
  provide: IFCM_REPOSITORY,
  useClass: MongoFcmRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'FcmToken', schema: FcmTokenSchema }]),
  ],
  controllers: [FcmController],
  providers: [fcmServiceProvider, fcmRepositoryProvider],
  exports: [fcmServiceProvider, MongooseModule, fcmRepositoryProvider],
})
export class FcmAModule {}
