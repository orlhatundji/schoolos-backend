import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IPasswordHasher } from './password-hasher.interface';

@Injectable()
export class PasswordHasher implements IPasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(plainPassword, salt);
  }

  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}
