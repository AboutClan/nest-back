import { Place } from '../Place';
import { Member, MemberProps } from './Vote2Member';

export interface ResultProps {
  placeId: string | Place;
  members: MemberProps[];
  center?: any;
}

export class Result {
  placeId: string | Place;
  members: Member[];
  center?: any;

  constructor(props: ResultProps) {
    this.placeId = props.placeId;
    this.members = props.members.map((m) => new Member(m));
    this.center = props.center;
  }

  toPrimitives(): ResultProps {
    return {
      placeId: this.placeId,
      members: this.members.map((m) => m.toPrimitives()),
      center: this.center,
    };
  }
}
