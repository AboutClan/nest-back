import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { JWT } from 'next-auth/jwt';
import { RequestContext } from 'src/request-context';
import { now } from 'src/vote/util';

@Injectable()
export class BookService {
  private token: JWT;
  constructor() {
    this.token = RequestContext.getDecodedToken();
  }

  async getBookList() {
    const startDt = now().subtract(1, 'month').format('YYYY-MM');
    const endDt = now().format('YYYY-MM');
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    const response = await axios.get(
      `https://data4library.kr/api/loanItemSrch?authKey=0a18d855cdbe794e1225816ee8f65f7e71c94ffcb19cba97e9c90e1199e078ff&startDt=${startDt}&endDt=${endDt}&gender=1&age=20&format=json`,
    );

    if (response.status !== 200) throw new Error('Fail fetching book data');

    return response.data;
  }
}
