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

import { JWT as NextAuthJWT } from 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT extends NextAuthJWT {
    uid: string; // `uid` 필드를 추가합니다. 필요에 따라 `string` 외의 다른 타입으로 변경할 수 있습니다.
    id: string;
  }
}
