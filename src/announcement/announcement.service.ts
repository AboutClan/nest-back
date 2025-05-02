import { Inject, Injectable } from '@nestjs/common';
import { IANNOUNCEMENT_REPOSITORY } from 'src/utils/di.tokens';
import { AnnouncementRepositoryInterface } from './AnnouncementRepository.interface';
import {
  Announcement,
  AnnouncementProps,
} from 'src/domain/entities/Announcement';

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(IANNOUNCEMENT_REPOSITORY)
    private readonly announcementRepository: AnnouncementRepositoryInterface,
  ) {}

  async getAnnouncement() {
    return await this.announcementRepository.findAll();
  }

  async createAnnouncement(type: string, title: string, content: string) {
    const announcementData = {
      type,
      title,
      content,
    };

    const announcement = new Announcement(announcementData);
    await this.announcementRepository.create(announcement);

    return 'Create Announcement';
  }

  async updateAnnouncement(id: string, announcementData: AnnouncementProps) {
    const announcement = new Announcement(announcementData);
    await this.announcementRepository.updateById(id, announcement);
    return 'Update Announcement';
  }

  async deleteAnnouncement(id: string) {
    await this.announcementRepository.deleteById(id);
    return 'Delete Announcement';
  }
}
