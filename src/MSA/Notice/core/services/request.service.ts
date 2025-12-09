import { Inject } from '@nestjs/common';
import { RequestContext } from 'src/request-context';
import { IREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { DatabaseError } from '../../../../errors/DatabaseError';
import { RequestRepository } from '../interfaces/request.repository.interface';
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
    const token = RequestContext.getDecodedToken();
    // const validatedRequest = RequestZodSchema.parse(data);
    const created = await this.requestRepository.create({
      ...data,
      writer: token.id,
    });

    if (!created) throw new DatabaseError('create request failed');
    return;
  }

  async checkRequest(id: string) {
    // await this.requestRepository.setCheck();
  }
}
