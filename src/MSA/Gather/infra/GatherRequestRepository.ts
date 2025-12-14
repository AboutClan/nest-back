import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import {
  GatherRequest,
  IGatherRequest,
} from 'src/domain/entities/GatherRequest/GatherRequest';
import { IGatherRequestRepository } from '../core/interfaces/GatherRequestRepository.interface';

export class GatherRequestRepository implements IGatherRequestRepository {
  constructor(
    @InjectModel(DB_SCHEMA.GATHERREQUEST)
    private readonly GatherRequest: Model<IGatherRequest>,
  ) {}

  async findAll(): Promise<GatherRequest[]> {
    const gatherRequest = await this.GatherRequest.find().populate({
      path: 'writer',
      select: ENTITY.USER.C_SIMPLE_USER,
    });

    return gatherRequest.map((gr) => this.mapToDomain(gr));
  }
  async create(gatherRequest: GatherRequest): Promise<void> {
    const gatherRequestDb = this.mapToDb(gatherRequest);

    await this.GatherRequest.create(gatherRequestDb);
  }

  async save(gatherRequest: GatherRequest): Promise<void> {
    const gatherRequestDb = this.mapToDb(gatherRequest);

    await this.GatherRequest.updateOne(
      { _id: gatherRequest._id },
      gatherRequestDb,
      { upsert: true },
    );
  }
  async findById(grId: string): Promise<GatherRequest | null> {
    const gatherRequest = await this.GatherRequest.findById(grId);

    return gatherRequest ? this.mapToDomain(gatherRequest) : null;
  }

  private mapToDomain(gatherRequest: IGatherRequest): GatherRequest {
    return new GatherRequest({
      _id: gatherRequest._id,
      writer: gatherRequest.writer,
      title: gatherRequest.title,
      content: gatherRequest.content,
      like: gatherRequest.like,
      createdAt: gatherRequest.createdAt,
      prize: gatherRequest.prize,
      status: gatherRequest.status,
      isAnonymous: gatherRequest.isAnonymous,
    });
  }

  private mapToDb(gatherRequest: GatherRequest): Partial<IGatherRequest> {
    return {
      _id: gatherRequest._id,
      writer: gatherRequest.writer,
      title: gatherRequest.title,
      content: gatherRequest.content,
      like: gatherRequest.like,
      createdAt: gatherRequest.createdAt,
      prize: gatherRequest.prize,
      status: gatherRequest.status,
      isAnonymous: gatherRequest.isAnonymous,
    };
  }
}
