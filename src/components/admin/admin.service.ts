import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ResetPasswordService } from '../auth/modules/reset-password/reset-password.service';
import { ResetPasswordByAdminResult } from '../auth/modules/reset-password/results';
import { UpdateUserPasswordDto } from './dto';

@Injectable()
export class AdminService {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  create(createAdminDto: CreateAdminDto) {
    return 'This action adds a new admin';
  }

  findAll() {
    return `This action returns all admin`;
  }

  findOne(id: number) {
    return `This action returns a #${id} admin`;
  }

  update(id: number, updateAdminDto: UpdateAdminDto) {
    return `This action updates a #${id} admin`;
  }

  remove(id: number) {
    return `This action removes a #${id} admin`;
  }

  async resetUserPassword(dto: UpdateUserPasswordDto): Promise<ResetPasswordByAdminResult> {
    return this.resetPasswordService.resetUserPassword(dto.email);
  }
}
