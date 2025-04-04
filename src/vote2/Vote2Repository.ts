export class Vote2Repository {
  /**
   * Document -> Domain Entity
   */
  private mapToDomain(doc: IVote2): Vote2 {
    // doc.participations: IParticipation[]
    const participationProps: ParticipationProps[] = (
      doc.participations ?? []
    ).map((p) => ({
      userId: p.userId.toString(), // ObjectId -> string
      latitude: p.latitude,
      longitude: p.longitude,
      start: p.start,
      end: p.end,
    }));

    // doc.results: any[] -> actually IResult[] => placeId + members
    // doc.results[].members: IMember[]
    const resultsProps: ResultProps[] = (doc.results ?? []).map((r) => {
      const membersProps: MemberProps[] = (r.members ?? []).map((m) => ({
        userId: m.userId.toString(),
        arrived: m.arrived,
        memo: m.memo,
        img: m.img,
        start: m.start,
        end: m.end,
        absence: m.absence ?? false,
      }));
      return {
        placeId: r.placeId.toString(),
        members: membersProps,
      };
    });

    const vote2Props: Vote2Props = {
      date: doc.date,
      participations: participationProps,
      results: resultsProps,
    };

    return new Vote2(vote2Props);
  }

  /**
   * Domain -> Document
   */
  private mapToDB(vote: Vote2): Partial<IVote2> {
    const p = vote.toPrimitives(); // { date, participations, results }

    // participations: ParticipationProps -> IParticipation
    const participationsDB = p.participations.map((part) => ({
      userId: part.userId, // Mongoose can interpret as ObjectId if needed
      latitude: part.latitude,
      longitude: part.longitude,
      start: part.start,
      end: part.end,
    }));

    // results: ResultProps -> IResult
    const resultsDB = p.results.map((res) => ({
      placeId: res.placeId, // Mongoose can interpret as ObjectId if needed
      members: res.members.map((m) => ({
        userId: m.userId, // string -> ObjectId if needed
        arrived: m.arrived,
        memo: m.memo,
        img: m.img,
        start: m.start,
        end: m.end,
        absence: m.absence ?? false,
      })),
    }));

    return {
      date: p.date,
      participations: participationsDB,
      results: resultsDB,
    };
  }
}
