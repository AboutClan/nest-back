import {
  ClassProvider,
  forwardRef,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './entity/user.entity';
import { PlaceModule } from 'src/place/place.module';
import { VoteModule } from 'src/vote/vote.module';
import { PromotionModule } from 'src/promotion/promotion.module';
import { LogModule } from 'src/logz/log.module';
import { NoticeModule } from 'src/notice/notice.module';
import { CounterModule } from 'src/counter/couter.module';
import { IUSER_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { MongoUserRepository } from './user.repository';

const userServiceProvider: ClassProvider = {
  provide: IUSER_SERVICE,
  useClass: UserService,
};

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: MongoUserRepository,
};

@Module({
  imports: [
    forwardRef(() => VoteModule),
    PlaceModule,
    forwardRef(() => PromotionModule),
    LogModule,
    forwardRef(() => NoticeModule),
  ],
  controllers: [UserController],
  providers: [userRepositoryProvider],
  exports: [userServiceProvider, userRepositoryProvider],
})
export class UserModule {}
