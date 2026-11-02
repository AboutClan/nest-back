import {
  countFormResponses,
  getRoundKey,
  matchApplicantsToAppUsers,
  parseDateOption,
  toBirthYear,
} from './regularFormMatcher';

const NOW = new Date('2026-11-02T03:00:00Z');

describe('parseDateOption', () => {
  it('오후 시각과 요일을 푼다', () => {
    expect(parseDateOption('11월 6일(금) 오후 7시', NOW)).toEqual({
      date: '2026-11-06',
      weekday: 5,
      time: '19:00',
    });
  });

  it('뒤에 장소가 붙어도 푼다', () => {
    expect(
      parseDateOption('11월 13일(금) 오후 5시 / 하늘공원 노을 출사', NOW),
    ).toEqual({
      date: '2026-11-13',
      weekday: 5,
      time: '17:00',
    });
  });

  it('날짜가 없으면 null', () => {
    expect(parseDateOption('D＇FESTA THE ORIGIN', NOW)).toBeNull();
    expect(parseDateOption('옵션 1', NOW)).toBeNull();
  });

  it('12월에 받은 1월 일정은 내년', () => {
    expect(
      parseDateOption('1월 3일(일) 오후 1시', new Date('2026-12-20T00:00:00Z'))
        ?.date,
    ).toBe('2027-01-03');
  });
});

describe('countFormResponses', () => {
  it('매주 일정은 요일+시간으로, 콘텐츠는 제목으로 센다 (5255형)', () => {
    const slots = [
      { key: 'fri', weekday: 5, time: '19:00' },
      { key: 'sat', weekday: 6, time: '16:00' },
      { key: 'sun', weekday: 0, time: '16:00' },
    ];
    const contents = [
      { key: 'dfesta', title: "D'FESTA THE ORIGIN" },
      { key: 'spain', title: '스페인 미술 500년: 빛과 어둠의 연대기' },
      { key: 'killingstory', title: '죽여주는 이야기' },
    ];
    const res = countFormResponses(
      [
        [
          '11월 6일(금) 오후 7시',
          '11월 13일(금) 오후 7시',
          'D＇FESTA THE ORIGIN',
        ],
        [
          '11월 7일(토) 오후 4시',
          '죽여주는 이야기 🎟️ 제휴 할인 가능',
          '스페인 미술 500년: 빛과 어둠의 연대기',
        ],
      ],
      slots,
      contents,
      NOW,
    );
    // 11/6과 11/13은 둘 다 매주 금요일 일정이라 한 번만 센다
    expect(res).toMatchObject({
      roundKey: '2026-11-02',
      total: 2,
      byOption: { fri: 1, dfesta: 1, sat: 1, killingstory: 1, spain: 1 },
    });
  });

  it('콘텐츠 전용 날짜 일정을 고르면 콘텐츠도 센다 (5256형)', () => {
    const slots = [
      {
        key: 'park-1107',
        date: '2026-11-07',
        time: '16:00',
        contentKey: 'park',
      },
      {
        key: 'park-1108',
        date: '2026-11-08',
        time: '16:00',
        contentKey: 'park',
      },
      { key: 'sky-1113', date: '2026-11-13', time: '17:00', contentKey: 'sky' },
    ];
    const contents = [
      { key: 'park', title: '서울대공원 가을축제 🍁' },
      { key: 'sky', title: '하늘공원 노을 출사 🌅' },
    ];
    const res = countFormResponses(
      [
        [
          '11월 7일(토) 오후 4시 / 피노키오의 숲',
          '11월 8일(일) 오후 4시 / 피노키오의 숲',
        ],
        ['옵션 1', '11월 13일(금) 오후 5시 / 하늘공원 노을 출사'],
      ],
      slots,
      contents,
      NOW,
    );
    // 다음 주 날짜도 아직 지나지 않았으면 센다
    expect(res).toMatchObject({
      roundKey: '2026-11-02',
      total: 2,
      byOption: {
        'park-1107': 1,
        'park-1108': 1,
        park: 1,
        'sky-1113': 1,
        sky: 1,
      },
    });
  });

  it('고른 날짜가 모두 지났으면 뺀다', () => {
    const slots = [{ key: 'fri', weekday: 5, time: '19:00' }];
    // 2026-11-09(월) 12:00 KST
    const res = countFormResponses(
      [
        ['11월 6일(금) 오후 7시'],
        ['11월 6일(금) 오후 7시', '11월 13일(금) 오후 7시'],
      ],
      slots,
      [],
      new Date('2026-11-09T03:00:00Z'),
    );
    expect(res).toMatchObject({ total: 1, byOption: { fri: 1 } });
  });
});

