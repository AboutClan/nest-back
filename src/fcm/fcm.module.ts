import { ClassProvider, Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmToken, FcmTokenSchema } from './entity/fcmToken.entity';
import { IFCM_SERVICE } from 'src/utils/di.tokens';

const fcmServiceProvider: ClassProvider = {
  provide: IFCM_SERVICE,
  useClass: FcmService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'FcmToken', schema: FcmTokenSchema }]),
  ],
  controllers: [FcmController],
  providers: [fcmServiceProvider],
  exports: [fcmServiceProvider, MongooseModule],
})
export class FcmAModule {}
