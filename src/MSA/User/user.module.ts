import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { UserController } from './core/controllers/user.controller';
import { PlaceModule } from 'src/MSA/Place/place.module';
import { LogModule } from 'src/routes/logz/log.module';
import { NoticeModule } from 'src/MSA/Notice/notice.module';
import { ILOG_MEMBERSHIP_REPOSITORY, IUSER_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './entity/user.entity';
import { LogMembershipSchema } from './entity/logMembership.entity';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CollectionModule } from 'src/MSA/Event/collection.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { PrizeModule } from '../Store/prize.module';
import { BackupModule } from 'src/Database/backup.module';
import { FcmAModule } from '../Notification/fcm.module';
import { UserRepository } from './infra/MongoUserRepository';
import { UserService } from './core/services/user.service';
import { LogMembershipRepository } from './infra/MongoLogMembershipRepository';

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

const logMembershipRepositoryProvider: ClassProvider = {
  provide: ILOG_MEMBERSHIP_REPOSITORY,
  useClass: LogMembershipRepository,
};
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.USER, schema: UserSchema },
      { name: DB_SCHEMA.LOG_MEMBERSHIP, schema: LogMembershipSchema },
    ]),
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
  providers: [UserService, userRepositoryProvider, logMembershipRepositoryProvider],
  exports: [UserService, userRepositoryProvider, logMembershipRepositoryProvider, MongooseModule],
})
export class UserModule { }
