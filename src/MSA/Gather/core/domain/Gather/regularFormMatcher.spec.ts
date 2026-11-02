import {
  countFormResponses,
  getRoundKey,
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
    // 11/13(다음 주)은 세지 않는다
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
    // 두 번째 응답은 다음 주 날짜만 골라 이번 주 집계에서 빠진다
    expect(res).toMatchObject({
      roundKey: '2026-11-02',
      total: 1,
      byOption: { 'park-1107': 1, 'park-1108': 1, park: 1 },
    });
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
  it('성별·출생연도·선택 key·제출 시각을 남기고 이번 주 밖 응답은 뺀다', () => {
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
    expect(res.total).toBe(1);
    expect(res.applicants).toEqual([
      {
        gender: '여성',
        birthYear: 2001,
        keys: ['fri'],
        submittedAt: new Date('2026-11-02T10:00:00Z'),
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
