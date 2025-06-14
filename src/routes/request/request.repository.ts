import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IRequestData } from './request.entity';
import { RequestRepository } from './request.repository.interface';

export class MongoRequestRepository implements RequestRepository {
  constructor(
    @InjectModel(DB_SCHEMA.REQUEST)
    private readonly Request: Model<IRequestData>,
  ) {}
  async findAll(): Promise<IRequestData[]> {
    return await this.Request.find({}).populate('writer');
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
