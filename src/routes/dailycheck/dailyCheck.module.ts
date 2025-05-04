import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyCheckController } from './dailyCheck.controller';
import { dailyCheckSchema } from './dailycheck.entity';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { DailyCheckService } from './dailyCheck.service';
import { UserModule } from 'src/routes/user/user.module';
import { DailyCheckRepository } from './DailyCheckRepository';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const dailyCheckRepositoryProvider: ClassProvider = {
  provide: IDAILYCHECK_REPOSITORY,
  useClass: DailyCheckRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_SCHEMA.DAILYCHECK, schema: dailyCheckSchema },
    ]),
    UserModule,
  ],
  controllers: [DailyCheckController],
  providers: [DailyCheckService, dailyCheckRepositoryProvider],
  exports: [DailyCheckService, MongooseModule, dailyCheckRepositoryProvider],
})
export class DailyCheckModule {}
