import { Module } from '@nestjs/common';
import { WebPushController } from './webpush.controller';
import { WebPushService } from './webpush.service';

@Module({
  imports: [],
  controllers: [WebPushController],
  providers: [WebPushService],
  exports: [WebPushService],
})
export class AppModule {}
