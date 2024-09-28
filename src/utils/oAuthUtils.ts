import axios, { AxiosError } from "axios";
import { JWT } from "next-auth/jwt";
import { Account } from "../db/models/account";
import { User } from "../db/models/user";
import dbConnect from "../db/conn";
import { Dayjs } from "dayjs";

export interface kakaoProfileInfo {
  name: string;

  profileImage: string;
}

export const getRefreshedAccessToken = async (uid: string) => {
  const account = await Account.findOne({ providerAccountId: uid.toString() });
  const user = await User.findOne({ uid });
  const token: JWT = {
    id: user?._id,
    uid,
    refreshToken: account?.refresh_token,
  };

  const refreshed: any = await refreshAccessToken(token);
  return refreshed["accessToken"] as string;
};

export const refreshAccessToken = async (token: JWT) => {
  try {
    const url =
      "https://kauth.kakao.com/oauth/token?" +
      new URLSearchParams({
        client_id: process.env.KAKAO_CLIENT_ID as string,
        client_secret: process.env.KAKAO_CLIENT_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      });
    const response = await axios.post(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    const refreshedTokens = response.data;

    if (response.status !== 200) {
      throw refreshedTokens;
    }

    const updateFields = Object.assign(
      {},
      refreshedTokens.access_token && {
        access_token: refreshedTokens.access_token,
      },
      refreshedTokens.refresh_token && {
        refresh_token: refreshedTokens.refresh_token,
      },
      refreshedTokens.expires_in && { expires_at: refreshedTokens.expires_in },
      refreshedTokens.refresh_token_expires_in && {
        refresh_token_expires_in: refreshedTokens.refresh_token_expires_in,
      },
    );

    await Account.updateMany(
      { providerAccountId: token.uid?.toString() },
      { $set: updateFields },
    );

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_at * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
};

export const sendResultMessage = async (
  accessToken: string,
  refreshToken: string,
  uid: string,
  date: Dayjs,
  isOpen: boolean,
  time: string,
  place: string,
) => {
  const dateKr = date.format("MM/DD");
  const resultMessage = isOpen
    ? `내일(${dateKr}) 스터디는 ${time}에 ${place}에서 열립니다`
    : `내일(${dateKr}) 스터디가 열리지 못 했어요`;

  const url = "https://kapi.kakao.com/v2/api/talk/memo/default/send?";

  const message = JSON.stringify({
    object_type: "text",
    text: resultMessage,
    link: {
      web_url: `${process.env.NEXTAUTH_URL}/result`,
      mobile_web_url: `${process.env.NEXTAUTH_URL}/result`,
    },
    button_title: "결과 확인",
  });

  try {
    await axios.post(url, `template_object=${message}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (
      (axiosError.response?.data as { msg: string; code: number }).code === -401
    ) {
      const accessToken = await getRefreshedAccessToken(uid);

      try {
        await axios.post(url, `template_object=${message}`, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error(error);
    }
  }
};

export const withdrawal = async (accessToken: string) => {
  const url = "https://kapi.kakao.com/v1/user/unlink";

  let uid: string;
  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    uid = response.data.id.toString();
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(axiosError);
    return;
  }

  if (uid) {
    await dbConnect();

    const user = await User.findOne({ uid });

    await Account.deleteMany({ providerAccountId: uid });
    await User.updateMany(
      { uid },
      {
        $set: {
          name: "(알수없음)",
          role: "stranger",
          status: "inactive",
          uid: "",
        },
      },
    );
  }
  return;
};

const getNullableProfile = async (accessToken: string) => {
  try {
    const res = await axios.get("https://kapi.kakao.com/v1/api/talk/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return {
      name: res.data.nickName as string,

      profileImage:
        (res.data.profileImageURL as string) ||
        "https://user-images.githubusercontent.com/48513798/173180642-8fc5948e-a437-45f3-91d0-3f0098a38195.png",
    } as kakaoProfileInfo;
  } catch (err) {
    return null;
  }
};

export const getProfile = async (accessToken: string, uid: string) => {
  const nullableProfile = await getNullableProfile(accessToken);
  if (nullableProfile) {
    return nullableProfile;
  }

  const refreshedAccessToken: string = await getRefreshedAccessToken(uid);
  return getNullableProfile(refreshedAccessToken);
};
