export interface tokenRequest extends Request {
  token: JWT | null;
}

declare global {
  namespace Express {
    export interface Request {
      decodedToken: any;
      token?: JWT;
      date?: Date;
      files?: Multer.File[];
      file?: Multer.File;
    }
  }
}
