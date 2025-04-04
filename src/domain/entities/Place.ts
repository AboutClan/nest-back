// src/domain/entities/Place.ts

/**
 * 도메인에서 사용할 Place 상태 타입
 */
export type PlaceStatus = 'active' | 'inactive' | 'pending';

/**
 * 도메인에서 사용할 Place 엔티티 생성자에 필요한 필드들
 */
export interface PlaceProps {
  status?: PlaceStatus;
  fullname: string;
  brand?: string;
  branch?: string;
  image?: string;
  coverImage?: string;
  latitude: string;
  longitude: string;
  locationDetail?: string;
  time?: string;
  priority?: number;
  location?: string; // LOCATION_LIST 중 하나
  registerDate?: string;
  registrantId?: string; // DB에서는 ObjectId, 도메인에서는 string
  mapURL?: string;
  prefCnt?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 도메인 엔티티: Place
 *  - DB/프레임워크 의존 없이, 순수 비즈니스 로직과 데이터만 캡슐화
 */
export class Place {
  private props: Required<
    Omit<
      PlaceProps,
      | 'status'
      | 'brand'
      | 'branch'
      | 'image'
      | 'coverImage'
      | 'location'
      | 'registerDate'
      | 'registrantId'
      | 'mapURL'
      | 'prefCnt'
    >
  > & {
    status: PlaceStatus;
    brand: string;
    branch: string;
    image: string;
    coverImage: string;
    location: string;
    registerDate: string;
    registrantId: string;
    mapURL: string;
    prefCnt: number;
  };

  constructor(placeProps: PlaceProps) {
    // 필수 값 검증
    if (!placeProps.fullname) {
      throw new Error('fullname is required');
    }
    if (!placeProps.latitude) {
      throw new Error('latitude is required');
    }
    if (!placeProps.longitude) {
      throw new Error('longitude is required');
    }

    // 기본값 할당
    this.props = {
      status: placeProps.status ?? 'active',
      fullname: placeProps.fullname,
      brand: placeProps.brand ?? '',
      branch: placeProps.branch ?? '',
      image: placeProps.image ?? '',
      coverImage: placeProps.coverImage ?? '',
      latitude: placeProps.latitude,
      longitude: placeProps.longitude,
      locationDetail: placeProps.locationDetail ?? '',
      time: placeProps.time ?? '',
      priority: placeProps.priority ?? 0,
      location: placeProps.location ?? '수원',
      registerDate: placeProps.registerDate ?? '',
      registrantId: placeProps.registrantId ?? '',
      mapURL: placeProps.mapURL ?? '',
      prefCnt: placeProps.prefCnt ?? 0,
      createdAt: placeProps.createdAt ?? new Date(),
      updatedAt: placeProps.updatedAt ?? new Date(),
    };
  }

  /** Getter methods (필요에 따라 정의) */
  getStatus(): PlaceStatus {
    return this.props.status;
  }
  getFullname(): string {
    return this.props.fullname;
  }
  getBrand(): string {
    return this.props.brand;
  }
  getBranch(): string {
    return this.props.branch;
  }
  getLatitude(): string {
    return this.props.latitude;
  }
  getLongitude(): string {
    return this.props.longitude;
  }
  getLocation(): string {
    return this.props.location;
  }
  getRegistrantId(): string {
    return this.props.registrantId;
  }
  getPrefCnt(): number {
    return this.props.prefCnt;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }
  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // 예시: 도메인 로직 (ex: 좋아요 추가, 상태 변경 등)
  incrementPrefCnt() {
    this.props.prefCnt += 1;
    this.props.updatedAt = new Date();
  }

  changeStatus(newStatus: PlaceStatus) {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * 도메인 엔티티 → Plain Object
   * Repository/Controller가 DB 저장/직렬화할 때 사용
   */
  toPrimitives(): PlaceProps {
    return {
      status: this.props.status,
      fullname: this.props.fullname,
      brand: this.props.brand,
      branch: this.props.branch,
      image: this.props.image,
      coverImage: this.props.coverImage,
      latitude: this.props.latitude,
      longitude: this.props.longitude,
      locationDetail: this.props.locationDetail,
      time: this.props.time,
      priority: this.props.priority,
      location: this.props.location,
      registerDate: this.props.registerDate,
      registrantId: this.props.registrantId,
      mapURL: this.props.mapURL,
      prefCnt: this.props.prefCnt,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
