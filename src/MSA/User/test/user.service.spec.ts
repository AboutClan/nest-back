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
import { UserService } from '../user.service';
import { DB_SCHEMA } from 'src/Constants/DB_SCHEMA';

// 🧪 테스트용 Mock 데이터 정의
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

// 🧪 UserService 테스트 스위트
describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let requestMock: any;

  // 🔄 각 테스트 전에 실행되는 설정
  beforeEach(async () => {
    // 📚 Mock Repository 생성
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

    // 🌐 Request Mock 객체 생성
    requestMock = {
      decodedToken: { userId: 'testUser', uid: '2283035576' },
    };

    // 🏗️ Testing Module 생성
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
          useValue: {},
        },
        {
          provide: REQUEST,
          useValue: requestMock,
        },
      ],
    }).compile();

    service = await module.resolve<UserService>(UserService);
  });

  // 🧹 각 테스트 후 실행되는 정리
  afterEach(() => {
    jest.clearAllMocks(); // 모든 Mock 호출 기록 초기화
  });

  // 📋 테스트 그룹: 사용자 조회 기능
  describe('사용자 조회 기능', () => {
    // ✅ 테스트 케이스 1: UID로 사용자 조회 성공
    it('UID로 사용자를 성공적으로 조회해야 한다', async () => {
      // Arrange (준비)
      const testUid = '1234';
      const expectedUser = { ...mockUser };

      // Act (실행)
      const result = await service.getUserWithUid(testUid);

      // Assert (검증)
      expect(result).toBeDefined();
      expect(result.uid).toBe(expectedUser.uid);
      expect(result.name).toBe(expectedUser.name);
      expect(userRepository.findByUid).toHaveBeenCalledWith(testUid);
      expect(userRepository.findByUid).toHaveBeenCalledTimes(1);
    });

    // ❌ 테스트 케이스 2: 존재하지 않는 UID로 조회 실패
    it('존재하지 않는 UID로 조회하면 null을 반환해야 한다', async () => {
      // Arrange
      const nonExistentUid = '9999';

      // Act
      const result = await service.getUserWithUid(nonExistentUid);

      // Assert
      expect(result).toBeNull();
      expect(userRepository.findByUid).toHaveBeenCalledWith(nonExistentUid);
    });

    // ✅ 테스트 케이스 3: 사용자 ID로 사용자 조회 성공
    it('사용자 ID로 사용자를 성공적으로 조회해야 한다', async () => {
      // Arrange
      const testUserId = 'testUser';

      // Act
      const result = await service.getUserWithUserId(testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.uid).toBe(mockUser.uid);
      expect(userRepository.findByUserId).toHaveBeenCalledWith(testUserId);
    });

    // ✅ 테스트 케이스 4: 여러 UID로 사용자들 조회 성공
    it('여러 UID로 사용자들을 성공적으로 조회해야 한다', async () => {
      // Arrange
      const testUids = ['1234', '5678', '9012'];
      const expectedCount = testUids.length;

      // Act
      const results = await service.getUsersWithUids(testUids);

      // Assert
      expect(results).toHaveLength(expectedCount);
      expect(userRepository.findByUids).toHaveBeenCalledWith(testUids);

      // 각 결과가 올바른 UID를 가지고 있는지 확인
      results.forEach((result, index) => {
        expect(result.uid).toBe(testUids[index]);
      });
    });
  });

  // 📋 테스트 그룹: 배지 관련 기능
  describe('배지 관련 기능', () => {
    // ✅ 테스트 케이스 5: 배지 선택 성공
    it('유효한 배지 인덱스로 배지를 선택할 수 있어야 한다', async () => {
      // Arrange
      const validBadgeIdx = 1;

      // Act
      const result = await service.selectBadge(validBadgeIdx);

      // Assert
      expect(result).toBe(null); // Mock에서 null을 반환하도록 설정됨
      expect(userRepository.selectbadge).toHaveBeenCalledWith(validBadgeIdx);
    });

    // ❌ 테스트 케이스 6: 유효하지 않은 배지 인덱스로 배지 선택 실패
    it('유효하지 않은 배지 인덱스로 배지 선택 시 에러를 던져야 한다', async () => {
      // Arrange
      const invalidBadgeIdx = 2;

      // Act & Assert
      await expect(service.selectBadge(invalidBadgeIdx)).rejects.toThrow(
        'no badge',
      );
    });
  });

  // 📋 테스트 그룹: 유틸리티 메서드
  describe('유틸리티 메서드', () => {
    // ✅ 테스트 케이스 7: 쿼리 문자열 생성
    it('문자열 배열로부터 올바른 쿼리 문자열을 생성해야 한다', () => {
      // Arrange
      const testArray = ['name', 'email', 'age'];
      const expectedResult = ' name email age';

      // Act
      const result = service.createQueryString(testArray);

      // Assert
      expect(result).toBe(expectedResult);
    });

    // ✅ 테스트 케이스 8: 빈 배열로 쿼리 문자열 생성
    it('빈 배열로 쿼리 문자열을 생성하면 빈 문자열을 반환해야 한다', () => {
      // Arrange
      const testArray: string[] = [];
      const expectedResult = '';

      // Act
      const result = service.createQueryString(testArray);

      // Assert
      expect(result).toBe(expectedResult);
    });
  });

  // 📋 테스트 그룹: Mock 동작 검증
  describe('Mock 동작 검증', () => {
    // ✅ 테스트 케이스 9: Mock 함수 호출 검증
    it('Mock 함수들이 올바르게 호출되어야 한다', async () => {
      // Arrange
      const testUid = '1234';

      // Act
      await service.getUserWithUid(testUid);

      // Assert
      expect(userRepository.findByUid).toHaveBeenCalled();
      expect(userRepository.findByUid).toHaveBeenCalledWith(testUid);
      expect(userRepository.findByUid).toHaveBeenCalledTimes(1);
    });

    // ✅ 테스트 케이스 10: Mock 함수 호출되지 않음 검증
    it('사용하지 않은 Mock 함수는 호출되지 않아야 한다', () => {
      // Act
      service.createQueryString(['test']);

      // Assert
      expect(userRepository.findByUid).not.toHaveBeenCalled();
      expect(userRepository.findByUserId).not.toHaveBeenCalled();
    });
  });
});
