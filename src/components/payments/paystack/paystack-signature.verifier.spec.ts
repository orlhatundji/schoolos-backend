import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { PaystackSignatureVerifier } from './paystack-signature.verifier';

const TEST_SECRET = 'sk_test_secret_for_unit_tests';

function makeConfig(secret: string | undefined): ConfigService {
  return {
    get: (key: string) => (key === 'paystack.secretKey' ? secret : undefined),
  } as unknown as ConfigService;
}

function sign(body: Buffer | string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(body).digest('hex');
}

describe('PaystackSignatureVerifier', () => {
  it('throws at construction if secret is missing', () => {
    expect(() => new PaystackSignatureVerifier(makeConfig(undefined))).toThrow();
  });

  it('accepts a valid signature on the raw body', () => {
    const verifier = new PaystackSignatureVerifier(makeConfig(TEST_SECRET));
    const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { id: 1 } }));
    const signature = sign(body, TEST_SECRET);
    expect(verifier.verify(body, signature)).toBe(true);
  });

  it('rejects when body is tampered after signing', () => {
    const verifier = new PaystackSignatureVerifier(makeConfig(TEST_SECRET));
    const original = Buffer.from('{"event":"charge.success","data":{"amount":100}}');
    const signature = sign(original, TEST_SECRET);
    const tampered = Buffer.from('{"event":"charge.success","data":{"amount":999999}}');
    expect(verifier.verify(tampered, signature)).toBe(false);
  });

  it('rejects when secret differs', () => {
    const verifier = new PaystackSignatureVerifier(makeConfig(TEST_SECRET));
    const body = Buffer.from('hello');
    const wrongSignature = sign(body, 'different_secret');
    expect(verifier.verify(body, wrongSignature)).toBe(false);
  });

  it('rejects an empty signature', () => {
    const verifier = new PaystackSignatureVerifier(makeConfig(TEST_SECRET));
    expect(verifier.verify(Buffer.from('body'), '')).toBe(false);
  });

  it('rejects a malformed (non-hex) signature without throwing', () => {
    const verifier = new PaystackSignatureVerifier(makeConfig(TEST_SECRET));
    expect(verifier.verify(Buffer.from('body'), 'not-hex')).toBe(false);
  });
});
