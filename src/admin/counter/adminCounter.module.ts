import { Module } from '@nestjs/common';
import { AdminCounterController } from './adminCounter.controller';
import { AdminCounterService } from './adminCounter.service';

@Module({
  imports: [],
  controllers: [AdminCounterController],
  providers: [AdminCounterService],
  exports: [AdminCounterService],
})
export class AdminCounterModule {}
