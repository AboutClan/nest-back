import { Model } from 'mongoose';
import { RequestRepository } from './request.repository.interface';
import { IRequestData } from './request.entity';
import { InjectModel } from '@nestjs/mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

export class MongoRequestRepository implements RequestRepository {
  constructor(
    @InjectModel(DB_SCHEMA.REQUEST)
    private readonly Request: Model<IRequestData>,
  ) {}
  async findAll(): Promise<IRequestData[]> {
    return await this.Request.find({});
  }
  async create(data: any): Promise<IRequestData> {
    return await this.Request.create(data);
  }
}
