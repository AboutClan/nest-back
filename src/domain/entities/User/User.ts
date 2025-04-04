// src/domain/entities/User.ts
import { Avatar, AvatarProps } from './Avatar';
import { Badge, BadgeProps } from './Badge';
import { Rest, RestProps } from './Rest';
import { StudyPreference, StudyPreferenceProps } from './StudyPreference';
import { Ticket, TicketProps } from './Ticket';

export interface UserProps {
  uid: string;
  name: string;
  location: string;
  mbti: string;
  gender: string;
  belong?: string;
  profileImage: string;
  registerDate: string;
  isActive?: boolean;
  birth: string;
  isPrivate?: boolean;
  role?: string;
  score: number;
  monthScore: number;
  point: number;
  comment: string;
  rest: RestProps;
  avatar: AvatarProps;
  deposit: number;
  friend: string[];
  like: number;
  instagram?: string;
  studyPreference?: StudyPreferenceProps;
  weekStudyTragetHour: number;
  weekStudyAccumulationMinutes: number;
  ticket: TicketProps;
  badge?: BadgeProps;
  majors: any[]; // or define a Major entity
  interests: {
    first?: string;
    second?: string;
  };
  telephone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 도메인 엔티티: User
 * - DB, Mongoose, zod에 의존하지 않음
 * - 필요한 비즈니스 로직, 상태 캡슐화
 */
export class User {
  private uid: string;
  private name: string;
  private location: string;
  private mbti: string;
  private gender: string;
  private belong?: string;
  private profileImage: string;
  private registerDate: string;
  private isActive?: boolean;
  private birth: string;
  private isPrivate?: boolean;
  private role?: string;
  private score: number;
  private monthScore: number;
  private point: number;
  private comment: string;
  private rest: Rest; // sub-entity
  private avatar: Avatar; // sub-entity
  private deposit: number;
  private friend: string[];
  private like: number;
  private instagram?: string;
  private studyPreference?: StudyPreference;
  private weekStudyTragetHour: number;
  private weekStudyAccumulationMinutes: number;
  private ticket: Ticket;
  private badge?: Badge;
  private majors: any[]; // or domain-typed array
  private interests: { first?: string; second?: string };
  private telephone: string;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(props: UserProps) {
    if (!props.uid) throw new Error('uid is required');
    if (!props.name) throw new Error('name is required');
    if (!props.location) throw new Error('location is required');

    // ... add other required field checks as needed

    this.uid = props.uid;
    this.name = props.name;
    this.location = props.location;
    this.mbti = props.mbti || '';
    this.gender = props.gender || '';
    this.belong = props.belong;
    this.profileImage = props.profileImage || '';
    this.registerDate = props.registerDate || '';
    this.isActive = props.isActive ?? false;
    this.birth = props.birth || '';
    this.isPrivate = props.isPrivate ?? false;
    this.role = props.role || 'member';
    this.score = props.score ?? 0;
    this.monthScore = props.monthScore ?? 0;
    this.point = props.point ?? 0;
    this.comment = props.comment ?? '';
    this.rest = new Rest(props.rest);
    this.avatar = new Avatar(props.avatar);
    this.deposit = props.deposit ?? 3000;
    this.friend = props.friend ?? [];
    this.like = props.like ?? 0;
    this.instagram = props.instagram ?? '';
    this.studyPreference = props.studyPreference
      ? new StudyPreference(props.studyPreference)
      : undefined;
    this.weekStudyTragetHour = props.weekStudyTragetHour ?? 0;
    this.weekStudyAccumulationMinutes = props.weekStudyAccumulationMinutes ?? 0;
    this.ticket = new Ticket(props.ticket);
    this.badge = props.badge ? new Badge(props.badge) : undefined;
    this.majors = props.majors ?? [];
    this.interests = props.interests ?? { first: '', second: '' };
    this.telephone = props.telephone ?? '';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // Getter methods / domain logic as needed

  toPrimitives(): UserProps {
    return {
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
      role: this.role,
      score: this.score,
      monthScore: this.monthScore,
      point: this.point,
      comment: this.comment,
      rest: this.rest.toPrimitives(),
      avatar: this.avatar.toPrimitives(),
      deposit: this.deposit,
      friend: [...this.friend],
      like: this.like,
      instagram: this.instagram,
      studyPreference: this.studyPreference?.toPrimitives(),
      weekStudyTragetHour: this.weekStudyTragetHour,
      weekStudyAccumulationMinutes: this.weekStudyAccumulationMinutes,
      ticket: this.ticket.toPrimitives(),
      badge: this.badge?.toPrimitives(),
      majors: this.majors,
      interests: this.interests,
      telephone: this.telephone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
