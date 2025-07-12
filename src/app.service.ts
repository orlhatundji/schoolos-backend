import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'SchoolOS API is running',
      status: 'success',
    };
  }
}
