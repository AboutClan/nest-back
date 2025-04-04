import dayjs from 'dayjs';
import { Request, RequestProps } from '../../../domain/entities/Request';
import { RestProps } from '../../../domain/entities/Rest';
import {
  IRequestData
} from '../schemas/RequestSchema';

export class RequestRepository {
  /**
   * Document -> Domain
   */
  private mapToDomain(doc: IRequestData): Request {
    // doc.rest: { type: string, start: Date, end: Date } | undefined
    let restProps: RestProps | undefined = undefined;
    if (doc.rest) {
      restProps = {
        type: doc.rest.type,
        start: dayjs(doc.rest.start), // convert Date -> dayjs
        end: dayjs(doc.rest.end),
      };
    }

    const props: RequestProps = {
      category: doc.category,
      title: doc.title,
      location: doc.location,
      writer: doc.writer,
      content: doc.content,
      rest: restProps,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return new Request(props);
  }

  /**
   * Domain -> Document
   */
  private mapToDB(request: Request): Partial<IRequestData> {
    const p = request.toPrimitives();
    return {
      category: p.category,
      title: p.title,
      location: p.location,
      writer: p.writer,
      content: p.content,
      rest: p.rest
        ? {
            type: p.rest.type,
            start: new Date(p.rest.start), // dayjs -> Date
            end: new Date(p.rest.end),
          }
        : undefined,
      // createdAt, updatedAt: usually timestamps from Mongoose
    };
  }
}
