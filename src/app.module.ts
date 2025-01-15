import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import helmet from 'helmet';
import compression from 'compression';
import { TokenValidatorMiddleware } from './middlewares/tokenValidator';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database.module';
import { WebPushModule } from './webpush/webpush.module';
import { VoteModule } from './vote/vote.module';
import { UserModule } from './user/user.module';
import { StaticModule } from './statics/static.module';
import { SquareModule } from './square/square.module';
import { RequestModule } from './request/request.module';
import { RegisterModule } from './register/register.module';
import { PromotionModule } from './promotion/promotion.module';
import { PlaceModule } from './place/place.module';
import { NoticeModule } from './notice/notice.module';
import { LogModule } from './logz/log.module';
import { ImageModule } from './imagez/image.module';
import { GroupStudyModule } from './groupStudy/groupStudy.module';
import { GiftModule } from './gift/gift.module';
import { GatherModule } from './gather/gather.module';
import { ChatModule } from './chatz/chat.module';
import { BookModule } from './book/book.module';
import { FeedModule } from './feed/feed.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { RequestContextInterceptor } from './request-context.intercepter';
import { CollectionModule } from './collection/collection.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AdminCounterModule } from './admin/counter/adminCounter.module';
import { AdminLogModule } from './admin/log/adminLog.module';
import { AdminUserModule } from './admin/user/adminUser.module';
import { AdminVoteModule } from './admin/vote/adminVote.module';
import { AdminManageModule } from './admin/manage/adminManage.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationScheduler } from './schedule/schedule';
import { DailyCheckModule } from './dailycheck/dailyCheck.module';
import { Vote2Module } from './vote2/vote2.module';

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
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    NotificationScheduler,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        helmet(),
        compression(),
        // cors(corsOptions),
        TokenValidatorMiddleware,
      )
      .forRoutes('*');
  }
}
