import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatherSchema } from './entity/gather.entity';
import { UserModule } from 'src/MSA/User/user.module';
import { CounterModule } from 'src/routes/counter/couter.module';
import { IGATHER_REPOSITORY } from 'src/utils/di.tokens';
import { GatherService } from './core/services/gather.service';
import { GatherRepository } from './infra/GatherRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { FcmAModule } from '../Notification/fcm.module';
import { ImageModule } from 'src/routes/imagez/image.module';
import { CommentModule } from '../../routes/comment/comment.module';
import { GatherController } from './core/controllers/gather.controller';

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
    FcmAModule,
    ImageModule,
    CommentModule,
  ],
  controllers: [GatherController],
  providers: [GatherService, gatherRepositoryProvider],
  exports: [GatherService, MongooseModule, gatherRepositoryProvider],
})
export class GatherModule {}
