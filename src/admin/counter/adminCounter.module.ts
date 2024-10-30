import { Module } from '@nestjs/common';
import { AdminCounterController } from './adminCounter.controller';
import { AdminCounterService } from './adminCounter.service';
import { CounterModule } from 'src/counter/couter.module';

@Module({
  imports: [CounterModule],
  controllers: [AdminCounterController],
  providers: [AdminCounterService],
  exports: [AdminCounterService],
})
export class AdminCounterModule {}
