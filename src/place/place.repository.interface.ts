import { IPlace } from './entity/place.entity';

export interface PlaceRepository {
  findByStatus(status: string): Promise<IPlace[]>;
  createPlace(placeData: Partial<IPlace>): Promise<IPlace>;
  updateStatus(placeId: string, status: string): Promise<null>;
}
