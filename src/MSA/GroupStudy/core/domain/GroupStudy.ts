// src/domain/entities/GroupStudyTypes.ts

import { DateUtils } from 'src/utils/Date';

export type UserRole = 'host' | 'member' | 'outsider' | 'admin';
// 실제 ENUM_USER_ROLE 배열 요소에 맞춰 수정하세요.

export interface CategoryProps {
  main?: string;
  sub?: string;
}
export interface WaitingProps {
  user?: string;
  answer?: string[];
  pointType?: string;
  createdAt?: Date;
}

export interface WeekRecordProps {
  uid?: string;
  name?: string;
  attendRecord?: string[];
  attendRecordSub?: string[];
}

export interface AttendanceProps {
  firstDate?: string;
  lastWeek: WeekRecordProps[];
  thisWeek: WeekRecordProps[];
}

export interface MemberCntProps {
  min?: number;
  max?: number;
}

export interface ParticipantProps {
  user?: string;
  randomId?: number;
  role?: UserRole;
  deposit?: number;
  monthAttendance?: boolean;
  lastMonthAttendance?: boolean;
  createdAt?: Date;
}

export interface GroupStudyProps {
  _id?: string; // Optional for new comments
  id?: number;
  title?: string;
  category?: CategoryProps;
  challenge?: string;
  rules?: string[];
  content?: string;
  period?: string;
  guide?: string;
  gender?: boolean;
  age?: number[];
  organizer?: string;
  memberCnt?: MemberCntProps;
  password?: string;
  status?: string;
  participants?: ParticipantProps[];
  userId?: string; // 작성자(creator) ID
  location?: string;
  image?: string;
  isFree?: boolean;
  feeText?: string;
  fee?: number;
  questionText?: string[];
  hashTag?: string;
  attendance?: AttendanceProps;
  link?: string;
  isSecret?: boolean;
  waiting?: WaitingProps[];
  squareImage?: string;
  meetingType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  notionUrl?: string;
  requiredTicket?: number;
  totalDeposit?: number;
  randomTicket?: number;
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
  public location: string;
  public image?: string;
  public isFree: boolean;
  public feeText?: string;
  public fee?: number;
  public questionText?: string[];
  public hashTag: string;
  public attendance: AttendanceProps;
  public link?: string;
  public isSecret?: boolean;
  public waiting: WaitingProps[];
  public squareImage?: string;
  public meetingType?: string;
  public createdAt?: Date;
  public updatedAt?: Date;
  public notionUrl?: string;
  public requiredTicket?: number;
  public totalDeposit?: number;
  public randomTicket?: number;
  constructor(props: GroupStudyProps) {
    this._id = props._id;
    this.id = props.id;
    this.title = props.title || 'no title';
    this.category = props.category || { main: '기타', sub: '기타' };
    this.challenge = props.challenge || '';
    this.rules = props.rules || [];
    this.content = props.content || '';
    this.period = props.period || '';
    this.guide = props.guide || '';
    this.gender = props.gender || false;
    this.age = props.age || [];
    this.organizer = props.organizer || '';
    this.memberCnt = props.memberCnt || { min: 1, max: 10 };
    this.password = props.password || null;
    this.status = props.status || 'pending';
    this.participants = props.participants || [];
    this.userId = props.userId;
    this.location = props.location || '수원';
    this.image = props.image || null;
    this.isFree = props.isFree || false;
    this.feeText = props.feeText || '';
    this.fee = props.fee || 0;
    this.questionText = props.questionText || [''];
    this.hashTag = props.hashTag || '';
    this.attendance = props.attendance || null;
    this.link = props.link || '';
    this.isSecret = props.isSecret || false;
    this.waiting = props.waiting ?? [];
    this.squareImage = props.squareImage || null;
    this.meetingType = props.meetingType || 'offline';
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.notionUrl = props.notionUrl;
    this.requiredTicket = props.requiredTicket ?? 1;
    this.totalDeposit = props.totalDeposit ?? 0;
    this.randomTicket = props.randomTicket ?? 0;
  }

