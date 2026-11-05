import { Model } from 'mongoose';
import { IUser } from '../../entity/user.entity';
import { ILogTemperatureRepository } from '../interfaces/LogTemperature.interface';

/**
 * 멤버 평가에서 서로 '최고예요'(great)를 남긴 두 멤버를 자동으로 친구로 등록한다.
 * fromUid가 toUid에게 great를 막 남긴 직후 호출한다. 역방향 great가 있으면(번개·스터디·소모임 월간 무관)
 * 양쪽 friend에 서로를 추가한다. 알림은 보내지 않는다.
 *
 * UserService와 NoticeService가 서로를 주입받는 구조라 서비스 메서드 대신 함수로 둔다.
 * 실패해도 평가 저장은 깨지면 안 되므로 예외를 삼킨다.
 */
export async function linkFriendIfMutualGreat(
  logTemperatureRepository: ILogTemperatureRepository,
  UserModel: Model<IUser>,
  fromUid: string,
  toUid: string,
): Promise<boolean> {
  if (!fromUid || !toUid || fromUid === toUid) return false;
  try {
    const isMutual = await logTemperatureRepository.existsGreat(toUid, fromUid);
    if (!isMutual) return false;

    await UserModel.updateOne({ uid: fromUid }, { $addToSet: { friend: toUid } });
    await UserModel.updateOne({ uid: toUid }, { $addToSet: { friend: fromUid } });
    return true;
  } catch (err) {
    console.error('[linkFriendIfMutualGreat]', fromUid, toUid, err);
    return false;
  }
}
