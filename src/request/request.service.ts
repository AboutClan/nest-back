import { InjectModel } from '@nestjs/mongoose';

import { DatabaseError } from '../errors/DatabaseError';
import { Model } from 'mongoose';
import { IRequestData } from './request.entity';
import { IRequestService } from './request.interface';
import { IREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { RequestRepository } from './request.repository.interface';
import { Inject } from '@nestjs/common';

export default class RequestService implements IRequestService {
  constructor(
    @Inject(IREQUEST_REPOSITORY)
    private readonly requestRepository: RequestRepository,
  ) {}

  //todo: 다가져와야하나
  async getRequest() {
    const requestData = await this.requestRepository.findAll();
    return requestData;
  }

  async createRequest(data: any) {
    // const validatedRequest = RequestZodSchema.parse(data);
    const created = await this.requestRepository.create(data);

    if (!created) throw new DatabaseError('create request failed');
    return;
  }
}
