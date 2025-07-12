export interface IOtpGenerator {
  generate(): { otp: string; expires: Date };
}
