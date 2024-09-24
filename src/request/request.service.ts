import { Request, RequestZodSchema } from '../db/models/request';
import { DatabaseError } from '../errors/DatabaseError';

export default class RequestService {
  constructor() {}

  async getRequest() {
    const gatherData = await Request.find({}, '-_id');
    return gatherData;
  }

  async createRequest(data: any) {
    const validatedRequest = RequestZodSchema.parse(data);
    const created = await Request.create(validatedRequest);

    if (!created) throw new DatabaseError('create request failed');
    return;
  }
}
