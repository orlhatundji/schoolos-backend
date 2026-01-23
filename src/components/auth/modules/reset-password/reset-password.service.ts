import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { ResetPasswordRequestDto, UpdatePasswordDto } from './dto';
import { StudentsService } from '../../../students/students.service';
import { TeachersService } from '../../../teachers/teachers.service';
import { BaseService } from '../../../../common/base-service';
import { OtpGenerator } from '../../../../utils/otp-generator';
import { TokensService } from '../refresh-token/tokens.service';
import { UsersService } from '../../../users/users.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { User, UserType } from '@prisma/client';
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
    private readonly studentsService: StudentsService,
    private readonly teachersService: TeachersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly encryptor: Encryptor,
    private readonly hasher: PasswordHasher,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly prisma: PrismaService,
  ) {
    super(ResetPasswordService.name);
  }

  async requestResetPassword(dto: ResetPasswordRequestDto) {
    const { email, userNo, userType } = dto;
    let user: User | null = null;

    // Determine lookup method: email or userNo+userType
    if (email) {
      user = await this.userService.findByEmail(email);
    } else if (userNo && userType) {
      user = await this._findUserByUserNo(userNo, userType);
    }

    if (!user) {
      // Return success even if not found to prevent enumeration attacks
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

    // Generate appropriate reset URL
    const resetPasswordUrl = email
      ? this._generateResetPasswordUrl(email, otp)
      : this._generateResetPasswordUrlForUserNo(userNo!, userType!, otp);

    const emailInput: SendEmailInputType = {
      recipientAddress: user.email,
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

  async updatePassword(dto: UpdatePasswordDto) {
    const { password, email, userNo, userType, token } = dto;
    let user: User | null = null;

    // Determine lookup method: email or userNo+userType
    if (email) {
      user = await this.userService.findByEmail(email);
    } else if (userNo && userType) {
      user = await this._findUserByUserNo(userNo, userType);
    }

    if (!user) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }

    const isFirstTimePasswordUpdate = user.mustUpdatePassword;

    if (isFirstTimePasswordUpdate) {
      // the token here will be the user's default password
      const isValidPassword = await this.hasher.compare(token, user.password);
      if (!isValidPassword)
        throw new UnauthorizedException(ResetPasswordMessages.FAILURE.INVALID_TOKEN);
    } else {
      // validateResetPasswordTokenOrThrow also blacklists the token
      await this.validateResetPasswordTokenOrThrow(user, token);
    }

    // Pass plain password - users.service.update will hash it
    await this.userService.update(user.id, { password, mustUpdatePassword: false });

    const emailInput: SendEmailInputType = {
      recipientAddress: user.email,
      recipientName: user.lastName,
      subject: 'Password Reset Confirmation',
      html: `<p>Hi ${user.firstName},</p><p>Your password has been successfully reset.</p>`,
    };
    await this.mailService.sendEmail(emailInput);

    return UpdatePasswordResult.from({
      status: HttpStatus.OK,
      message: ResetPasswordMessages.SUCCESS.PASSWORD_UPDATED,
    });
  }

  private async _findUserByUserNo(userNo: string, userType: UserType): Promise<User | null> {
    switch (userType) {
      case UserType.STUDENT: {
        const student = await this.studentsService.getStudentByStudentNo(userNo);
        return student?.user || null;
      }
      case UserType.TEACHER: {
        const teacher = await this.teachersService.getTeacherByTeacherNo(userNo);
        return teacher?.user || null;
      }
      case UserType.ADMIN:
      case UserType.SUPER_ADMIN: {
        const admin = await this.prisma.admin.findUnique({
          where: { adminNo: userNo },
          include: { user: true },
        });
        return admin?.user || null;
      }
      default:
        return null;
    }
  }

  private _generateResetPasswordUrl(email: string, token: string): string {
    const baseUrl = this.configService.get<string>('frontendBaseUrl');
    return `${baseUrl}/reset-password?token=${token}&email=${email}`;
  }

  private _generateResetPasswordUrlForUserNo(userNo: string, userType: UserType, token: string): string {
    const baseUrl = this.configService.get<string>('frontendBaseUrl');
    return `${baseUrl}/reset-password?token=${token}&userNo=${encodeURIComponent(userNo)}&userType=${userType}`;
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

  async resetUserPassword(email: string): Promise<ResetPasswordByAdminResult> {
    const userExists = await this.userService.findByEmail(email);
    if (!userExists) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }

    const defaultPassword = this.passwordGenerator.generate();
    // Pass plain password - users.service.update will hash it
    await this.userService.update(userExists.id, {
      password: defaultPassword,
      mustUpdatePassword: true,
    });

    return ResetPasswordByAdminResult.from(
      { status: HttpStatus.OK, message: ResetPasswordMessages.SUCCESS.PASSWORD_RESET_FOR_USER },
      defaultPassword,
    );
  }
}
