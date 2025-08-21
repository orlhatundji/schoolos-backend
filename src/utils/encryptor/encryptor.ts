import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { IEncryptor } from './encryptor.interface';

@Injectable()
export class Encryptor implements IEncryptor {
  private readonly _algorithm = 'aes-256-cbc';
  private readonly _key: Buffer;

  constructor() {
    if (!process.env.ENCRYPTOR_SECRET_KEY || process.env.ENCRYPTOR_SECRET_KEY.length !== 64) {
      throw new Error('ENCRYPTOR_SECRET_KEY must be a 64-character hex string.');
    }
    this._key = Buffer.from(process.env.ENCRYPTOR_SECRET_KEY, 'hex');
  }

  private readonly _iv = crypto.randomBytes(16);

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this._algorithm, this._key, this._iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${this._iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedTextBuffer = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(this._algorithm, this._key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedTextBuffer),
      decipher.final(),
    ]);
    return decrypted.toString();
  }
}
