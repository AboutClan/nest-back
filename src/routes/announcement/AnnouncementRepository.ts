import { Announcement } from 'src/domain/entities/Announcement';
import { IAnnouncement } from './announcement.entity';
import { AnnouncementRepositoryInterface } from './AnnouncementRepository.interface';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class AnnouncementRepository implements AnnouncementRepositoryInterface {
  constructor(
    @InjectModel(DB_SCHEMA.ACCOUNCEMENT)
    private readonly AnnouncementModel: Model<AnnouncementRepositoryInterface>,
  ) {}

  async findAll(): Promise<Announcement[]> {
    const docs = await this.AnnouncementModel.find({});

    return docs.map((doc) => this.mapToDomain(doc));
  }

  async create(entity: Announcement): Promise<Announcement> {
    const doc = await this.AnnouncementModel.create(this.mapToDb(entity));
    return this.mapToDomain(doc);
  }

  async save(entity: Announcement): Promise<Announcement> {
    const doc = await this.AnnouncementModel.findOneAndUpdate(
      { _id: entity.id },
      { $set: this.mapToDb(entity) },
      { new: true, upsert: true },
    );
    return this.mapToDomain(doc);
  }

  async updateById(id: string, entity: Announcement): Promise<void> {
    await this.AnnouncementModel.updateOne(
      { _id: id },
      { $set: this.mapToDb(entity) },
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.AnnouncementModel.deleteOne({ _id: id });
  }

  /** Mongoose → Domain */
  mapToDomain(doc: IAnnouncement): Announcement {
    return new Announcement({
      // MongoDB ObjectId → 문자열
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      content: doc.content,
    });
  }

  /** Domain → Mongoose(저장용 Plain Object) */
  mapToDb(entity: Announcement): Partial<IAnnouncement> {
    return {
      // id가 이미 있다면 그대로, 새로 생성할 땐 MongoDB가 _id를 생성
      _id: entity.id ? new Types.ObjectId(entity.id) : undefined,
      type: entity.type as 'main' | 'sub' | 'event' | 'update',
      title: entity.title,
      content: entity.content,
      // createdAt‧updatedAt은 Mongoose timestamps 옵션으로 자동 관리 가능
    };
  }
}
