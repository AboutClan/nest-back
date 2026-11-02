/**
 * 다른 회원에게 보여줄 이름. 닉네임이 있으면 닉네임, 없으면 실명을 가운데만 가린다(김철수 → 김*수).
 * 실명 그대로 폴백하지 않는다. 프론트 about-web/utils/stringUtils.ts getDisplayName과 같은 규칙.
 */
export const getDisplayName = (
  user: { nickname?: string | null; name?: string | null } | null | undefined,
) => {
  if (user?.nickname) return user.nickname;
  const name = user?.name;
  if (!name) return '익명';
  if (name.length <= 1) return name;
  return name.slice(0, 1) + '*' + name.slice(2);
};
