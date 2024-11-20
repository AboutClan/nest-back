import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyCheckController } from './dailyCheck.controller';
import { DailyCheck, dailyCheckSchema } from './dailycheck.entity';
import {
  IDAILYCHECK_REPOSITORY,
  IDAILYCHECK_SERVICE,
} from 'src/utils/di.tokens';
import { DailyCheckService } from './dailyCheck.service';
import { MongoDailyCheckRepository } from './dailyCheck,repository';
import { UserModule } from 'src/user/user.module';

const dailyCheckServiceProvider: ClassProvider = {
  provide: IDAILYCHECK_SERVICE,
  useClass: DailyCheckService,
};

const dailyCheckRepositoryProvider: ClassProvider = {
  provide: IDAILYCHECK_REPOSITORY,
  useClass: MongoDailyCheckRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DailyCheck', schema: dailyCheckSchema },
    ]),
    UserModule,
  ],
  controllers: [DailyCheckController],
  providers: [dailyCheckServiceProvider, dailyCheckRepositoryProvider],
  exports: [
    dailyCheckServiceProvider,
    MongooseModule,
    dailyCheckRepositoryProvider,
  ],
})
export class DailyCheckModule {}
