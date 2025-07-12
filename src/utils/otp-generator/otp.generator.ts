import { Injectable } from '@nestjs/common';

import { IOtpGenerator } from './otp-generator.interface';

@Injectable()
export class OtpGenerator implements IOtpGenerator {
  generate(): { otp: string; expires: Date } {
    let otp = '';
    const OTP_LENGTH = 30;
    const OTP_EXPIRY_IN_SECONDS = 3600;
    const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < OTP_LENGTH; i++) {
      const index = Math.floor(Math.random() * CHARSET.length);
      otp += CHARSET[index];
    }

    const expires = new Date(Date.now() + OTP_EXPIRY_IN_SECONDS * 1000);

    return { otp, expires };
  }
}
