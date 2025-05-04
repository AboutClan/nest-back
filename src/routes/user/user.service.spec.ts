import { REQUEST } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import {
  IIMAGE_SERVICE,
  INOTICE_SERVICE,
  IPLACE_SERVICE,
  IUSER_REPOSITORY,
} from 'src/utils/di.tokens';
import { UserService } from './user.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

const mockUser = {
  _id: {
    $oid: '66766dfb23da9f3ed67534a0',
  },
  uid: '2283035576',
  name: '채민관',
  role: 'previliged',
  profileImage:
    'http://k.kakaocdn.net/dn/iCiHH/btsKTajJp3n/nGlGkESNb57UGk0ZBb84G1/img_110x110.jpg',
  isActive: true,
  email: '2283035576',
  emailVerified: null,
  birth: '000503',
  comment: '안녕하세요!',
  deposit: 4900,
  gender: '남성',
  interests: {
    first: '코딩',
    second: '독서',
    createdAt: {
      $date: '2024-07-05T13:15:30.114Z',
    },
    updatedAt: {
      $date: '2024-07-05T13:15:30.114Z',
    },
  },
  location: '동대문',
  majors: [
    {
      department: '공학계열',
      detail: '컴퓨터/통신',
      createdAt: {
        $date: '2024-07-05T13:15:30.114Z',
      },
      updatedAt: {
        $date: '2024-07-05T13:15:30.114Z',
      },
    },
  ],
  mbti: 'INFP',
  registerDate: 'Sat Jun 22 2024 15:24:42 GMT+0900 (대한민국 표준시)',
  telephone: 'U2FsdGVkX19Yixzf83+ZZi79c1OKNKl9c9iXQ5HwO3M=',
  monthScore: 0,
  __v: 1,
  friend: [],
  like: 1,
  point: 1074,
  score: 41,
  instagram: '',
  isPrivate: false,
  studyPreference: {
    subPlace: [],
    place: {
      $oid: '661cd8d3aaae875d410236d0',
    },
  },
  locationDetail: {
    text: '회기역 1호선',
    lat: 37.5897962196601,
    lon: 127.058048369273,
  },
  weekStudyTragetHour: 0,
  weekStudyAccumulationMinutes: 0,
  weekStudyTargetHour: 3,
  avatar: {
    type: 1,
    bg: 1,
  },
  ticket: {
    gatherTicket: 2,
    groupStudyTicke: 4,
  },
  badge: {
    badgeIdx: 1,
    badgeList: [1],
  },
};

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let requestMock: any;

  beforeEach(async () => {
    userRepository = {
      findByUid: jest.fn((uid) => (uid === '1234' ? { ...mockUser } : null)),
      findByUserId: jest.fn((userId) =>
        userId === 'testUser' ? { ...mockUser } : null,
      ),
      findByUids: jest.fn((uids) => uids.map((uid) => ({ ...mockUser, uid }))),
      getBadgeList: jest.fn((uid: string) =>
        uid === mockUser.uid ? mockUser.badge.badgeList : null,
      ),
      selectbadge: jest.fn().mockResolvedValue(null),
    };

    requestMock = {
      decodedToken: { userId: 'testUser', uid: '2283035576' }, // ✅ Request 객체의 `decodedToken`을 Mock 처리
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: IUSER_REPOSITORY,
          useValue: userRepository,
        },
        {
          provide: getModelToken('Vote'),
          useValue: Model,
        },
        {
          provide: getModelToken(DB_SCHEMA.LOG),
          useValue: Model,
        },
        {
          provide: IPLACE_SERVICE,
          useValue: {},
        },
        {
          provide: INOTICE_SERVICE,
          useValue: {},
        },
        {
          provide: IIMAGE_SERVICE,
          useValue: {}, // ✅ 필요하면 Mock 메서드 추가 가능
        },
        {
          provide: REQUEST,
          useValue: requestMock,
        },
      ],
    }).compile();

    service = await module.resolve<UserService>(UserService);
  });

  it('badgeList should include badgeIdx', async () => {
    await expect(service.selectBadge(1)).resolves.toBe(null);
    await expect(service.selectBadge(2)).rejects.toThrow('no badge');
  });
});
