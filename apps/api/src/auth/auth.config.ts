export const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must contain at least 32 characters");
  return "local-development-jwt-secret-change-me";
};

export const otpSecret = () => {
  const secret = process.env.OTP_HMAC_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("OTP_HMAC_SECRET must contain at least 32 characters");
  return "local-development-otp-secret-change-me";
};