  participateGroupStudy(userId: string, role: UserRole): void {
    if (!userId) {
      throw new Error('User ID, name, and UID cannot be empty');
    }

    const existingParticipant = this.participants.find(
      (p) => p.user.toString() === userId,
    );

    if (existingParticipant) {
      throw new Error('User is already a participant');
    }

    const newParticipant: ParticipantProps = {
      user: userId,
      randomId: Math.floor(Math.random() * 1000000),
      role,
      deposit: 0,
      monthAttendance: false,
      createdAt: new Date(),
    };

    this.participants.push(newParticipant);
  }

  // checkWeekAttendance(userId: string): boolean {
  //   const participant = this.participants.find(
  //     (p) => p.user.toString() === userId,
  //   );
  //   if (!participant) {
  //     throw new Error('Participant not found');
  //   }

  //   let ret = false;

  //   if (participant.weekAttendance !== true) {
  //     participant.weekAttendance = true;
  //     participant.attendCnt += 1;
  //     ret = true;
  //   }

  //   return ret;
  // }

  deleteParticipant(userId: string): void {
    const participantIndex = this.participants.findIndex(
      (p) => p.user.toString() === userId.toString(),
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

  checkMonthAttendance(userId, last): boolean {
    const participant = this.participants.find(
      (p) => p.user.toString() === userId,
    );
    if (!participant) {
      throw new Error('Participant not found');
    }

    let ret = false;

    if (last) {
      if (participant.lastMonthAttendance !== true) {
        participant.lastMonthAttendance = true;
        ret = true;
      }
    } else {
      if (participant.monthAttendance !== true) {
        participant.monthAttendance = true;
        ret = true;
      } else {
        participant.monthAttendance = false;
        ret = false;
      }
    }

    return ret;
  }

  processMonthAttendance(): void {
    this.participants.forEach((participant) => {
      participant.lastMonthAttendance = participant.monthAttendance;
    });
  }

  setWaiting({ userId, answer, pointType, createdAt }): void {
    if (!userId || !pointType) {
      throw new Error('Waiting must have a userId and pointType');
    }

    const existingWaiting = this.waiting.find(
      (w) => w.user.toString() === userId,
    );
    if (existingWaiting) {
      existingWaiting.answer = answer;
      existingWaiting.pointType = pointType;
    } else {
      this.waiting.push({ user: userId, answer, pointType, createdAt });
    }
  }

  agreeWaiting(userId: string): void {
    const waitingIndex = this.waiting.findIndex(
      (w) => w.user.toString() === userId,
    );
    if (waitingIndex !== -1) {
      const waitingUser = this.waiting[waitingIndex];
      this.participateGroupStudy(waitingUser.user, 'member');
      this.waiting.splice(waitingIndex, 1);
    }
  }

  disagreeWaiting(userId: string): void {
    const waitingIndex = this.waiting.findIndex(
      (w) => w.user.toString() === userId,
    );
    if (waitingIndex !== -1) {
      this.waiting.splice(waitingIndex, 1);
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
    const member = this.participants.find(
      (pt) => pt.user.toString() === userId,
    );

    if (existingRecord) {
      const beforeCnt = existingRecord.attendRecord.length;
      const diffCnt = weekRecord.length - beforeCnt;

      existingRecord.attendRecord = weekRecord;
      existingRecord.attendRecordSub = weekRecordSub || [];
    } else {
      const newWeekRecord: WeekRecordProps = {
        uid: userUid,
        name: userName,
        attendRecord: weekRecord,
        attendRecordSub: weekRecordSub || [],
      };

      if (type === 'this') {
        this.attendance.thisWeek.push(newWeekRecord);
      } else {
        this.attendance.lastWeek.push(newWeekRecord);
      }
    }
  }

  updateRole(userId: string, role: UserRole) {
    const participant = this.participants.find(
      (p) => p.user.toString() === userId.toString(),
    );
    if (!participant) {
      throw new Error('Participant not found');
    }
    participant.role = role;
  }

  updateDeposit(userId: string, deposit: number) {
    const participant = this.participants.find(
      (p) => p.user.toString() === userId,
    );

    if (!participant) {
      throw new Error('Participant not found');
    }

    if (deposit < 0) {
      throw new Error('Deposit cannot be negative');
    }

    participant.deposit = deposit;
  }

  updateRandomTicket(): void {
    this.randomTicket += 1;
  }

  toPrimitives(): GroupStudyProps {
    return {
      _id: this._id,
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
      requiredTicket: this.requiredTicket,
      totalDeposit: this.totalDeposit,
      randomTicket: this.randomTicket,
    };
  }
}
