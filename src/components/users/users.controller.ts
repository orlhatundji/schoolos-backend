import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserMessages, UserResult } from './results';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageUserPolicyHandler } from './policies';
import { StrategyEnum } from '../auth/strategies';

@Controller('users')
@ApiTags('User')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: UserResult,
    description: UserMessages.SUCCESS.USER_CREATED_SUCCESSFULLY,
  })
  @ApiBadRequestResponse({
    description: UserMessages.FAILURE.USER_EXISTS,
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async create(@Body() createUserDto: CreateUserDto) {
    const createdUser = await this.usersService.create(createUserDto);

    return UserResult.from(createdUser, {
      status: HttpStatus.CREATED,
      message: UserMessages.SUCCESS.USER_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  findAll() {
    return [];
  }

  @Put(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserResult,
    description: 'User updated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data',
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    return UserResult.from(updatedUser, {
      status: HttpStatus.OK,
      message: 'User updated successfully',
    });
  }

  @Patch(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserResult,
    description: 'User partially updated successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data',
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async partialUpdate(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    return UserResult.from(updatedUser, {
      status: HttpStatus.OK,
      message: 'User partially updated successfully',
    });
  }

  @Delete(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { success: true, message: 'User deleted successfully' };
  }

  @Put('by-student/:studentId')
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserResult,
    description: 'User updated successfully via student ID',
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or student not found',
  })
  @CheckPolicies(new ManageUserPolicyHandler())
  async updateByStudentId(
    @Param('studentId') studentId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.updateByStudentId(studentId, updateUserDto);
    return UserResult.from(updatedUser, {
      status: HttpStatus.OK,
      message: 'User updated successfully',
    });
  }
}
