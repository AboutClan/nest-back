export class UserRepository {
  /**
   * Document -> Domain
   */
  private mapToDomain(doc: IUser): User {
    // rest
    const rest: RestProps = {
      type: doc.rest.type,
      startDate: doc.rest.startDate,
      endDate: doc.rest.endDate,
      content: doc.rest.content,
      restCnt: doc.rest.restCnt ?? 0,
      cumulativeSum: doc.rest.cumulativeSum ?? 0,
    };
    // avatar
    const avatar: AvatarProps = {
      type: doc.avatar.type,
      bg: doc.avatar.bg,
    };
    // preference
    let studyPreference: StudyPreferenceProps | undefined;
    if (doc.studyPreference) {
      studyPreference = {
        place: doc.studyPreference.place?.toString(), // doc => string
        subPlace:
          doc.studyPreference.subPlace?.map((sp) => sp.toString()) ?? [],
      };
    }
    // ticket
    const ticket: TicketProps = {
      gatherTicket: doc.ticket.gatherTicket,
      groupStudyTicket: doc.ticket.groupStudyTicket,
    };
    // badge
    let badge: BadgeProps | undefined;
    if (doc.badge) {
      badge = {
        badgeIdx: doc.badge.badgeIdx,
        badgeList: doc.badge.badgeList,
      };
    }

    const props: UserProps = {
      uid: doc.uid,
      name: doc.name,
      location: doc.location,
      mbti: doc.mbti,
      gender: doc.gender,
      belong: doc.belong,
      profileImage: doc.profileImage,
      registerDate: doc.registerDate,
      isActive: doc.isActive,
      birth: doc.birth,
      isPrivate: doc.isPrivate,
      role: doc.role,
      score: doc.score,
      monthScore: doc.monthScore,
      point: doc.point,
      comment: doc.comment,
      rest: rest,
      avatar: avatar,
      deposit: doc.deposit,
      friend: doc.friend ?? [],
      like: doc.like,
      instagram: doc.instagram,
      studyPreference: studyPreference,
      weekStudyTragetHour: doc.weekStudyTragetHour,
      weekStudyAccumulationMinutes: doc.weekStudyAccumulationMinutes,
      ticket: ticket,
      badge: badge,
      majors: doc.majors ?? [],
      interests: doc.interests ?? { first: '', second: '' },
      telephone: doc.telephone,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new User(props);
  }

  /**
   * Domain -> Document
   */
  private mapToDB(user: User): Partial<IUser> {
    const p = user.toPrimitives();
    return {
      uid: p.uid,
      name: p.name,
      location: p.location,
      mbti: p.mbti,
      gender: p.gender,
      belong: p.belong,
      profileImage: p.profileImage,
      registerDate: p.registerDate,
      isActive: p.isActive,
      birth: p.birth,
      isPrivate: p.isPrivate,
      role: p.role,
      score: p.score,
      monthScore: p.monthScore,
      point: p.point,
      comment: p.comment,
      rest: {
        type: p.rest.type,
        startDate: p.rest.startDate,
        endDate: p.rest.endDate,
        content: p.rest.content,
        restCnt: p.rest.restCnt,
        cumulativeSum: p.rest.cumulativeSum,
      },
      avatar: {
        type: p.avatar.type,
        bg: p.avatar.bg,
      },
      deposit: p.deposit,
      friend: p.friend,
      like: p.like,
      instagram: p.instagram,
      studyPreference: p.studyPreference
        ? {
            place: p.studyPreference.place, // string -> ObjectId if needed
            subPlace: p.studyPreference.subPlace, // string[] -> ObjectId[] if needed
          }
        : undefined,
      weekStudyTragetHour: p.weekStudyTragetHour,
      weekStudyAccumulationMinutes: p.weekStudyAccumulationMinutes,
      ticket: {
        gatherTicket: p.ticket.gatherTicket,
        groupStudyTicket: p.ticket.groupStudyTicket,
      },
      badge: p.badge
        ? {
            badgeIdx: p.badge.badgeIdx,
            badgeList: p.badge.badgeList,
          }
        : undefined,
      majors: p.majors, // if we have domain objects for majors, convert them
      interests: p.interests,
      telephone: p.telephone,
      // createdAt, updatedAt are managed by Mongoose timestamps
    };
  }
}
