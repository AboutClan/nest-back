// src/domain/entities/GroupStudyTypes.ts

import { DateUtils } from 'src/utils/Date';

export type UserRole = 'host' | 'member' | 'outsider';
// 실제 ENUM_USER_ROLE 배열 요소에 맞춰 수정하세요.

export interface CategoryProps {
  main: string;
  sub: string;
}

export interface SubCommentProps {
  _id?: string; // Optional for new comments
  userId: string;
  comment: string;
  likeList: string[];
  createdAt?: Date;
}

export interface CommentProps {
  _id?: string; // Optional for new comments
  userId: string;
  comment: string;
  subComments: SubCommentProps[];
  likeList: string[];
  createdAt?: Date;
}

export interface WaitingProps {
  user: string;
  answer?: string;
  pointType: string;
}

export interface WeekRecordProps {
  uid: string;
  name: string;
  attendRecord: string[];
  attendRecordSub?: string[];
}

export interface AttendanceProps {
  firstDate?: string;
  lastWeek: WeekRecordProps[];
  thisWeek: WeekRecordProps[];
}

export interface MemberCntProps {
  min: number;
  max: number;
}

export interface ParticipantProps {
  user: string;
  randomId?: number;
  role: UserRole;
  attendCnt: number;
  weekAttendance: boolean;
}

export interface GroupStudyProps {
  _id?: string; // Optional for new comments
  id: number;
  title: string;
  category: CategoryProps;
  challenge?: string;
  rules: string[];
  content: string;
  period: string;
  guide: string;
  gender: boolean;
  age: number[];
  organizer: string;
  memberCnt: MemberCntProps;
  password?: string;
  status: string;
  participants: ParticipantProps[];
  userId: string; // 작성자(creator) ID
  comments?: CommentProps[];
  location: string;
  image?: string;
  isFree: boolean;
  feeText?: string;
  fee?: number;
  questionText?: string;
  hashTag: string;
  attendance: AttendanceProps;
  link?: string;
  isSecret?: boolean;
  waiting?: WaitingProps[];
  squareImage?: string;
  meetingType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// src/domain/entities/GroupStudy.ts

export class GroupStudy {
  public _id?: string; // Optional for new comments
  public id: number;
  public title: string;
  public category: CategoryProps;
  public challenge?: string;
  public rules: string[];
  public content: string;
  public period: string;
  public guide: string;
  public gender: boolean;
  public age: number[];
  public organizer: string;
  public memberCnt: MemberCntProps;
  public password?: string;
  public status: string;
  public participants: ParticipantProps[];
  public userId: string;
  public comments: CommentProps[];
  public location: string;
  public image?: string;
  public isFree: boolean;
  public feeText?: string;
  public fee?: number;
  public questionText?: string;
  public hashTag: string;
  public attendance: AttendanceProps;
  public link?: string;
  public isSecret?: boolean;
  public waiting: WaitingProps[];
  public squareImage?: string;
  public meetingType?: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(props: GroupStudyProps) {
    this._id = props._id;
    this.id = props.id;
    this.title = props.title;
    this.category = props.category;
    this.challenge = props.challenge;
    this.rules = props.rules;
    this.content = props.content;
    this.period = props.period;
    this.guide = props.guide;
    this.gender = props.gender;
    this.age = props.age;
    this.organizer = props.organizer;
    this.memberCnt = props.memberCnt;
    this.password = props.password;
    this.status = props.status;
    this.participants = props.participants;
    this.userId = props.userId;
    this.comments = props.comments ?? [];
    this.location = props.location;
    this.image = props.image;
    this.isFree = props.isFree;
    this.feeText = props.feeText;
    this.fee = props.fee;
    this.questionText = props.questionText;
    this.hashTag = props.hashTag;
    this.attendance = props.attendance;
    this.link = props.link;
    this.isSecret = props.isSecret;
    this.waiting = props.waiting ?? [];
    this.squareImage = props.squareImage;
    this.meetingType = props.meetingType;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  addComment(userId: string, comment: string): void {
    if (!userId || !comment) {
      throw new Error('User ID and comment cannot be empty');
    }

    const newComment: CommentProps = {
      userId,
      comment,
      subComments: [],
      likeList: [],
      createdAt: new Date(),
    };

    this.comments.push(newComment);
  }

  updateComment(commentId: string, newComment: string): void {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      comment.comment = newComment;
    } else {
      throw new Error('Comment not found');
    }
  }

