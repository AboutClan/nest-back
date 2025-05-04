import { Module } from '@nestjs/common';
import { AdminLogController } from './adminLog.controller';
import AdminLogService from './adminLog.service';
import { LogModule } from 'src/routes/logz/log.module';

@Module({
  imports: [LogModule],
  controllers: [AdminLogController],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
