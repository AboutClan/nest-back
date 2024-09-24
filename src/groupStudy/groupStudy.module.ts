import { Module } from '@nestjs/common';
import { GroupStudyController } from './groupStudy.controller';
import GroupStudyService from './groupStudy.service';

@Module({
  imports: [],
  controllers: [GroupStudyController],
  providers: [GroupStudyService],
  exports: [GroupStudyService],
})
export class AppModule {}
