export interface IImageService {
  uploadImgCom(path: string, buffers: Buffer[]): Promise<string[]>;
  uploadSingleImage(
    path: string,
    buffer: Buffer,
    index?: number,
  ): Promise<string>;
  getToday(): string;
  saveImage(imageUrl: string): Promise<void>;
}
