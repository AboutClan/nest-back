import { InterestProps } from '../../../domain/entities/Interest';
import { LocationDetailProps } from '../../../domain/entities/LocationDetail';
import { MajorProps } from '../../../domain/entities/Major';
import { Registered, RegisteredProps } from '../../../domain/entities/Registered';
import { IRegistered } from '../schemas/RegisteredSchema';

export class RegisteredRepository {
  /**
   * Document -> Domain
   */
  private mapToDomain(doc: IRegistered): Registered {
    // majors: IMajor[] => MajorProps[]
    const majors: MajorProps[] = (doc.majors ?? []).map((m) => ({
      department: m.department,
      detail: m.detail,
    }));

    // interests: IInterest => InterestProps
    const interests: InterestProps | undefined = doc.interests
      ? {
          first: doc.interests.first,
          second: doc.interests.second ?? null,
        }
      : undefined;

    // locationDetail: ILocationDetail => LocationDetailProps
    let locationDetail: LocationDetailProps | undefined = undefined;
    if (doc.locationDetail) {
      locationDetail = {
        text: doc.locationDetail.text,
        lat: doc.locationDetail.lat,
        lon: doc.locationDetail.lon,
      };
    }

    const props: RegisteredProps = {
      uid: doc.uid,
      name: doc.name,
      majors: majors,
      interests: interests,
      telephone: doc.telephone,
      location: doc.location,
      comment: doc.comment,
      mbti: doc.mbti,
      gender: doc.gender,
      profileImage: doc.profileImage,
      birth: doc.birth,
      locationDetail: locationDetail,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new Registered(props);
  }

  /**
   * Domain -> Document
   */
  private mapToDB(registered: Registered): Partial<IRegistered> {
    const p = registered.toPrimitives(); // RegisteredProps
    return {
      uid: p.uid,
      name: p.name,
      majors: p.majors?.map((m) => ({
        department: m.department,
        detail: m.detail,
      })),
      interests: p.interests
        ? {
            first: p.interests.first,
            second: p.interests.second,
          }
        : undefined,
      telephone: p.telephone,
      location: p.location,
      comment: p.comment,
      mbti: p.mbti,
      gender: p.gender,
      profileImage: p.profileImage,
      birth: p.birth,
      locationDetail: p.locationDetail
        ? {
            text: p.locationDetail.text,
            lat: p.locationDetail.lat,
            lon: p.locationDetail.lon,
          }
        : undefined,
      // createdAt, updatedAt: Mongoose timestamps로 자동 관리 가능
      // 필요 시 명시적으로 설정 가능
    };
  }
}
