import { GatherRequest } from '../domain/GatherRequest/GatherRequest';

export interface IGatherRequestRepository {
  findAll(): Promise<GatherRequest[]>;
  save(gatherRequest: GatherRequest): Promise<void>;
  create(gatherRequest: GatherRequest): Promise<void>;
  findById(grId: string): Promise<GatherRequest | null>;
}
