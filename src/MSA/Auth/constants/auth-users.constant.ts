/** NextAuth [...nextauth].ts 와 동일한 게스트/테스트 계정 */
export const DEFAULT_PROFILE_IMAGE =
    'http://img1.kakaocdn.net/thumb/R110x110.q70/?fname=http://t1.kakaocdn.net/account_images/default_profile.jpeg';

export const DEFAULT_LOCATION = '수원' as const;

export const GUEST_USER = {
    id: '66f29811e0f0564ae35c52a5',
    uid: '1234567890',
    name: 'guest',
    role: 'guest',
    isActive: false,
    profileImage: '',
    location: DEFAULT_LOCATION,
};

export const TEST_USER = {
    id: '6938e715ec55cba47b90954d',
    uid: '1234567898',
    name: '테스트',
    role: 'member',
    isActive: true,
    profileImage: DEFAULT_PROFILE_IMAGE,
    location: DEFAULT_LOCATION,
};

export const MEMBER_GUEST_USER = {
    ...GUEST_USER,
    name: '게스트',
    role: 'guest',
    isActive: true,
    profileImage: DEFAULT_PROFILE_IMAGE,
};

export const BLOCKED_UIDS = new Set(['1234567890']);

export const SESSION_MAX_AGE_SEC = 720 * 60 * 60;
export const SESSION_UPDATE_AGE_SEC = 72 * 60 * 60;
