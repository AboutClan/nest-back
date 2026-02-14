
import { Place } from '../Realtime/Place';
import { Member, MemberProps } from './Vote2Member';

export interface ResultProps {
  placeId: string | Place;
  members: MemberProps[];
  center?: any;
  reviewers: string[];
}

export class Result {
  placeId: string | Place;
  members: Member[];
  center?: any;
  reviewers: string[];

  constructor(props: ResultProps) {
    this.placeId = props.placeId;
    this.members = props.members.map((m) => new Member(m));
    this.center = props.center;
    this.reviewers = props.reviewers;
  }

  toPrimitives(): ResultProps {
    return {
      placeId: this.placeId as string,
      members: this.members.map((m) => m.toPrimitives()),
      center: this.center,
      reviewers: this.reviewers,
    };
  }
}
