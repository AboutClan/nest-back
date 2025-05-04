import { Announcement } from 'src/domain/entities/Announcement';

export interface AnnouncementRepositoryInterface {
  findAll(): Promise<Announcement[]>;
  create(entity: Announcement): Promise<Announcement>;
  save(entity: Announcement): Promise<Announcement>;
  updateById(id: string, entity: Announcement): Promise<void>;
  deleteById(id: string): Promise<void>;
}
