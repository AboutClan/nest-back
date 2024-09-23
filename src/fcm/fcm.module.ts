import { Module } from '@nestjs/common';
import { FcmController } from './fcm.controller';
import { FcmService } from './fcm.service';

@Module({
  imports: [],
  controllers: [FcmController],
  providers: [FcmService],
  exports: [FcmService],
})
export class AppModule {}
