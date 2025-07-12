import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ResetPasswordService } from './reset-password.service';
import { ResetPasswordRequestDto, UpdatePasswordDto } from './dto';
import { ApiResponse, ApiTags, ApiBadRequestResponse, ApiOkResponse } from '@nestjs/swagger';
import { ResetPasswordMessages } from './results/messages';
import { ResetPasswordRequestResult, UpdatePasswordResult } from './results';
import { Public } from '../../../../common/decorators';

@Controller('reset-password')
@ApiTags('Reset Password')
export class ResetPasswordController {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: ResetPasswordRequestResult,
    description: ResetPasswordMessages.SUCCESS.SENT_RESET_PASSWORD_LINK,
  })
  @ApiBadRequestResponse({
    description: ResetPasswordMessages.FAILURE.USER_NOT_FOUND,
  })
  async requestResetPassword(@Body() resetPasswordRequestDto: ResetPasswordRequestDto) {
    return this.resetPasswordService.requestResetPassword(resetPasswordRequestDto);
  }

  @Public()
  @Post('update')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: UpdatePasswordResult,
    description: ResetPasswordMessages.SUCCESS.PASSWORD_UPDATED,
  })
  @ApiBadRequestResponse({
    description: ResetPasswordMessages.FAILURE.RESET_PASSWORD_NOT_CONFIRMED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      "If the user is coming from a 'MustUpdatePassword' flow, they must supply the default password as the token.",
  })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.resetPasswordService.updatePassword(updatePasswordDto);
  }
}
