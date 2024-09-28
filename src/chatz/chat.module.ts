import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChatContoller } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [],
  controllers: [ChatContoller],
  providers: [ChatService],
  exports: [ChatService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {}
}
