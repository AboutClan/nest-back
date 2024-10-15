import { InjectModel } from '@nestjs/mongoose';

import { DatabaseError } from '../errors/DatabaseError';
import { Model } from 'mongoose';
import {
  IRequestData,
  Request,
  RequestZodSchema,
} from './entity/request.entity';
import { IRequestService } from './request.interface';

export default class RequestService implements IRequestService {
  constructor(@InjectModel('Request') private Request: Model<IRequestData>) {}

  //todo: 다가져와야하나
  async getRequest() {
    const gatherData = await this.Request.find({}, '-_id');
    return gatherData;
  }

  async createRequest(data: any) {
    // const validatedRequest = RequestZodSchema.parse(data);
    const created = await this.Request.create(data);

    if (!created) throw new DatabaseError('create request failed');
    return;
  }
}
