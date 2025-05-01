import { ClassProvider, Module } from '@nestjs/common';
import { IANNOUNCEMENT_REPOSITORY } from 'src/utils/di.tokens';
import { AnnouncementRepository } from './AnnouncementRepository';
import { MongooseModule } from '@nestjs/mongoose';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { AnnouncementSchema } from './announcement.entity';

const announcementRepositoryProvider: ClassProvider = {
  provide: IANNOUNCEMENT_REPOSITORY,
  useClass: AnnouncementRepository,
};

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Announcement', schema: AnnouncementSchema },
    ]),
  ],
  controllers: [AnnouncementController],
  providers: [announcementRepositoryProvider, AnnouncementService],
  exports: [MongooseModule, announcementRepositoryProvider],
})
export class AnnouncementModule {}
