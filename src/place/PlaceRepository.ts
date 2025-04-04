export class PlaceRepository {
  /**
   * Mongoose Document -> Domain Entity
   */
  private mapToDomain(doc: IPlace): Place {
    // doc.registrant: ObjectId -> domain: string
    // createdAt, updatedAt (timestamps) -> domain에 전달
    return new Place({
      status: doc.status as PlaceStatus, // enum cast
      fullname: doc.fullname,
      brand: doc.brand,
      branch: doc.branch,
      image: doc.image,
      coverImage: doc.coverImage,
      latitude: doc.latitude,
      longitude: doc.longitude,
      locationDetail: doc.locationDetail,
      time: doc.time,
      priority: doc.priority,
      location: doc.location,
      registerDate: doc.registerDate,
      registrantId: doc.registrant?.toString() ?? '',
      mapURL: doc.mapURL,
      prefCnt: doc.prefCnt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Domain Entity -> Mongoose Document
   */
  private mapToDB(place: Place): Partial<IPlace> {
    const p = place.toPrimitives();
    return {
      status: p.status,
      fullname: p.fullname,
      brand: p.brand,
      branch: p.branch,
      image: p.image,
      coverImage: p.coverImage,
      latitude: p.latitude,
      longitude: p.longitude,
      locationDetail: p.locationDetail,
      time: p.time,
      priority: p.priority,
      location: p.location,
      registerDate: p.registerDate,
      registrant: p.registrantId, // Mongoose가 string -> ObjectId로 변환 가능
      mapURL: p.mapURL,
      prefCnt: p.prefCnt,
      // createdAt, updatedAt은 timestamps 옵션에 의해 DB에서 자동 관리
    };
  }
}
