import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import NoticeService from './notice.service';

@Module({
  imports: [],
  controllers: [NoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class AppModule {}
