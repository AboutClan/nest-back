import { Module } from '@nestjs/common';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';

@Module({
  imports: [],
  controllers: [GiftController],
  providers: [GiftService],
  exports: [GiftService],
})
export class AppModule {}
