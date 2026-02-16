import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import helmet from 'helmet';
import compression from 'compression';
import { TokenValidatorMiddleware } from './middlewares/tokenValidator';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './Database/database.module';
import { UserModule } from './MSA/User/user.module';
import { SquareModule } from './MSA/Square/square.module';
import { RequestModule } from './MSA/Notice/request.module';
import { RegisterModule } from './MSA/User/register.module';
import { PromotionModule } from './MSA/Event/promotion.module';
import { PlaceModule } from './MSA/Place/place.module';
import { NoticeModule } from './MSA/Notice/notice.module';
import { LogModule } from './routes/logz/log.module';
import { ImageModule } from './routes/imagez/image.module';
import { GiftModule } from './routes/gift/gift.module';
import { GatherModule } from './MSA/Gather/gather.module';
import { ChatModule } from './MSA/Chat/chat.module';
import { FeedModule } from './MSA/Feed/feed.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { CollectionModule } from './MSA/Event/collection.module';
import { RealtimeModule } from './MSA/Study/realtime.module';
import { AdminCounterModule } from './routes/admin/counter/adminCounter.module';
import { AdminUserModule } from './routes/admin/user/adminUser.module';
import { DailyCheckModule } from './MSA/Event/dailyCheck.module';
import { Vote2Module } from './MSA/Study/vote2.module';
import { PaymentModule } from './routes/payment/payment.module';
import { AsyncContextInterceptor } from './async-context.interceptor';
import { UrlTransformInterceptor } from './url-transform.interceptor';
import { BullModule } from '@nestjs/bull';
import { HttpExceptionFilter } from './errors/http-exception.filter';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ZodExceptionFilter } from './errors/zod-exception.filter';
import { LoggingMiddleware } from './middlewares/loggingMiddleware';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './schedule/schedule.module';
import { FcmAModule } from './MSA/Notification/fcm.module';
import { GatherRequestModule } from './MSA/Gather/gatherRequest.module';
import { PrizeModule } from './MSA/Store/prize.module';
import { StoreModule } from './MSA/Store/store.module';
import { GroupStudyModule } from './MSA/GroupStudy/groupStudy.module';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://about-aboutclub20s-projects.vercel.app',
  'https://studyabout.herokuapp.com',
]; // 허용하고자 하는 URL 목록을 배열로 작성

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 쿠키와 인증 정보를 허용하려면 설정
};

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.json(),
        }),
      ],
      format: winston.format.combine(
        // 1) 타임스탬프 자동 추가
        winston.format.timestamp(),

        // 2) 에러 객체를 넘겼을 때 stack까지 담아줌
        winston.format.errors({ stack: true }),

        // 3) 두 번째 인자로 넘긴 메타데이터를 info.metadata에 채워줌
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp', 'label'],
        }),

        // 4) 최종적으로 한 줄짜리 JSON으로 출력
        winston.format.printf((info: any) => {
          // info.metadata 안에 method, url, params, query, body 가 들어있습니다.
          return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            ...info.metadata,
          });
        }),
      ),
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    SchedulerModule,

    DatabaseModule,
    UserModule,
    SquareModule,
    RequestModule,
    RegisterModule,
    PromotionModule,
    PlaceModule,
    PrizeModule,
    NoticeModule,
    LogModule,
    ImageModule,
    GroupStudyModule,
    GiftModule,
    GatherModule,
    GatherRequestModule,
    FeedModule,
    ChatModule,
    CollectionModule,
    RealtimeModule,
    DailyCheckModule,
    AdminCounterModule,
    AdminUserModule,
    Vote2Module,
    PaymentModule,
    FcmAModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AsyncContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: UrlTransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        LoggingMiddleware,
        helmet(),
        compression(),
        // cors(corsOptions),
        TokenValidatorMiddleware,
      )
      .exclude(
        { path: 'payment/portone-webhook', method: RequestMethod.POST }, // 특정 경로 제외
      )
      .forRoutes('*');
  }
}
