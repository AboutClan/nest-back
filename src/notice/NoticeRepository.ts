export class NoticeRepository {
  /**
   * Document -> Domain
   */
  private mapToDomain(doc: INotice): Notice {
    return new Notice({
      from: doc.from,
      to: doc.to,
      type: doc.type as NoticeType, // enum cast
      message: doc.message,
      status: doc.status as NoticeStatus, // enum cast
      sub: doc.sub ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Domain -> Document
   */
  private mapToDB(notice: Notice): Partial<INotice> {
    const p = notice.toPrimitives();
    return {
      from: p.from,
      to: p.to,
      type: p.type,
      message: p.message,
      status: p.status,
      sub: p.sub,
      // createdAt, updatedAt: Mongoose timestamps로 자동 관리 가능
      // 필요 시 명시적으로 설정할 수도 있음
    };
  }
}
