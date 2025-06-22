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
import { DatabaseModule } from './database.module';
import { WebPushModule } from './routes/webpush/webpush.module';
import { VoteModule } from './vote/vote.module';
import { UserModule } from './routes/user/user.module';
import { StaticModule } from './routes/statics/static.module';
import { SquareModule } from './routes/square/square.module';
import { RequestModule } from './routes/request/request.module';
import { RegisterModule } from './routes/register/register.module';
import { PromotionModule } from './routes/promotion/promotion.module';
import { PlaceModule } from './routes/place/place.module';
import { NoticeModule } from './routes/notice/notice.module';
import { LogModule } from './routes/logz/log.module';
import { ImageModule } from './imagez/image.module';
import { GroupStudyModule } from './routes/groupStudy/groupStudy.module';
import { GiftModule } from './routes/gift/gift.module';
import { GatherModule } from './routes/gather/gather.module';
import { ChatModule } from './routes/chatz/chat.module';
import { BookModule } from './book/book.module';
import { FeedModule } from './routes/feed/feed.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
// import { RequestContextInterceptor } from './request-context.intercepter';
import { CollectionModule } from './routes/collection/collection.module';
import { RealtimeModule } from './routes/realtime/realtime.module';
import { AdminCounterModule } from './admin/counter/adminCounter.module';
import { AdminLogModule } from './admin/log/adminLog.module';
import { AdminUserModule } from './admin/user/adminUser.module';
import { AdminVoteModule } from './admin/vote/adminVote.module';
import { AdminManageModule } from './admin/manage/adminManage.module';
import { DailyCheckModule } from './routes/dailycheck/dailyCheck.module';
import { Vote2Module } from './routes/vote2/vote2.module';
import { PaymentModule } from './routes/payment/payment.module';
import { AsyncContextInterceptor } from './async-context.interceptor';
import { BullModule } from '@nestjs/bull';
import { HttpExceptionFilter } from './http-exception.filter';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ZodExceptionFilter } from './zod-exception.filter';
import { LoggingMiddleware } from './middlewares/loggingMiddleware';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './schedule/schedule.module';
import { AnnouncementModule } from './routes/announcement/announcement.module';
import { FcmAModule } from './routes/fcm/fcm.module';
import { GatherRequestModule } from './routes/gatherRequest/gatherRequest.module';

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
    WebPushModule,
    VoteModule,
    UserModule,
    StaticModule,
    SquareModule,
    RequestModule,
    RegisterModule,
    PromotionModule,
    PlaceModule,
    NoticeModule,
    LogModule,
    ImageModule,
    GroupStudyModule,
    GiftModule,
    GatherModule,
    GatherRequestModule,
    FeedModule,
    ChatModule,
    BookModule,
    CollectionModule,
    RealtimeModule,
    DailyCheckModule,
    AdminCounterModule,
    AdminLogModule,
    AdminUserModule,
    AdminVoteModule,
    AdminManageModule,
    Vote2Module,
    PaymentModule,
    AnnouncementModule,
    FcmAModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: ZodExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AsyncContextInterceptor },
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
