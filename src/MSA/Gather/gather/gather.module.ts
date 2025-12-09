import { ClassProvider, Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './gather.entity';
import { UserModule } from 'src/MSA/User/user/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { WebPushModule } from 'src/routes/webpush/webpush.module';
import { GatherService } from './gather.service';
import { GatherRepository } from './GatherRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../../Notification/fcm/fcm.module';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CommentModule } from '../../../routes/comment/comment.module';

const gatherRepositoryProvider: ClassProvider = {
  provide: IGATHER_REPOSITORY,
  useClass: GatherRepository,
};

@Module({
  imports: [
    UserModule,
    CounterModule,
    MongooseModule.forFeature([
      { name: DB_SCHEMA.GATHER, schema: GatherSchema },
    ]),
    WebPushModule,
    FcmAModule,
    ImageModule,
    CommentModule,
  ],
  controllers: [GatherController],
  providers: [GatherService, gatherRepositoryProvider],
  exports: [GatherService, MongooseModule, gatherRepositoryProvider],
})
export class GatherModule {}
