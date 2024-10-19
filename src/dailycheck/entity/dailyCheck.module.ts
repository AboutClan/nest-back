import { ClassProvider, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyCheckController } from './dailyCheck.controller';
import { DailyCheck } from './dailycheck.entity';
import { IDAILYCHECK_SERVICE } from 'src/utils/di.tokens';
import { DailyCheckService } from './dailyCheck.service';

const dailyCheckServiceProvider: ClassProvider = {
  provide: IDAILYCHECK_SERVICE,
  useClass: DailyCheckService,
};

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'DailyCheck', schema: DailyCheck }]),
  ],
  controllers: [DailyCheckController],
  providers: [dailyCheckServiceProvider],
  exports: [dailyCheckServiceProvider, MongooseModule],
})
export class FcmAModule {}
