import User from "../models/User";
export async function recordSuccessfulLogin(
  userId: string,
  deviceId: string,
  fingerprint: string,
  ip: string,
  userAgent?: string
) {
  await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        lastLogin: {
          deviceId,
          fingerprint,
          ip,
          userAgent,
          timestamp: new Date(),
        },
      },
    },
    { new: true, upsert: true }
  );
}
