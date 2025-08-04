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
}

export class User {
  constructor(
    public readonly _id?: string,
    public uid?: string,
    public name?: string,
    public mbti?: string,
    public gender?: string,
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
    public friend?: string[],
    public like?: number,
    public instagram?: string | undefined,
    public locationDetail?: LocationDetail,
    public ticket?: Ticket,
    public badge?: Badge | undefined,
    public studyRecord?: StudyRecord | undefined,
    public temperature?: Temperature | undefined,
    public introduceText?: string,
    public rank?: string,
  ) {
    this._id = _id || '';
    this.uid = uid || '';
    this.name = name || '';
    this.mbti = mbti || '';
    this.gender = gender || '';
    this.profileImage = profileImage || '';
    this.registerDate = registerDate || new Date().toISOString();
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
    this.friend = friend || [];
    this.like = like || 0;
    this.instagram = instagram || '';
    this.locationDetail = locationDetail || null;
    this.ticket = ticket || new Ticket();
    this.badge = badge || new Badge();
    this.studyRecord = studyRecord || new StudyRecord();
    this.temperature = temperature || new Temperature();
    this.introduceText = introduceText || '';
    this.rank = rank || 'bronze';
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
  setLocationDetail(text: string, lat: string, lon: string): void {
    this.locationDetail.setLocationDetail(text, lat, lon);
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

  setTemperature(temperature: number, sum: number, cnt: number): void {
    if (!this.temperature) {
      this.temperature = new Temperature(temperature, sum, cnt);
    } else {
      this.temperature.setTemperature(temperature, sum, cnt);
    }
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
      mbti: this.mbti,
      gender: this.gender,
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
      friend: this.friend,
      like: this.like,
      instagram: this.instagram,
      locationDetail: this.locationDetail.toPrimitives(),
      ticket: this.ticket.toPrimitives(),
      badge: this.badge?.toPrimitives(),
      studyRecord: this.studyRecord?.toPrimitives(),
      temperature: this.temperature,
      rank: this.rank,
      introduceText: this.introduceText,
    };
  }
}
