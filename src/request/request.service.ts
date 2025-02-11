import { DatabaseError } from '../errors/DatabaseError';
import { IREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { RequestRepository } from './request.repository.interface';
import { Inject } from '@nestjs/common';

export default class RequestService {
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
