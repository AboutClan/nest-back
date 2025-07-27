import { Square } from 'src/domain/entities/Square/Square';
import { SquareComment } from 'src/domain/entities/Square/SquareComment';

export interface ISquareRepository {
  // 기본 CRUD
  create(square: Square): Promise<Square>;
  findById(id: string): Promise<Square | null>;
  findAll(): Promise<Square[]>;
  update(id: string, square: Square): Promise<Square | null>;
  save(square: Square): Promise<Square>;
  delete(id: string): Promise<boolean>;

  // 카테고리별 조회
  findByCategory(
    category: string,
    start: number,
    gap: number,
  ): Promise<Square[]>;

  // 타입별 조회
  findByType(type: string): Promise<Square[]>;

  // 작성자별 조회
  findByAuthor(authorId: string): Promise<Square[]>;

  // 조회수 관련
  addViewer(squareId: string, userId: string): Promise<void>;

  // 이미지 관련
  addImage(squareId: string, imageUrl: string): Promise<void>;
  removeImage(squareId: string, imageUrl: string): Promise<void>;

  // 검색
  searchByTitle(title: string): Promise<Square[]>;
  searchByContent(content: string): Promise<Square[]>;

  // 페이지네이션
  findWithPagination(
    page: number,
    limit: number,
  ): Promise<{ squares: Square[]; total: number }>;

  // 인기순 정렬
  findPopularSquares(limit: number): Promise<Square[]>;

  // 최신순 정렬
  findRecentSquares(limit: number): Promise<Square[]>;
}
