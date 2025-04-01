import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DailyCheck } from 'src/domain/entities/DailyCheck';
import { IDailyCheck } from './dailycheck.entity';

export class DailyCheckRepository {
  constructor(
    @InjectModel('DailyCheck') private readonly DailyCheck: Model<IDailyCheck>,
  ) {}

  async findByUid(uid: string): Promise<> {
    const doc = await this.DailyCheck.findOne({
      uid,
    }).sort({ updatedAt: -1 });

    if (!doc) return null;

    return this.mapToDomain(doc);
  }

  async create(dailyCheckData: DailyCheck): Promise<DailyCheck> {
    const docToSave = this.mapToDB(dailyCheckData);
    const created = await this.DailyCheck.create(docToSave);
    return this.mapToDomain(created);
  }

  async findAll(): Promise<DailyCheck[]> {
    const docs = await this.DailyCheck.find({}, '-_id -__v');
    if (!docs) return null;
    return docs.map((doc) => this.mapToDomain(doc));
  }

  private mapToDomain(doc: IDailyCheck): DailyCheck {
    const dailyCheck = new DailyCheck({
      uid: '',
      name: '',
    });
    return dailyCheck;
  }
  private mapToDB(doc: DailyCheck): IDailyCheck {
    return {
      uid: doc.getUid(),
      name: doc.getName(),
      createdAt: doc.getCreatedAt(),
      updatedAt: doc.getUpdatedAt(),
    };
  }
}
