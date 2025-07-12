import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ApiBearerAuth, ApiNotFoundResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ResetPasswordByAdminResult,
  ResetPasswordMessages,
} from '../auth/modules/reset-password/results';
import { StrategyEnum } from '../auth/strategies';
import { UpdateUserPasswordDto } from './dto';

@Controller('admin')
@ApiTags('Admin')
@ApiBearerAuth(StrategyEnum.JWT)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.update(+id, updateAdminDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminService.remove(+id);
  }

  @Post('reset-user-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ResetPasswordByAdminResult,
    description: ResetPasswordMessages.SUCCESS.PASSWORD_RESET_FOR_USER,
  })
  @ApiNotFoundResponse({
    description: ResetPasswordMessages.FAILURE.USER_NOT_FOUND,
  })
  async resetPassword(@Body() dto: UpdateUserPasswordDto) {
    return this.adminService.resetUserPassword(dto);
  }
}
