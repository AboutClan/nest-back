import { ClassProvider, forwardRef, Module } from '@nestjs/common';
import { UserController } from './core/controllers/user.controller';
import { PlaceModule } from 'src/MSA/Place/place/place.module';
import { LogModule } from 'src/routes/logz/log.module';
import { NoticeModule } from 'src/MSA/Notice/notice/notice.module';
import { IUSER_REPOSITORY, IUSER_SERVICE } from 'src/utils/di.tokens';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './entity/user.entity';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CollectionModule } from 'src/MSA/Event/collection/collection.module';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { PrizeModule } from '../Store/prize.module';
import { BackupModule } from 'src/Database/backup.module';
import { FcmAModule } from '../Notification/fcm/fcm.module';
import { UserRepository } from './infra/UserRepository';
import { UserService } from './core/services/user.service';

const userRepositoryProvider: ClassProvider = {
  provide: IUSER_REPOSITORY,
  useClass: UserRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DB_SCHEMA.USER, schema: UserSchema }]),
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
