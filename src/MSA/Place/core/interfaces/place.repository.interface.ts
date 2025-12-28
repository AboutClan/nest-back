import { IPlace } from '../../entity/place.entity';

export interface PlaceRepository {
  findByStatus(status: string): Promise<IPlace[]>;
  findClosePlace(placeId: string): Promise<IPlace[]>;
  findAll(): Promise<IPlace[]>;
  createPlace(placeData: Partial<IPlace>): Promise<IPlace>;
  updateStatus(placeId: string, status: string): Promise<null>;
  updatePrefCnt(placeId: string, num: number);
  updateLocation(placeId: string, location: any);
  findByIds(placeIds: string[]): Promise<IPlace[]>;
  addRating(placeId: string, ratings: any): Promise<null>;
  addReview(
    placeId: string,
    userId: string,
    review: string,
    rating: number,
    isSecret: boolean,
  ): Promise<null>;
  findByLatLng(
    lowerLat: number,
    upperLat: number,
    lowerLng: number,
    upperLng: number,
  );
  test();
}
