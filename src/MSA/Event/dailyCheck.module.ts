import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { UserModule } from 'src/MSA/User/user.module';
import { IDAILYCHECK_REPOSITORY } from 'src/utils/di.tokens';
import { CollectionModule } from './collection.module';
import { dailyCheckSchema } from './entity/dailycheck.entity';
import { DailyCheckService } from './core/services/dailyCheck.service';
import { DailyCheckRepository } from './infra/DailyCheckRepository';
import { DailyCheckController } from './core/controllers/dailyCheck.controller';

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
    CollectionModule,
  ],
  controllers: [DailyCheckController],
  providers: [DailyCheckService, dailyCheckRepositoryProvider],
  exports: [DailyCheckService, MongooseModule, dailyCheckRepositoryProvider],
})
export class DailyCheckModule {}
