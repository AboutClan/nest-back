import { IPlace } from './entity/place.entity';

export interface IPlaceService {
  getActivePlace(status: 'active' | 'inactive'): Promise<IPlace[]>;
  addPlace(placeData: IPlace): Promise<void>;
  updateStatus(placeId: string, status: 'active' | 'inactive'): Promise<void>;
  updatePrefCnt(placeId: string, num: number);
}
