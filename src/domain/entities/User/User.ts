import { ENTITY } from 'src/Constants/ENTITY';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Interest } from './Interest';
import { LocationDetail } from './Location';
import { Major } from './Major';
import { Preference } from './Preference';
import { Rest } from './Rest';
import { StudyRecord } from './StudyRecord';
import { Temperature } from './Temperature';
import { Ticket } from './Ticket';

export interface IUser {
  _id?: string;
  uid?: string;
  name?: string;
  location?: string;
  mbti?: string;
  gender?: string;
  belong?: string | undefined;
  profileImage?: string;
  registerDate?: string;
  isActive?: boolean;
  birth?: string;
  isPrivate?: boolean;
  monthStudyTarget?: number | undefined;
  isLocationSharingDenied?: boolean;
  role?: string;
  score?: number;
  monthScore?: number;
  point?: number;
  comment?: string;
  rest?: Rest;
  avatar?: Avatar;
  majors?: Major[];
  interests?: Interest;
  telephone?: string;
  deposit?: number;
  friend?: string[];
  like?: number;
  instagram?: string | undefined;
  studyPreference?: Preference | undefined;
  locationDetail?: LocationDetail;
  ticket?: Ticket;
  badge?: Badge | undefined;
  studyRecord?: StudyRecord | undefined;
  temperature?: Temperature | undefined;
  introduceText?: string;
  rank?: String;
  rankPosition?: Number;
  membership?: (typeof ENTITY.USER.ENUM_MEMBERSHIP)[number];
}

export class User {
  constructor(
    public readonly _id?: string,
    public uid?: string,
    public name?: string,
    public location?: string,
    public mbti?: string,
    public gender?: string,
    public belong?: string | undefined,
    public profileImage?: string,
    public registerDate?: string,
    public isActive?: boolean,
    public birth?: string,
    public isPrivate?: boolean,
    public monthStudyTarget?: number | undefined,
    public isLocationSharingDenied?: boolean,
    public role?: string,
    public score?: number,
    public monthScore?: number,
    public point?: number,
    public comment?: string,
    public rest?: Rest,
    public avatar?: Avatar,
    public majors?: Major[],
    public interests?: Interest,
    public telephone?: string,
    public deposit?: number,
    public friend?: string[],
    public like?: number,
    public instagram?: string | undefined,
    public studyPreference?: Preference | undefined,
    public locationDetail?: LocationDetail,
    public ticket?: Ticket,
    public badge?: Badge | undefined,
    public studyRecord?: StudyRecord | undefined,
    public temperature?: Temperature | undefined,
    public introduceText?: string,
    public rank?: string,
    public rankPosition?: number,
    public membership?: (typeof ENTITY.USER.ENUM_MEMBERSHIP)[number],
  ) {
    this._id = _id || '';
    this.uid = uid || '';
    this.name = name || '';
    this.location = location || '';
    this.mbti = mbti || '';
    this.gender = gender || '';
    this.belong = belong || '';
    this.profileImage = profileImage || '';
    this.registerDate = registerDate || '';
    this.isActive = isActive || true;
    this.birth = birth || '';
    this.isPrivate = isPrivate || false;
    this.monthStudyTarget = monthStudyTarget || 0;
    this.isLocationSharingDenied = isLocationSharingDenied || false;
    this.role = role || 'user';
    this.score = score || 0;
    this.monthScore = monthScore || 0;
    this.point = point || 0;
    this.comment = comment || '';
    this.rest = rest || null;
    this.avatar = avatar || new Avatar();
    this.majors = majors || [];
    this.interests = interests || null;
    this.telephone = telephone || '';
    this.deposit = deposit || 0;
    this.friend = friend || [];
    this.like = like || 0;
    this.instagram = instagram || '';
    this.studyPreference = studyPreference || null;
    this.locationDetail = locationDetail || null;
    this.ticket = ticket || new Ticket();
    this.badge = badge || new Badge();
    this.studyRecord = studyRecord || new StudyRecord();
    this.temperature = temperature || new Temperature();
    this.introduceText = introduceText || '';
    this.rank = rank || 'bronze';
    this.rankPosition = rankPosition || 0;
    this.membership = membership || 'normal';
  }

