export class RealtimeRepository {
  // 1) Document -> Domain
  private mapToDomain(doc: IRealtime): Realtime {
    // doc.userList: IRealtimeUser[] => RealtimeUserProps[]
    const userListProps = (doc.userList ?? []).map((userDoc) => {
      // userDoc.user => string|ObjectId
      // place => { lat, long, name, address }
      const place: PlaceProps = {
        latitude: userDoc.place.latitude,
        longitude: userDoc.place.longitude,
        name: userDoc.place.name,
        address: userDoc.place.address,
        id: userDoc.place._id, // optional
      };

      const userProps: RealtimeUserProps = {
        userId: userDoc.user.toString(), // ObjectId -> string
        place: place,
        arrived: userDoc.arrived,
        image: userDoc.image,
        memo: userDoc.memo,
        comment: userDoc.comment ? { text: userDoc.comment.text } : undefined,
        status: userDoc.status as RealtimeStatus,
        time: {
          start: userDoc.time.start,
          end: userDoc.time.end,
        },
      };
      return userProps;
    });

    return new Realtime({
      date: doc.date,
      userList: userListProps,
    });
  }

  // 2) Domain -> Document
  private mapToDB(realtime: Realtime): Partial<IRealtime> {
    const p = realtime.toPrimitives(); // { date, userList: RealtimeUserProps[] }

    // userList: RealtimeUserProps[] => IRealtimeUser[]
    const userListDocs = (p.userList ?? []).map((u) => {
      return {
        user: u.userId, // Mongoose can convert string -> ObjectId
        place: {
          latitude: u.place.latitude,
          longitude: u.place.longitude,
          name: u.place.name,
          address: u.place.address,
          _id: u.place.id, // optional
        },
        arrived: u.arrived,
        image: u.image,
        memo: u.memo,
        comment: u.comment ? { text: u.comment.text } : undefined,
        status: u.status,
        time: {
          start: u.time.start,
          end: u.time.end,
        },
      };
    });

    return {
      date: p.date,
      userList: userListDocs,
    };
  }
}
