import OtpForm from "./otp-form"; // Import the client component
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "../utils/token";
import { AuthTokenPayload } from "../utils/token";
export default async function VerifyPage() {
  const cookiesStore = await cookies();
  const deviceVerificationToken = cookiesStore.get("deviceVerificationToken");
  if (!deviceVerificationToken) {
    return redirect("/login?reason=2fa-required");
  }
  const verifyRes = verifyToken(
    deviceVerificationToken.value,
    "DEVICE_VERIFICATION",
  );
  if (!verifyRes?.decoded) {
    return redirect("/login?reason=2fa-required");
  }
  const decoded = verifyRes.decoded as AuthTokenPayload;
  if (!decoded || decoded.email == null) {
    return redirect("/login?reason=2fa-required");
  }

  const userEmail = decoded?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <OtpForm email={userEmail} />
    </div>
  );
}
