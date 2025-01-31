import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { IIMAGE_SERVICE, IUSER_REPOSITORY } from 'src/utils/di.tokens';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { REQUEST } from '@nestjs/core';

const mockUser = { uid: '1234', userId: 'testUser', telephone: 'encryptedTel' };

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
    };

    requestMock = {
      decodedToken: { userId: 'testUser' }, // ✅ Request 객체의 `decodedToken`을 Mock 처리
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
          provide: getModelToken('Place'),
          useValue: Model,
        },
        {
          provide: getModelToken('Promotion'),
          useValue: Model,
        },
        {
          provide: getModelToken('Log'),
          useValue: Model,
        },
        {
          provide: getModelToken('Notice'),
          useValue: Model,
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

    service = module.get<UserService>(UserService);
  });

  it('shold be defined', () => {
    expect(service).toBeDefined();
  });

  it('shold be defined', () => {
    expect(service).toBeDefined();
  });
});
