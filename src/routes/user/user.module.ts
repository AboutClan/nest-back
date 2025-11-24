import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PlaceModule } from 'src/routes/place/place.module';
import { VoteModule } from 'src/vote/vote.module';
import { LogModule } from 'src/routes/logz/log.module';
import { NoticeModule } from 'src/routes/notice/notice.module';
import { IUSER_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './user.entity';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CollectionModule } from 'src/routes/collection/collection.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserRepository } from './UserRepository';
import { PrizeModule } from '../prize/prize.module';
import { BackupModule } from 'src/Database/backup.module';
import { FcmAModule } from '../fcm/fcm.module';

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
    forwardRef(() => VoteModule),
    PlaceModule,
    LogModule,
    forwardRef(() => NoticeModule),
    ImageModule,
    CollectionModule,
    PrizeModule,
    BackupModule,
    FcmAModule,
  ],
  controllers: [UserController],
  providers: [UserService, userRepositoryProvider],
  exports: [UserService, userRepositoryProvider, MongooseModule],
})
export class UserModule {}