  setRest(
    type: string,
    startDate: string,
    endDate: string,
    content: string,
    dayDiff: number,
  ): void {
    this.rest.setRest(type, startDate, endDate, content, dayDiff);
  }

  increasePoint(point: number): void {
    this.point += point;
  }
  increaseScore(score: number): void {
    this.score += score;
  }
  increaseDeposit(deposit: number): void {
    this.deposit += deposit;
  }
  increaseMonthScore(monthScore: number): void {
    this.monthScore += monthScore;
  }
  deleteFriend(uid: string): void {
    this.friend = this.friend.filter((f) => f !== uid);
  }
  setFriend(toUid: string): void {
    if (!this.friend.includes(toUid)) {
      this.friend.push(toUid);
    }
  }
  setLocationDetail(
    name: string,
    address: string,
    latitude: number,
    longitude: number,
  ): void {
    this.locationDetail.setLocationDetail(name, address, latitude, longitude);
  }

  //acc은 공부 횟수 & month는 공부 시간
  increaseStudyRecord(type: 'study' | 'solo', diffMinutes: number): void {
    if (type === 'study') {
      this.studyRecord.accumulationCnt += 1;
      this.studyRecord.monthCnt += diffMinutes;
    }
    if (type === 'solo') {
      this.studyRecord.accumulationMinutes += 1;
      this.studyRecord.monthMinutes += diffMinutes;
    }
  }

  increaseGatherTicket(num: number): void {
    this.ticket.gatherTicket += num;
  }
  increaseGroupStudyTicket(num: number): void {
    this.ticket.groupStudyTicket += num;
  }

  addBadge(badgeName: string): void {
    this.badge?.addBadge(badgeName);
  }
  selectBadge(badgeIdx: number): void {
    this.badge?.selectBadge(badgeIdx);
  }

  setTemperature(
    temperature: number,
    sum: number,
    cnt: number,
    blockCnt: number,
  ): void {
    if (!this.temperature) {
      this.temperature = new Temperature(temperature, sum, cnt, blockCnt);
    } else {
      this.temperature.setTemperature(temperature, sum, cnt, blockCnt);
    }
  }

  createMembership(): void {
    this.membership = 'newbie';
  }
  decayMembership(): void {
    this.membership = 'normal';
  }

  setRecord(
    accumulationMinutes: number,
    accumulationCnt: number,
    monthMinutes: number,
    monthCnt: number,
  ): void {
    if (!this.studyRecord) {
      this.studyRecord = new StudyRecord(
        accumulationMinutes,
        accumulationCnt,
        monthCnt,
        monthMinutes,
      );
    }
    this.studyRecord.setRecord(
      accumulationMinutes,
      accumulationCnt,
      monthCnt,
      monthMinutes,
    );
  }

  toPrimitives() {
    return {
      _id: this._id,
      uid: this.uid,
      name: this.name,
      location: this.location,
      mbti: this.mbti,
      gender: this.gender,
      belong: this.belong,
      profileImage: this.profileImage,
      registerDate: this.registerDate,
      isActive: this.isActive,
      birth: this.birth,
      isPrivate: this.isPrivate,
      monthStudyTarget: this.monthStudyTarget,
      isLocationSharingDenied: this.isLocationSharingDenied,
      role: this.role,
      score: this.score,
      monthScore: this.monthScore,
      point: this.point,
      comment: this.comment,
      rest: this.rest.toPrimitives(),
      avatar: this.avatar.toPrimitives(),
      majors: this.majors.map((m) => m.toPrimitives()),
      interests: this.interests.toPrimitives(),
      telephone: this.telephone,
      deposit: this.deposit,
      friend: this.friend,
      like: this.like,
      instagram: this.instagram,
      studyPreference: this.studyPreference?.toPrimitives(),
      locationDetail: this.locationDetail.toPrimitives(),
      ticket: this.ticket.toPrimitives(),
      badge: this.badge?.toPrimitives(),
      studyRecord: this.studyRecord?.toPrimitives(),
      temperature: this.temperature,
      rank: this.rank,
      rankPosition: this.rankPosition,
      introduceText: this.introduceText,
      membership: this.membership,
    };
  }
}
