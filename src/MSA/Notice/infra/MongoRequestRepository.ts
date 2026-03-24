import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { RequestRepository } from '../core/interfaces/request.repository.interface';
import { IRequestData } from '../entity/request.entity';

export class MongoRequestRepository implements RequestRepository {
  constructor(
    @InjectModel(DB_SCHEMA.REQUEST)
    private readonly Request: Model<IRequestData>,
  ) {}
  async findAll(): Promise<IRequestData[]> {
    console.log(12);
    const data = await this.Request.find({}).sort({ createdAt: 1 });
    console.log(data);
    return data;
    // .populate('writer');
  }
  async create(data: any): Promise<IRequestData> {
    return await this.Request.create(data);
  }
  async setCheck(id: string): Promise<null> {
    await this.Request.updateOne(
      { _id: id },
      {
        isChecked: true,
      },
    );

    return null;
  }
}