describe('getRoundKey', () => {
  it('KST 기준 그 주 월요일', () => {
    // 2026-11-08(일) 23:30 KST
    expect(getRoundKey(new Date('2026-11-08T14:30:00Z'))).toBe('2026-11-02');
    // 2026-11-09(월) 00:10 KST
    expect(getRoundKey(new Date('2026-11-08T15:10:00Z'))).toBe('2026-11-09');
  });
});

describe('신청자 목록', () => {
  it('성별·출생연도·선택 key·제출 시각을 남긴다', () => {
    const slots = [{ key: 'fri', weekday: 5, time: '19:00' }];
    const res = countFormResponses(
      [
        {
          selected: ['11월 6일(금) 오후 7시'],
          gender: '여성',
          birthYear: '2001',
          submittedAt: '2026-11-02T10:00:00Z',
        },
        {
          selected: ['11월 13일(금) 오후 7시'],
          gender: '남성',
          birthYear: '99',
        },
      ],
      slots,
      [],
      NOW,
    );
    expect(res.total).toBe(2);
    expect(res.applicants).toEqual([
      {
        gender: '여성',
        birthYear: 2001,
        keys: ['fri'],
        submittedAt: new Date('2026-11-02T10:00:00Z'),
        uid: null,
      },
      {
        gender: '남성',
        birthYear: 1999,
        keys: ['fri'],
        submittedAt: null,
        uid: null,
      },
    ]);
  });

  it('출생연도 입력 형식', () => {
    expect(toBirthYear('2001년생', NOW)).toBe(2001);
    expect(toBirthYear('99', NOW)).toBe(1999);
    expect(toBirthYear('03', NOW)).toBe(2003);
    expect(toBirthYear('모름', NOW)).toBeNull();
  });
});

describe('회원 ID', () => {
  it('같은 회원의 응답은 마지막 것만 남기고 uid를 남긴다', () => {
    const slots = [
      { key: 'fri', weekday: 5, time: '19:00' },
      { key: 'sat', weekday: 6, time: '13:00' },
    ];
    const res = countFormResponses(
      [
        {
          selected: ['11월 6일(금) 오후 7시'],
          uid: '1234',
          submittedAt: '2026-11-02T01:00:00Z',
        },
        {
          selected: ['11월 7일(토) 오후 1시'],
          uid: '1234',
          submittedAt: '2026-11-02T02:00:00Z',
        },
        { selected: ['11월 6일(금) 오후 7시'], uid: '' },
        { selected: ['11월 6일(금) 오후 7시'], uid: 'x y<script>' },
      ],
      slots,
      [],
      NOW,
    );
    expect(res.total).toBe(3);
    expect(res.byOption).toEqual({ sat: 1, fri: 2 });
    expect(res.applicants.map((a) => a.uid)).toEqual(['1234', null, null]);
  });
});

describe('앱 신청 회원과 폼 응답 짝짓기', () => {
  const at = (t: string) => new Date(`2026-11-02T${t}:00Z`);
  const app = (
    key: string,
    t: string,
    gender: '남성' | '여성',
    birthYear: number,
  ) => ({
    key,
    appliedAt: at(t),
    gender,
    birthYear,
  });
  const res = (t: string, gender: '남성' | '여성', birthYear: number) => ({
    submittedAt: at(t),
    gender,
    birthYear,
  });

  it('30분 안, 성별·출생연도가 같으면 잇는다', () => {
    const map = matchApplicantsToAppUsers(
      [
        res('10:05', '여성', 2001),
        res('10:06', '남성', 2001),
        res('11:00', '여성', 2001),
      ],
      [app('A', '10:00', '여성', 2001)],
    );
    expect([...map]).toEqual([[0, 'A']]);
  });

  it('같은 회원이 여러 번 내면 마지막 응답에 잇는다', () => {
    const map = matchApplicantsToAppUsers(
      [res('10:05', '여성', 2001), res('10:20', '여성', 2001)],
      [app('A', '10:00', '여성', 2001)],
    );
    expect([...map]).toEqual([[1, 'A']]);
  });

  it('같은 시간대에 성별·출생연도가 같은 회원이 둘이면 잇지 않는다', () => {
    const map = matchApplicantsToAppUsers(
      [res('10:05', '여성', 2001)],
      [app('A', '10:00', '여성', 2001), app('B', '10:02', '여성', 2001)],
    );
    expect(map.size).toBe(0);
  });
});

describe('이름·연락처', () => {
  it('신청자 목록에는 넣지 않고 contacts로만 돌려준다', () => {
    const res = countFormResponses(
      [
        {
          selected: ['11월 6일(금) 오후 7시'],
          name: '홍 길동',
          phone: '010-1234-5678',
        },
      ],
      [{ key: 'fri', weekday: 5, time: '19:00' }],
      [],
      NOW,
    );
    expect(res.contacts).toEqual([{ name: '홍길동', phone: '01012345678' }]);
    expect(JSON.stringify(res.applicants)).not.toMatch(/홍|5678/);
  });
});