  likeComment(commentId: string, userId: string): void {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      if (!comment.likeList.includes(userId)) {
        comment.likeList.push(userId);
      }
    } else {
      throw new Error('Comment not found');
    }
  }

  deleteComment(commentId: string): void {
    const commentIndex = this.comments.findIndex((c) => c._id === commentId);
    if (commentIndex !== -1) {
      this.comments.splice(commentIndex, 1);
    } else {
      throw new Error('Comment not found');
    }
  }

  deleteSubComment(commentId: string, subCommentId: string): void {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const subCommentIndex = comment.subComments.findIndex(
        (s) => s._id === subCommentId,
      );
      if (subCommentIndex !== -1) {
        comment.subComments.splice(subCommentIndex, 1);
      } else {
        throw new Error('Sub-comment not found');
      }
    } else {
      throw new Error('Comment not found');
    }
  }

  updateSubComment(
    commentId: string,
    subCommentId: string,
    newComment: string,
  ): void {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const subComment = comment.subComments.find(
        (s) => s._id === subCommentId,
      );
      if (subComment) {
        subComment.comment = newComment;
      } else {
        throw new Error('Sub-comment not found');
      }
    } else {
      throw new Error('Comment not found');
    }
  }

  likeSubComment(
    commentId: string,
    subCommentId: string,
    userId: string,
  ): void {
    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const subComment = comment.subComments.find(
        (s) => s._id === subCommentId,
      );
      if (subComment) {
        if (!subComment.likeList.includes(userId)) {
          subComment.likeList.push(userId);
        }
      } else {
        throw new Error('Sub-comment not found');
      }
    } else {
      throw new Error('Comment not found');
    }
  }

  createSubComment(
    commentId: string,
    userId: string,
    subComment: string,
  ): void {
    if (!userId || !subComment) {
      throw new Error('User ID and sub-comment cannot be empty');
    }

    const comment = this.comments.find((c) => c._id === commentId);
    if (comment) {
      const newSubComment: SubCommentProps = {
        userId,
        comment: subComment,
        likeList: [],
        createdAt: new Date(),
      };
      comment.subComments.push(newSubComment);
    } else {
      throw new Error('Comment not found');
    }
  }

  participateGroupStudy(
    userId: string,
    userName: string,
    userUid: string,
  ): void {
    if (!userId || !userName || !userUid) {
      throw new Error('User ID, name, and UID cannot be empty');
    }

    const existingParticipant = this.participants.find(
      (p) => p.user === userId,
    );
    if (existingParticipant) {
      throw new Error('User is already a participant');
    }

    const newParticipant: ParticipantProps = {
      user: userId,
      randomId: Math.floor(Math.random() * 1000000),
      role: 'member',
      attendCnt: 0,
      weekAttendance: false,
    };

    this.participants.push(newParticipant);
  }

  deleteParticipant(userId: string): void {
    const participantIndex = this.participants.findIndex(
      (p) => p.user === userId,
    );
    if (participantIndex !== -1) {
      this.participants.splice(participantIndex, 1);
    } else {
      throw new Error('Participant not found');
    }

    this.attendance.lastWeek = this.attendance.lastWeek.filter(
      (w) => w.uid !== userId,
    );
    this.attendance.thisWeek = this.attendance.thisWeek.filter(
      (w) => w.uid !== userId,
    );
  }

  deleteParticipantByRandomId(randomId: number): void {
    const participantIndex = this.participants.findIndex(
      (p) => p.randomId === randomId,
    );
    if (participantIndex !== -1) {
      const userId = this.participants[participantIndex].user;
      this.deleteParticipant(userId);
    } else {
      throw new Error('Participant not found by random ID');
    }
  }

  setWaiting({ userId, answer, pointType }): void {
    if (!userId || !pointType) {
      throw new Error('Waiting must have a userId and pointType');
    }

    const existingWaiting = this.waiting.find((w) => w.user === userId);
    if (existingWaiting) {
      existingWaiting.answer = answer;
      existingWaiting.pointType = pointType;
    } else {
      this.waiting.push({ user: userId, answer, pointType });
    }
  }

  agreeWaiting(userId: string): void {
    const waitingIndex = this.waiting.findIndex((w) => w.user === userId);
    if (waitingIndex !== -1) {
      const waitingUser = this.waiting[waitingIndex];
      this.participateGroupStudy({
        userId: waitingUser.user,
        role: 'member',
        attendCnt: 0,
        weekAttendance: false,
      });
      this.waiting.splice(waitingIndex, 1);
    } else {
      throw new Error('Waiting user not found');
    }
  }

  patchAttendance(
    firstDate: string,
    lastWeek: WeekRecordProps[],
    thisWeek: WeekRecordProps[],
  ): void {
    if (!firstDate || !Array.isArray(lastWeek) || !Array.isArray(thisWeek)) {
      throw new Error('Invalid attendance data');
    }

    this.attendance.firstDate = firstDate;
    this.attendance.lastWeek = lastWeek;
    this.attendance.thisWeek = thisWeek;
  }

  attend(
    userId: string,
    userUid: string,
    userName: string,
    weekRecord: string[],
    type: 'this' | 'last',
    weekRecordSub?: string[],
  ): void {
    if (type === 'this') {
      const firstDate = DateUtils.getLatestMonday();
      this.attendance.firstDate = firstDate;
    }

    const weekArray: WeekRecordProps[] =
      type === 'this' ? this.attendance.thisWeek : this.attendance.lastWeek;

    const existingRecord = weekArray.find((wr) => wr.uid === userUid);
    const member = this.participants.find((pt) => pt.user === userId);

    if (existingRecord) {
      const beforeCnt = existingRecord.attendRecord.length;
      const diffCnt = weekRecord.length - beforeCnt;
      if (member) {
        member.attendCnt += diffCnt;
      }
      existingRecord.attendRecord = weekRecord;
      existingRecord.attendRecordSub = weekRecordSub || [];
    } else {
      const newWeekRecord: WeekRecordProps = {
        uid: userUid,
        name: userName,
        attendRecord: weekRecord,
        attendRecordSub: weekRecordSub || [],
      };

      if (member) {
        member.attendCnt += weekRecord.length;
      }

      if (type === 'this') {
        this.attendance.thisWeek.push(newWeekRecord);
      } else {
        this.attendance.lastWeek.push(newWeekRecord);
      }
    }
  }

  markWeeklyAttendance(userId: string): boolean {
    const participant = this.participants.find((p) => p.user === userId);
    if (!participant) {
      // 참가자 자체가 없으면 변경할 수 없음
      return false;
    }

    if (participant.weekAttendance) {
      return false;
    }

    participant.weekAttendance = true;
    participant.attendCnt += 1;
    return true;
  }

  toPrimitives(): GroupStudyProps {
    return {
      id: this.id,
      title: this.title,
      category: { ...this.category },
      challenge: this.challenge,
      rules: [...this.rules],
      content: this.content,
      period: this.period,
      guide: this.guide,
      gender: this.gender,
      age: [...this.age],
      organizer: this.organizer,
      memberCnt: { ...this.memberCnt },
      password: this.password,
      status: this.status,
      participants: this.participants.map((p) => ({ ...p })),
      userId: this.userId,
      comments: this.comments.map((c) => ({
        userId: c.userId,
        comment: c.comment,
        subComments: c.subComments.map((s) => ({ ...s })),
        likeList: [...c.likeList],
      })),
      location: this.location,
      image: this.image,
      isFree: this.isFree,
      feeText: this.feeText,
      fee: this.fee,
      questionText: this.questionText,
      hashTag: this.hashTag,
      attendance: {
        firstDate: this.attendance.firstDate,
        lastWeek: this.attendance.lastWeek.map((w) => ({ ...w })),
        thisWeek: this.attendance.thisWeek.map((w) => ({ ...w })),
      },
      link: this.link,
      isSecret: this.isSecret,
      waiting: this.waiting.map((w) => ({ ...w })),
      squareImage: this.squareImage,
      meetingType: this.meetingType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
