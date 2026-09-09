import mongoose, { model, Model, Schema } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { IPlace } from 'src/MSA/Place/entity/place.entity';
import { IUser } from '../../User/entity/user.entity';

export interface IVote2 {
  date: string;
  participations: IParticipation[];
  results: any[];
}

/**
 * 매칭 기준점. 유저는 최대 2개까지 지정할 수 있고, 그중 어느 하나라도
 * eps 안에 장소가 들어오면 그 장소에 참여 가능한 것으로 본다(union).
 * 순서에는 의미가 없다 — anchors[0]은 아래 latitude/longitude의 미러링이다.
 */
export interface IAnchor {
  latitude: number;
  longitude: number;
  locationDetail?: string;
}

export interface IParticipation {
  userId: string | IUser;
  // anchors[0]과 동일. anchors를 안 보내는 레거시 클라이언트를 위해 유지한다.
  latitude: number;
  longitude: number;
  start?: string;
  end?: string;
  comment?: IVoteComment;
  locationDetail: string;
  isBeforeResult?: boolean;
  // 매칭 반경(km). 유저당 1개이며 모든 anchor에 공통 적용된다.
  eps?: number;
  anchors?: IAnchor[];
}

export interface IMember {
  userId: string | IUser;
  arrived?: Date;
  memo?: string;
  img?: string;
  start?: string;
  end?: string;
  absence?: boolean;
  comment?: {
    text: string;
  };
  imageUrl?: string;
}

export interface IResult {
  placeId: string | String | IPlace;
  members: IMember[];
  center: any;
  reviewers?: string[];
}

export interface IVoteComment {
  comment: string;
}

export const voteCommentSchema: Schema<IVoteComment> = new Schema(
  {
    comment: String,
  },
  {
    timestamps: true,
  },
);

export const MemberSchema: Schema<IMember> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    start: String,
    end: String,
    arrived: Date,
    absence: {
      type: Boolean,
      default: false,
    },
    memo: String,
    img: String,
    comment: voteCommentSchema,
    imageUrl: String,
  },
  { _id: false },
);

export const AnchorSchema: Schema<IAnchor> = new Schema(
  {
    latitude: Number,
    longitude: Number,
    locationDetail: String,
  },
  { _id: false },
);

export const ParticipationSchema: Schema<IParticipation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.USER,
    },
    latitude: Number,
    longitude: Number,
    start: {
      type: String,
      required: false,
    },
    end: {
      type: String,
      required: false,
    },
    comment: {
      type: voteCommentSchema,
    },
    locationDetail: String,
    isBeforeResult: {
      type: Boolean,
      default: false,
    },
    eps: {
      type: Number,
      default: 3,
    },
    anchors: {
      type: [AnchorSchema],
      default: undefined,
    },
  },
  { _id: false },
);

export const ResultSchema: Schema<IResult> = new Schema(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: DB_SCHEMA.PLACE,
    },
    members: [MemberSchema],
    reviewers: [String],
  },
  { _id: false },
);

export const Vote2Schema: Schema<IVote2> = new Schema({
  date: String,
  participations: {
    type: [ParticipationSchema],
    default: [],
  },
  results: [ResultSchema],
});

export const Vote2 =
  (mongoose.models.Vote2 as Model<IVote2, {}, {}, {}>) ||
  model<IVote2>(DB_SCHEMA.VOTE, Vote2Schema);
