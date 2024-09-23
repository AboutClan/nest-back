import { Module } from '@nestjs/common';
import { DailyCheckController } from './dailyCheck.controller';
import { DailyCheckService } from './dailyCheck.service';

@Module({
  imports: [],
  controllers: [DailyCheckController],
  providers: [DailyCheckService],
  exports: [DailyCheckService],
})
export class AppModule {}
