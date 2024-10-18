import { Model } from 'mongoose';
import { RequestRepository } from './request.repository.interface';
import { IRequestData } from './entity/request.entity';
import { InjectModel } from '@nestjs/mongoose';

export class MongoRequestRepository implements RequestRepository {
  constructor(
    @InjectModel('Request')
    private readonly Request: Model<IRequestData>,
  ) {}
  async findAll(): Promise<IRequestData[]> {
    return await this.Request.find({});
  }
  async create(data: any): Promise<IRequestData> {
    return await this.Request.create(data);
  }
}
