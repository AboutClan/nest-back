import { Module } from '@nestjs/common';
import { GatherController } from './gather.controller';
import GatherService from './gather.service';

@Module({
  imports: [],
  controllers: [GatherController],
  providers: [GatherService],
  exports: [GatherService],
})
export class AppModule {}
