export class LogRepository {
  // 1) Document -> Domain
  private mapToDomain(doc: ILog): Log {
    // doc.meta: { type: string; uid: string|number; value: number; sub: string; }
    // Zod 상 uid는 number이지만, Mongoose에는 string으로 저장될 수도 있음 (실무에서 통일 요망)

    // 편의상 여기서는 Number() 캐스팅
    const meta = {
      type: doc.meta.type,
      uid: Number(doc.meta.uid), // or doc.meta.uid if already number
      value: doc.meta.value,
      sub: doc.meta.sub ?? null,
    } as LogMetaProps;

    return new Log({
      timeStamp: doc.timeStamp,
      level: doc.level,
      message: doc.message,
      meta,
    });
  }

  // 2) Domain -> Document
  private mapToDB(log: Log): Partial<ILog> {
    const props = log.toPrimitives();
    return {
      timeStamp: props.timeStamp,
      level: props.level,
      message: props.message,
      meta: {
        type: props.meta.type,
        // uid가 number라면, DB에 문자열로 넣고 싶다면 .toString()?
        uid: props.meta.uid,
        value: props.meta.value,
        sub: props.meta.sub,
      },
    };
  }
}
