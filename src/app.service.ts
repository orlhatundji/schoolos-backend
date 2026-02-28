import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Schos API is running',
      status: 'success',
    };
  }
}
