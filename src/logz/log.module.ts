import { Module } from '@nestjs/common';
import { LogController } from './log.controller';
import LogService from './log.service';

@Module({
  imports: [],
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class AppModule {}
