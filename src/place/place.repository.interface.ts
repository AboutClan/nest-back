import { IPlace } from './place.entity';

export interface PlaceRepository {
  findByStatus(status: string): Promise<IPlace[]>;
  createPlace(placeData: Partial<IPlace>): Promise<IPlace>;
  updateStatus(placeId: string, status: string): Promise<null>;
  updatePrefCnt(placeId: string, num: number);
}
