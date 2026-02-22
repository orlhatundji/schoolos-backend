import {
  Controller,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserResult } from './results';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageUserPolicyHandler } from './policies';
import { StrategyEnum } from '../auth/strategies';

@Controller('users')
@ApiTags('User')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
