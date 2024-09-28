import { JWT } from 'next-auth/jwt';
import S3 from 'aws-sdk/clients/s3';
import { findOneVote } from 'src/vote/util';
import { strToDate } from 'src/utils/dateUtils';
import { IUser } from 'src/user/entity/user.entity';

export default class ImageService {
  private token: JWT;
  private s3: S3;

  constructor(token?: JWT) {
    this.token = token as JWT;

    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_KEY,
      region: 'ap-northeast-2',
    });
  }

  async uploadImgCom(path: string, buffers: Buffer[]) {
    const imageUrls: string[] = [];

    for (let i = 0; i < buffers.length; i++) {
      const url = await this.uploadSingleImage(path, buffers[i], i);
      imageUrls.push(url);
    }

    return imageUrls;
  }

  async uploadSingleImage(path: string, buffer: Buffer, index?: number) {
    const params = {
      Bucket: 'studyabout',
      Key: `${path}/${Math.floor(Date.now() / 1000).toString()}${index ? index : ''}.jpg`,
      Body: buffer,
    };

    try {
      const data = await this.s3.upload(params).promise();
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
    const vote = await findOneVote(strToDate(this.getToday()).toDate());
    if (!vote) throw new Error();

    vote?.participations.forEach((participation) => {
      participation.attendences?.forEach((attendence) => {
        if (
          (attendence.user as IUser)?.uid.toString() ===
          this.token.uid?.toString()
        )
          attendence.imageUrl = imageUrl;
      });
    });

    await vote?.save();
    return;
  }
}
