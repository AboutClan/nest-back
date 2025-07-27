import { NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';
import { ENTITY } from 'src/Constants/ENTITY';
import { Square } from 'src/domain/entities/Square/Square';
import { SecretSquareItem } from './square.entity';
import { ISquareRepository } from './square.repository.interface';

export class SquareRepository implements ISquareRepository {
  constructor(
    @InjectModel(DB_SCHEMA.SQUARE)
    private readonly SquareModel: Model<SecretSquareItem>,
  ) {}

  // Domain Entity와 DB Entity 간의 변환 함수들
  private mapToDomain(dbEntity: SecretSquareItem): Square {
    return new Square({
      _id: dbEntity._id?.toString(),
      category: dbEntity.category,
      title: dbEntity.title,
      content: dbEntity.content,
      type: dbEntity.type,
      poll: dbEntity.poll
        ? {
            pollItems: dbEntity.poll?.pollItems?.map((item) => ({
              _id: item._id?.toString(),
              name: item.name,
              users: item.users || [],
            })),
            canMultiple: dbEntity.poll.canMultiple,
          }
        : {
            pollItems: [],
            canMultiple: false,
          },

      images: dbEntity.images || [],
      author: dbEntity.author,
      viewers: dbEntity.viewers || [],
      like: dbEntity.like || [],
      comments:
        dbEntity.comments?.map((comment) => ({
          _id: comment._id?.toString(),
          user: comment.user,
          comment: comment.comment,
          subComments:
            comment.subComments?.map((subComment) => ({
              user: subComment.user,
              comment: subComment.comment,
              likeList: subComment.likeList || [],
            })) || [],
          likeList: comment.likeList || [],
          createdAt: (comment as any).createdAt,
          updatedAt: (comment as any).updatedAt,
        })) || [],
      createdAt: (dbEntity as any).createdAt,
      updatedAt: (dbEntity as any).updatedAt,
    });
  }

  private mapToDb(domainEntity: Square): any {
    return {
      _id: domainEntity._id,
      category: domainEntity.category,
      title: domainEntity.title,
      content: domainEntity.content,
      type: domainEntity.type,
      poll: domainEntity.poll
        ? {
            pollItems: domainEntity.poll.pollItems?.map((item) => ({
              _id: item._id,
              name: item.name,
              users: item.users,
            })),
            canMultiple: domainEntity.poll.canMultiple,
          }
        : undefined,
      images: domainEntity.images,
      author: domainEntity.author,
      viewers: domainEntity.viewers,
      like: domainEntity.like,
      comments:
        domainEntity.comments?.map((comment) => ({
          _id: comment._id,
          user: comment.user,
          comment: comment.comment,
          subComments:
            comment.subComments?.map((subComment) => ({
              user: subComment.user,
              comment: subComment.comment,
              likeList: subComment.likeList,
            })) || [],
          likeList: comment.likeList,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })) || [],
      createdAt: domainEntity.createdAt,
      updatedAt: domainEntity.updatedAt,
    };
  }

  async create(square: Square): Promise<Square> {
    const dbData = this.mapToDb(square);
    const createdSquare = await this.SquareModel.create(dbData);
    return this.mapToDomain(createdSquare);
  }

  async findById(id: string): Promise<Square | null> {
    const square = await this.SquareModel.findById(id);
    if (!square) {
      return null;
    }

    if (square.type === 'info') {
      await square.populate({
        path: 'author',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
      await square.populate({
        path: 'like',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
      await square.populate({
        path: 'comments.user',
        select: ENTITY.USER.C_SIMPLE_USER,
      });
    }

    return this.mapToDomain(square);
  }

  async findAll(): Promise<Square[]> {
    const squares = await this.SquareModel.find().sort({ createdAt: -1 });

    if (squares.length === 0) {
      return [];
    }
    squares.forEach((square) => {
      if (square.type === 'info') {
        square.populate([
          { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
          { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
          {
            path: 'comments.subComments.user',
            select: ENTITY.USER.C_SIMPLE_USER,
          },
        ]);
      }
    });

    return squares.map((square) => this.mapToDomain(square));
  }

  async update(id: string, square: Square): Promise<Square | null> {
    const dbData = this.mapToDb(square);
    const updatedSquare = await this.SquareModel.findByIdAndUpdate(id, dbData, {
      new: true,
    }).populate([
      { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
      { path: 'comments.subComments.user', select: ENTITY.USER.C_SIMPLE_USER },
    ]);

    if (!updatedSquare) return null;
    return this.mapToDomain(updatedSquare);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.SquareModel.findByIdAndDelete(id);
    return !!result;
  }

  async save(square: Square): Promise<Square> {
    const dbData = this.mapToDb(square);
    const savedSquare = await this.SquareModel.findByIdAndUpdate(
      square._id,
      dbData,
      { new: true },
    );
    return savedSquare ? this.mapToDomain(savedSquare) : null;
  }

  async findByCategory(category: string): Promise<Square[]> {
    const squares = await this.SquareModel.find({ category })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }

  async findByType(type: string): Promise<Square[]> {
    const squares = await this.SquareModel.find({ type })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }

  async findByAuthor(authorId: string): Promise<Square[]> {
    const squares = await this.SquareModel.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }

  async addViewer(squareId: string, userId: string): Promise<void> {
    await this.SquareModel.findByIdAndUpdate(squareId, {
      $addToSet: { viewers: userId },
    });
  }

  async addImage(squareId: string, imageUrl: string): Promise<void> {
    await this.SquareModel.findByIdAndUpdate(squareId, {
      $push: { images: imageUrl },
    });
  }

  async removeImage(squareId: string, imageUrl: string): Promise<void> {
    await this.SquareModel.findByIdAndUpdate(squareId, {
      $pull: { images: imageUrl },
    });
  }

  async searchByTitle(title: string): Promise<Square[]> {
    const squares = await this.SquareModel.find({
      title: { $regex: title, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }

  async searchByContent(content: string): Promise<Square[]> {
    const squares = await this.SquareModel.find({
      content: { $regex: content, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }

  async findWithPagination(
    page: number,
    limit: number,
  ): Promise<{ squares: Square[]; total: number }> {
    const skip = (page - 1) * limit;
    const [squares, total] = await Promise.all([
      this.SquareModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
          { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
          {
            path: 'comments.subComments.user',
            select: ENTITY.USER.C_SIMPLE_USER,
          },
        ]),
      this.SquareModel.countDocuments(),
    ]);

    return {
      squares: squares.map((square) => this.mapToDomain(square)),
      total,
    };
  }

  async findPopularSquares(limit: number): Promise<Square[]> {
    const squares = await this.SquareModel.aggregate([
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$like', []] } },
        },
      },
      {
        $sort: { likeCount: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    // Aggregate 결과를 populate하기 위해 다시 조회
    const squareIds = squares.map((square) => square._id);
    const populatedSquares = await this.SquareModel.find({
      _id: { $in: squareIds },
    })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return populatedSquares.map((square) => this.mapToDomain(square));
  }

  async findRecentSquares(limit: number): Promise<Square[]> {
    const squares = await this.SquareModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate([
        { path: 'author', select: ENTITY.USER.C_SIMPLE_USER },
        { path: 'comments.user', select: ENTITY.USER.C_SIMPLE_USER },
        {
          path: 'comments.subComments.user',
          select: ENTITY.USER.C_SIMPLE_USER,
        },
      ]);

    return squares.map((square) => this.mapToDomain(square));
  }
}
