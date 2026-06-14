import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaystackSignatureVerifier {
  private readonly logger = new Logger(PaystackSignatureVerifier.name);
  private readonly secret: string;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('paystack.secretKey');
    if (!secret) {
      throw new Error('paystack.secretKey is not configured');
    }
    this.secret = secret;
  }

  verify(rawBody: Buffer, signatureHex: string): boolean {
    if (!signatureHex) return false;
    try {
      const expected = crypto
        .createHmac('sha512', this.secret)
        .update(rawBody)
        .digest();
      const provided = Buffer.from(signatureHex, 'hex');
      if (expected.length !== provided.length) return false;
      return crypto.timingSafeEqual(expected, provided);
    } catch (error) {
      this.logger.error(`Signature verification error: ${(error as Error).message}`);
      return false;
    }
  }
}
