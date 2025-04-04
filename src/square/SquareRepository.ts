export class SquareRepository {
  /**
   * Mongoose Document -> Domain Entity
   */
  private mapToDomain(doc: SecretSquareItem): Square {
    // doc.author, doc.viewers, doc.like: ObjectId => domain: string
    // doc.poll: pollItems => PollItemProps
    // doc.comments => domain CommentProps
    // doc.subComments => domain SubCommentProps

    const pollProps: PollProps | undefined = doc.poll
      ? {
          pollItems: doc.poll.pollItems.map(
            (item) =>
              ({
                id: item._id?.toString(),
                name: item.name,
                users: item.users?.map((u) => u.toString()) ?? [],
              }) as PollItemProps,
          ),
          canMultiple: doc.poll.canMultiple,
        }
      : undefined;

    const commentsProps: CommentProps[] = (doc.comments ?? []).map(
      (commentDoc) => {
        const subCommentsProps: SubCommentProps[] = (
          commentDoc.subComments ?? []
        ).map((sub) => ({
          userId: sub.user?.toString() ?? '',
          comment: sub.comment,
          likeList: sub.likeList ?? [],
        }));
        return {
          userId: commentDoc.user.toString(),
          comment: commentDoc.comment,
          subComments: subCommentsProps,
          likeList: commentDoc.likeList ?? [],
        };
      },
    );

    const props: SquareProps = {
      id: doc._id?.toString(),
      category: doc.category as SquareCategory,
      title: doc.title,
      content: doc.content,
      type: doc.type as SquareType,
      poll: pollProps,
      images: doc.images ?? [],
      authorId: doc.author.toString(),
      viewers: doc.viewers?.map((v) => v.toString()) ?? [],
      like: doc.like?.map((l) => l.toString()) ?? [],
      comments: commentsProps,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new Square(props);
  }

  /**
   * Domain Entity -> Mongoose Document
   */
  private mapToDB(square: Square): Partial<SecretSquareItem> {
    const p = square.toPrimitives();
    return {
      category: p.category,
      title: p.title,
      content: p.content,
      type: p.type,
      poll: p.poll
        ? {
            pollItems: p.poll.pollItems.map((item) => ({
              _id: item.id, // can be used if we want to preserve id
              name: item.name,
              users: item.users?.map((u) => u), // Mongoose will interpret as ObjectId
            })),
            canMultiple: p.poll.canMultiple,
          }
        : undefined,
      images: p.images ?? [],
      author: p.authorId, // string -> ObjectId by Mongoose
      viewers: p.viewers?.map((v) => v), // same
      like: p.like?.map((l) => l),
      comments: p.comments?.map((c) => ({
        user: c.userId, // string -> ObjectId
        comment: c.comment,
        subComments: c.subComments?.map((sc) => ({
          user: sc.userId, // string -> ObjectId
          comment: sc.comment,
          likeList: sc.likeList ?? [],
        })),
        likeList: c.likeList ?? [],
      })),
      // createdAt, updatedAt: automatically handled by Mongoose timestamps
    };
  }
}
