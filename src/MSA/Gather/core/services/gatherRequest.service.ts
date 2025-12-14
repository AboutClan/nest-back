import { Inject, Injectable } from '@nestjs/common';
import {
  GatherRequest,
  IGatherRequest,
} from 'src/domain/entities/GatherRequest/GatherRequest';
import { RequestContext } from 'src/request-context';
import { IGATHERREQUEST_REPOSITORY } from 'src/utils/di.tokens';
import { IGatherRequestRepository } from '../interfaces/GatherRequestRepository.interface';

@Injectable()
export class GatherRequestService {
  constructor(
    @Inject(IGATHERREQUEST_REPOSITORY)
    private readonly gatherRequestRepository: IGatherRequestRepository,
  ) {}

  async getGatherRequest() {
    return await this.gatherRequestRepository.findAll();
  }

  async createGatherRequest(gatherRequestData: IGatherRequest) {
    const token = RequestContext.getDecodedToken();

    const gatherRequest = new GatherRequest({
      ...gatherRequestData,
      writer: token.id,
    });

    await this.gatherRequestRepository.create(gatherRequest);
  }

  async likeGatherRequest(grId: string) {
    const token = RequestContext.getDecodedToken();

    const gatherRequest = await this.gatherRequestRepository.findById(grId);
    if (!gatherRequest) {
      throw new Error('Gather request not found');
    }
    const res = gatherRequest.toggleLike(token.id);

    await this.gatherRequestRepository.save(gatherRequest);
    return res;
  }
}
