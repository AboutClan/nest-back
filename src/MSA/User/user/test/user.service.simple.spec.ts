import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';

// 🧪 Jest 테스트 예시 - 간단한 버전
describe('Jest 테스트 학습용 예시', () => {
  // 🔄 각 테스트 전에 실행되는 설정
  beforeEach(() => {
    console.log('🔧 테스트 설정 중...');
  });

  // 🧹 각 테스트 후 실행되는 정리
  afterEach(() => {
    console.log('🧹 테스트 정리 중...');
  });

  // 📋 테스트 그룹 1: 기본 Jest 문법
  describe('기본 Jest 문법 학습', () => {
    // ✅ 테스트 케이스 1: 기본적인 값 검증
    it('기본적인 값 검증을 할 수 있어야 한다', () => {
      // Arrange (준비)
      const expectedValue = 42;
      const actualValue = 40 + 2;

      // Act (실행) - 이 경우는 이미 계산됨

      // Assert (검증)
      expect(actualValue).toBe(expectedValue);
      expect(actualValue).toEqual(expectedValue);
      expect(actualValue).toBeDefined();
      expect(actualValue).not.toBeNull();
    });

    // ✅ 테스트 케이스 2: 문자열 검증
    it('문자열을 올바르게 검증할 수 있어야 한다', () => {
      // Arrange
      const name = '홍길동';
      const greeting = `안녕하세요, ${name}님!`;

      // Assert
      expect(greeting).toContain(name);
      expect(greeting).toMatch(/홍길동/);
      expect(greeting.length).toBeGreaterThan(0);
      expect(typeof greeting).toBe('string');
    });

    // ✅ 테스트 케이스 3: 배열 검증
    it('배열을 올바르게 검증할 수 있어야 한다', () => {
      // Arrange
      const fruits = ['사과', '바나나', '오렌지'];

      // Assert
      expect(fruits).toHaveLength(3);
      expect(fruits).toContain('사과');
      expect(fruits[0]).toBe('사과');
      expect(Array.isArray(fruits)).toBe(true);
    });

    // ✅ 테스트 케이스 4: 객체 검증
    it('객체를 올바르게 검증할 수 있어야 한다', () => {
      // Arrange
      const user = {
        id: 1,
        name: '김철수',
        age: 25,
        isActive: true,
      };

      // Assert

      expect(user).toHaveProperty('name');
      expect(user.name).toBe('김철수');
      expect(user.age).toBeGreaterThan(20);
      expect(user.isActive).toBeTruthy();
    });
  });

  // 📋 테스트 그룹 2: 비동기 테스트
  describe('비동기 테스트 학습', () => {
    // ✅ 테스트 케이스 5: Promise 성공 테스트
    it('Promise가 성공적으로 resolve되어야 한다', async () => {
      // Arrange
      const asyncFunction = () => Promise.resolve('성공!');

      // Act
      const result = await asyncFunction();

      // Assert
      expect(result).toBe('성공!');
    });

    // ✅ 테스트 케이스 6: Promise 실패 테스트
    it('Promise가 에러와 함께 reject되어야 한다', async () => {
      // Arrange
      const asyncFunction = () => Promise.reject(new Error('테스트 에러'));

      // Act & Assert
      await expect(asyncFunction()).rejects.toThrow('테스트 에러');
    });

    // ✅ 테스트 케이스 7: setTimeout 테스트
    it('setTimeout을 사용한 비동기 작업을 테스트할 수 있어야 한다', (done) => {
      // Arrange
      const delay = 100;

      // Act
      setTimeout(() => {
        // Assert
        expect(true).toBe(true);
        done(); // 비동기 테스트 완료 신호
      }, delay);
    });
  });

  // 📋 테스트 그룹 3: Mock 함수 학습
  describe('Mock 함수 학습', () => {
    // ✅ 테스트 케이스 8: Mock 함수 기본 사용법
    it('Mock 함수를 생성하고 사용할 수 있어야 한다', () => {
      // Arrange
      const mockFn = jest.fn();
      mockFn.mockReturnValue('Mock 결과');

      // Act
      const result = mockFn();

      // Assert
      expect(result).toBe('Mock 결과');
      expect(mockFn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // ✅ 테스트 케이스 9: Mock 함수 매개변수 검증
    it('Mock 함수의 매개변수를 검증할 수 있어야 한다', () => {
      // Arrange
      const mockFn = jest.fn();
      const testParam = '테스트 매개변수';

      // Act
      mockFn(testParam);

      // Assert
      expect(mockFn).toHaveBeenCalledWith(testParam);
      expect(mockFn).toHaveBeenCalledWith(expect.stringContaining('테스트'));
    });

    // ✅ 테스트 케이스 10: Mock 함수 구현
    it('Mock 함수에 구현을 추가할 수 있어야 한다', () => {
      // Arrange
      const mockFn = jest.fn((a: number, b: number) => a + b);

      // Act
      const result = mockFn(5, 3);

      // Assert
      expect(result).toBe(8);
      expect(mockFn).toHaveBeenCalledWith(5, 3);
    });
  });

  // 📋 테스트 그룹 4: 테스트 생명주기
  describe('테스트 생명주기 학습', () => {
    // 🔄 모든 테스트 전에 한 번만 실행
    beforeAll(() => {
      console.log('🚀 테스트 스위트 시작!');
    });

    // 🧹 모든 테스트 후에 한 번만 실행
    afterAll(() => {
      console.log('🏁 테스트 스위트 완료!');
    });

    // ✅ 테스트 케이스 11: 생명주기 확인
    it('테스트 생명주기가 올바르게 작동해야 한다', () => {
      expect(true).toBe(true);
    });
  });

  // 📋 테스트 그룹 5: 조건부 테스트
  describe('조건부 테스트 학습', () => {
    // ✅ 테스트 케이스 12: 환경에 따른 조건부 테스트
    it('개발 환경에서만 실행되어야 한다', () => {
      // Node.js 환경 확인
      expect(typeof process).toBe('object');
      expect(process.env.NODE_ENV).toBeDefined();
    });

    // ✅ 테스트 케이스 13: 특정 조건에서만 실행
    it('특정 조건에서만 실행되어야 한다', () => {
      const shouldRun = process.env.NODE_ENV === 'test';

      if (shouldRun) {
        expect(true).toBe(true);
      } else {
        // 이 테스트는 건너뜀
        console.log('이 테스트는 건너뜁니다.');
      }
    });
  });

  // 📋 테스트 그룹 6: 에러 처리 테스트
  describe('에러 처리 테스트 학습', () => {
    // ✅ 테스트 케이스 14: 에러 발생 확인
    it('함수가 에러를 던져야 한다', () => {
      // Arrange
      const errorFunction = () => {
        throw new Error('의도된 에러');
      };

      // Act & Assert
      expect(errorFunction).toThrow();
      expect(errorFunction).toThrow('의도된 에러');
      expect(errorFunction).toThrow(Error);
    });

    // ✅ 테스트 케이스 15: 에러 메시지 검증
    it('에러 메시지를 정확히 검증할 수 있어야 한다', () => {
      // Arrange
      const errorMessage = '사용자를 찾을 수 없습니다';

      // Act
      const error = new Error(errorMessage);

      // Assert
      expect(error.message).toBe(errorMessage);
      expect(error.message).toContain('사용자');
    });
  });
});
