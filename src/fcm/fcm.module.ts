import { Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FcmToken, FcmTokenSchema } from './entity/fcmToken.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'FcmToken', schema: FcmTokenSchema }]),
  ],
  controllers: [FcmController],
  providers: [FcmService],
  exports: [FcmService, MongooseModule],
})
export class FcmAModule {}
