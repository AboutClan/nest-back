import { GroupStudy } from 'src/domain/entities/GroupStudy/GroupStudy';
import { IGroupStudyData } from './groupStudy.entity';
import { IGroupStudyRepository } from './GroupStudyRepository.interface';

export class GroupStudyRepository implements IGroupStudyRepository {
  // Mongoose Document(IGroupStudyData) → 도메인 엔티티(GroupStudy)
  private mapToDomain(doc: IGroupStudyData): GroupStudy {
    return new GroupStudy({
      title: doc.title,
      category: {
        main: doc.category.main,
        sub: doc.category.sub,
      },
      challenge: doc.challenge,
      rules: doc.rules,
      content: doc.content,
      period: doc.period,
      guide: doc.guide,
      gender: doc.gender,
      age: doc.age,
      organizerId: doc.organizer.toString(),
      memberCnt: {
        min: doc.memberCnt.min,
        max: doc.memberCnt.max,
      },
      password: doc.password,
      status: doc.status,
      participants: doc.participants.map((p) => ({
        userId: p.user.toString(),
        randomId: p.randomId,
        role: p.role,
        attendCnt: p.attendCnt,
        weekAttendance: p.weekAttendance,
      })),
      userId: doc.user.toString(),
      comments: doc.comments.map((c) => ({
        userId: c.user.toString(),
        comment: c.comment,
        subComments: c.subComments.map((sc) => ({
          userId: sc.user.toString(),
          comment: sc.comment,
          likeList: sc.likeList,
        })),
        likeList: c.likeList,
      })),
      id: doc.id,
      location: doc.location,
      image: doc.image,
      isFree: doc.isFree,
      feeText: doc.feeText,
      fee: doc.fee,
      questionText: doc.questionText,
      hashTag: doc.hashTag,
      attendance: {
        firstDate: doc.attendance.firstDate,
        lastWeek: doc.attendance.lastWeek.map((wr) => ({
          uid: wr.uid,
          name: wr.name,
          attendRecord: wr.attendRecord,
          attendRecordSub: wr.attendRecordSub,
        })),
        thisWeek: doc.attendance.thisWeek.map((wr) => ({
          uid: wr.uid,
          name: wr.name,
          attendRecord: wr.attendRecord,
          attendRecordSub: wr.attendRecordSub,
        })),
      },
      link: doc.link,
      isSecret: doc.isSecret,
      waiting: doc.waiting.map((w) => ({
        userId: w.user.toString(),
        answer: w.answer,
        pointType: w.pointType,
      })),
      squareImage: doc.squareImage,
      meetingType: doc.meetingType,
    });
  }

  // 도메인 엔티티(GroupStudy) → DB 저장용 객체(Partial<IGroupStudyData>)
  private mapToDB(groupStudy: GroupStudy): Partial<IGroupStudyData> {
    const props = groupStudy.toPrimitives();
    return {
      title: props.title,
      category: {
        main: props.category.main,
        sub: props.category.sub,
      },
      challenge: props.challenge,
      rules: props.rules,
      content: props.content,
      period: props.period,
      guide: props.guide,
      gender: props.gender,
      age: props.age,
      organizer: props.organizerId, // DB에서는 ObjectId (필요 시 변환)
      memberCnt: {
        min: props.memberCnt.min,
        max: props.memberCnt.max,
      },
      password: props.password,
      status: props.status,
      participants: props.participants.map((p) => ({
        user: p.userId,
        randomId: p.randomId,
        role: p.role,
        attendCnt: p.attendCnt,
        weekAttendance: p.weekAttendance,
      })),
      user: props.userId,
      comments: props.comments.map((c) => ({
        user: c.userId,
        comment: c.comment,
        subComments: c.subComments.map((sc) => ({
          user: sc.userId,
          comment: sc.comment,
          likeList: sc.likeList,
        })),
        likeList: c.likeList,
      })),
      id: props.id,
      location: props.location,
      image: props.image,
      isFree: props.isFree,
      feeText: props.feeText,
      fee: props.fee,
      questionText: props.questionText,
      hashTag: props.hashTag,
      attendance: {
        firstDate: props.attendance.firstDate,
        lastWeek: props.attendance.lastWeek,
        thisWeek: props.attendance.thisWeek,
      },
      link: props.link,
      isSecret: props.isSecret,
      waiting: props.waiting.map((w) => ({
        user: w.userId,
        answer: w.answer,
        pointType: w.pointType,
      })),
      squareImage: props.squareImage,
      meetingType: props.meetingType,
    };
  }
}
