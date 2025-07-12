import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { ResetPasswordRequestDto, UpdatePasswordDto } from './dto';
import { BaseService } from '../../../../common/base-service';
import { OtpGenerator } from '../../../../utils/otp-generator';
import { TokensService } from '../refresh-token/tokens.service';
import { UsersService } from '../../../users/users.service';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SendEmailInputType } from '../../../../utils/mail/types/mail-service.interface';
import { ResetPasswordMessages } from './results/messages';
import {
  ResetPasswordByAdminResult,
  ResetPasswordRequestResult,
  UpdatePasswordResult,
} from './results';
import { MailService } from '../../../../utils/mail/mail.service';
import { Encryptor } from '../../../../utils/encryptor';
import { PasswordHasher } from '../../../../utils/hasher';
import { TokenTypes } from '../refresh-token/types';
import { PasswordGenerator } from '../../../../utils/password/password.generator';

@Injectable()
export class ResetPasswordService extends BaseService {
  constructor(
    private readonly otpGenerator: OtpGenerator,
    private readonly tokensService: TokensService,
    private readonly userService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly encryptor: Encryptor,
    private readonly hasher: PasswordHasher,
    private readonly passwordGenerator: PasswordGenerator,
  ) {
    super(ResetPasswordService.name);
  }

  async requestResetPassword(resetPasswordRequestDto: ResetPasswordRequestDto) {
    const { email } = resetPasswordRequestDto;
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return ResetPasswordRequestResult.from({
        status: HttpStatus.OK,
        message: ResetPasswordMessages.SUCCESS.SENT_RESET_PASSWORD_LINK,
      });
    }

    const { otp, expires } = this.otpGenerator.generate();
    await this.tokensService.save({
      token: this.encryptor.encrypt(otp),
      expires: new Date(expires),
      userId: user.id,
      type: TokenTypes.RESET_PASSWORD,
    });

    const resetPasswordUrl = this._generateResetPasswordUrl(email, otp);
    const emailInput: SendEmailInputType = {
      recipientAddress: email,
      recipientName: user.lastName,
      subject: 'Reset Password',
      html: `<p>Hi ${user.firstName},</p><p>Please click the link below to reset your password:</p><p><a href="${resetPasswordUrl}">Reset Password</a></p>`,
    };
    await this.mailService.sendEmail(emailInput);

    return ResetPasswordRequestResult.from({
      status: HttpStatus.OK,
      message: ResetPasswordMessages.SUCCESS.SENT_RESET_PASSWORD_LINK,
    });
  }

  private _generateResetPasswordUrl(email: string, token: string): string {
    const baseUrl = this.configService.get<string>('frontendBaseUrl');
    return `${baseUrl}/reset-password?token=${token}&email=${email}`;
  }

  async updatePassword(updatePasswordDto: UpdatePasswordDto) {
    const { password, email, token } = updatePasswordDto;
    const user = await this.findUserOrThrow(email);

    if (user.mustUpdatePassword) {
      // the token here will be the user's default password
      const isValidPassword = await this.hasher.compare(token, user.password);
      if (!isValidPassword)
        throw new UnauthorizedException(ResetPasswordMessages.FAILURE.INVALID_TOKEN);
    } else {
      await this.validateResetPasswordTokenOrThrow(user, token);
    }

    const hashedPassword = await this.hasher.hash(password);
    await this.userService.update(user.id, { password: hashedPassword, mustUpdatePassword: false });

    const emailInput: SendEmailInputType = {
      recipientAddress: email,
      recipientName: user.lastName,
      subject: 'Password Reset Confirmation',
      html: `<p>Hi ${user.firstName},</p><p>Your password has been successfully reset.</p>`,
    };
    await this.mailService.sendEmail(emailInput);

    await this.tokensService.blacklistToken(user.id, TokenTypes.RESET_PASSWORD);

    return UpdatePasswordResult.from({
      status: HttpStatus.OK,
      message: ResetPasswordMessages.SUCCESS.PASSWORD_UPDATED,
    });
  }

  private async validateResetPasswordTokenOrThrow(user: User, token: string) {
    const userToken = await this.tokensService.find(user.id, TokenTypes.RESET_PASSWORD);
    if (!userToken) {
      throw new UnauthorizedException(ResetPasswordMessages.FAILURE.INVALID_TOKEN);
    }

    if (userToken.blacklisted || userToken.expires < new Date()) {
      throw new BadRequestException(ResetPasswordMessages.FAILURE.RESET_LINK_EXPIRED);
    }

    const decryptedToken = this.encryptor.decrypt(userToken.token);
    if (decryptedToken !== token) {
      throw new UnauthorizedException(ResetPasswordMessages.FAILURE.INVALID_TOKEN);
    }

    await this.tokensService.blacklistToken(user.id, TokenTypes.RESET_PASSWORD);
  }

  private async findUserOrThrow(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }
    return user;
  }

  async resetUserPassword(email: string): Promise<ResetPasswordByAdminResult> {
    const userExists = await this.userService.findByEmail(email);
    if (!userExists) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }

    const defaultPassword = this.passwordGenerator.generate();
    const hashedPassword = await this.hasher.hash(defaultPassword);
    await this.userService.update(userExists.id, {
      password: hashedPassword,
      mustUpdatePassword: true,
    });

    return ResetPasswordByAdminResult.from(
      { status: HttpStatus.OK, message: ResetPasswordMessages.SUCCESS.PASSWORD_RESET_FOR_USER },
      defaultPassword,
    );
  }
}
