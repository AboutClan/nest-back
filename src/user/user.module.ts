import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PlaceModule } from 'src/place/place.module';
import { VoteModule } from 'src/vote/vote.module';
import { LogModule } from 'src/logz/log.module';
import { NoticeModule } from 'src/notice/notice.module';
import { IUSER_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { MongoUserRepository } from './user.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.entity';
import { ImageModule } from 'src/imagez/image.module';

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: MongoUserRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    forwardRef(() => VoteModule),
    PlaceModule,
    LogModule,
    forwardRef(() => NoticeModule),
    ImageModule,
  ],
  controllers: [UserController],
  providers: [UserService, userRepositoryProvider],
  exports: [UserService, userRepositoryProvider, MongooseModule],
})
export class UserModule {}
