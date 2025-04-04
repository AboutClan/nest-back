// src/domain/entities/Registered.ts
import { Interest, InterestProps } from './Interest';
import { LocationDetail, LocationDetailProps } from './LocationDetail';
import { Major, MajorProps } from './Major';

export interface RegisteredProps {
  uid: string;
  name: string;
  majors: MajorProps[];
  interests?: InterestProps; // optional
  telephone: string;
  location: string;
  comment: string;
  mbti: string;
  gender: string;
  profileImage: string;
  birth: string;
  locationDetail?: LocationDetailProps;
  // timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 도메인 엔티티: Registered
 * - DB/프레임워크 의존 없이, 순수 도메인 로직과 데이터
 */
export class Registered {
  private uid: string;
  private name: string;
  private majors: Major[];
  private interests?: Interest;
  private telephone: string;
  private location: string;
  private comment: string;
  private mbti: string;
  private gender: string;
  private profileImage: string;
  private birth: string;
  private locationDetail?: LocationDetail;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: RegisteredProps) {
    if (!props.uid) {
      throw new Error('uid is required');
    }
    if (!props.name) {
      throw new Error('name is required');
    }
    if (!props.majors || props.majors.length === 0) {
      throw new Error('at least one major is required');
    }
    if (!props.telephone) {
      throw new Error('telephone is required');
    }
    if (!props.location) {
      throw new Error('location is required');
    }
    if (!props.comment) {
      throw new Error('comment is required');
    }
    if (!props.mbti) {
      throw new Error('mbti is required');
    }
    if (!props.gender) {
      throw new Error('gender is required');
    }
    if (!props.profileImage) {
      throw new Error('profileImage is required');
    }
    if (!props.birth) {
      throw new Error('birth is required');
    }

    this.uid = props.uid;
    this.name = props.name;
    this.majors = props.majors.map((m) => new Major(m));
    this.interests = props.interests
      ? new Interest(props.interests)
      : undefined;
    this.telephone = props.telephone;
    this.location = props.location;
    this.comment = props.comment;
    this.mbti = props.mbti;
    this.gender = props.gender;
    this.profileImage = props.profileImage;
    this.birth = props.birth;
    this.locationDetail = props.locationDetail
      ? new LocationDetail(props.locationDetail)
      : undefined;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // 예시: Getter methods
  getUid(): string {
    return this.uid;
  }
  getName(): string {
    return this.name;
  }
  getMajors(): Major[] {
    return this.majors;
  }
  getInterests(): Interest | undefined {
    return this.interests;
  }
  getTelephone(): string {
    return this.telephone;
  }
  getLocation(): string {
    return this.location;
  }
  getComment(): string {
    return this.comment;
  }
  getMbti(): string {
    return this.mbti;
  }
  getGender(): string {
    return this.gender;
  }
  getProfileImage(): string {
    return this.profileImage;
  }
  getBirth(): string {
    return this.birth;
  }
  getLocationDetail(): LocationDetail | undefined {
    return this.locationDetail;
  }
  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }
  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  // 예시: 도메인 로직
  updateComment(newComment: string): void {
    if (!newComment.trim()) {
      throw new Error('Comment cannot be empty');
    }
    this.comment = newComment;
    this.updatedAt = new Date();
  }

  toPrimitives(): RegisteredProps {
    return {
      uid: this.uid,
      name: this.name,
      majors: this.majors.map((m) => m.toPrimitives()),
      interests: this.interests ? this.interests.toPrimitives() : undefined,
      telephone: this.telephone,
      location: this.location,
      comment: this.comment,
      mbti: this.mbti,
      gender: this.gender,
      profileImage: this.profileImage,
      birth: this.birth,
      locationDetail: this.locationDetail
        ? this.locationDetail.toPrimitives()
        : undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
