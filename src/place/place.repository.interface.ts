import { IPlace } from './place.entity';

export interface PlaceRepository {
  findByStatus(status: string): Promise<IPlace[]>;
  createPlace(placeData: Partial<IPlace>): Promise<IPlace>;
  updateStatus(placeId: string, status: string): Promise<null>;
  updatePrefCnt(placeId: string, num: number);
  findByIds(placeIds: string[]): Promise<IPlace[]>;
  addReview(placeId: string, userId: string, review: string): Promise<null>;
}
