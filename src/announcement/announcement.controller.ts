import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  async getAnnouncement() {
    return await this.announcementService.getAnnouncement();
  }

  @Post()
  async createAnnouncement(
    @Body('type') type,
    @Body('title') title,
    @Body('content') content,
  ) {
    return await this.announcementService.createAnnouncement(
      type,
      title,
      content,
    );
  }

  @Patch()
  async updateAnnouncement(
    @Body('id') id,
    @Body('type') type,
    @Body('title') title,
    @Body('content') content,
  ) {
    return await this.announcementService.updateAnnouncement(id, {
      type,
      title,
      content,
    });
  }

  @Delete()
  async deleteAnnouncement(@Body('id') id) {
    return await this.announcementService.deleteAnnouncement(id);
  }
}
