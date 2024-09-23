import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebPushController } from './webpush/webpush.controller';
import { WebPushService } from './webpush/webpush.service';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { TokenValidatorMiddleware } from './middlewares/tokenValidator';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  controllers: [AppController, WebPushController],
  providers: [AppService, WebPushService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(helmet(), cors(), compression(), TokenValidatorMiddleware)
      .forRoutes('*');
  }
}
