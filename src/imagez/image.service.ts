import { JWT } from 'next-auth/jwt';
import { S3Client } from '@aws-sdk/client-s3';
import { findOneVote } from 'src/vote/util';
import { strToDate } from 'src/utils/dateUtils';
import { IUser } from 'src/user/user.entity';
import { Upload } from '@aws-sdk/lib-storage';
import { RequestContext } from 'src/request-context';

export default class ImageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_KEY,
      },
      region: 'ap-northeast-2',
    });
  }

  async uploadImgCom(path: string, buffers: Buffer[]) {
    const imageUrls: string[] = [];

    if (buffers) {
      for (let i = 0; i < buffers.length; i++) {
        const url = await this.uploadSingleImage(path, buffers[i], i);
        imageUrls.push(url);
      }
    }

    return imageUrls;
  }

  async uploadSingleImage(path: string, buffer: Buffer, index?: number) {
    try {
      // const data = await this.s3.upload(params).promise();
      const upload = new Upload({
        client: this.s3, // S3 클라이언트를 설정합니다.
        params: {
          Bucket: 'studyabout',
          Key: `${path}/${Math.floor(Date.now() / 1000).toString()}${index ? index : ''}.jpg`,
          Body: buffer,
        },
      });
      const data = await upload.done();

      return data.Location;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (1 + date.getMonth())).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);

    return year + month + day;
  }

  async saveImage(imageUrl: string) {
    const token = RequestContext.getDecodedToken();

    const vote = await findOneVote(strToDate(this.getToday()).toDate());
    if (!vote) throw new Error();

    vote?.participations.forEach((participation) => {
      participation.attendences?.forEach((attendence) => {
        if (
          (attendence.user as IUser)?.uid.toString() === token.uid?.toString()
        )
          attendence.imageUrl = imageUrl;
      });
    });

    await vote?.save();
    return;
  }
}
