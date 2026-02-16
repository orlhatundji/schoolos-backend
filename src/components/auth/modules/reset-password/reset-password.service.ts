import {
  Injectable,
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
    const { userNo, userType } = dto;
    const user = await this._findUserByUserNo(userNo, userType);

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

    const resetPasswordUrl = this._generateResetPasswordUrl(userNo, userType, otp);

    if (user.email) {
      const userTypeLabel = this._getUserTypeLabel(userType);
      const emailInput: SendEmailInputType = {
        recipientAddress: user.email,
        recipientName: user.lastName,
        subject: 'Reset Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset the password for your account.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>${userTypeLabel}:</strong> ${userNo}</p>
            </div>
            <p>Please click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetPasswordUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            <p>Best regards,<br/>The Schos Team</p>
          </div>
        `,
      };
      await this.mailService.sendEmail(emailInput);
    }

    return ResetPasswordRequestResult.from({
      status: HttpStatus.OK,
      message: ResetPasswordMessages.SUCCESS.SENT_RESET_PASSWORD_LINK,
    });
  }

  async updatePassword(dto: UpdatePasswordDto) {
    const { password, userNo, userType, token } = dto;
    const user = await this._findUserByUserNo(userNo, userType);

    if (!user) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }

    const isValidResetToken = await this.validateResetPasswordToken(user, token);
    const isValidPasswordToken = await this.validateUpdatePassword(user, token);

    if (!isValidResetToken && !isValidPasswordToken) {
      throw new UnauthorizedException(ResetPasswordMessages.FAILURE.INVALID_TOKEN);
    }

    // Pass plain password - users.service.update will hash it
    await this.userService.update(user.id, { password, mustUpdatePassword: false });

    if (user.email) {
      const userTypeLabel = this._getUserTypeLabel(userType);
      const emailInput: SendEmailInputType = {
        recipientAddress: user.email,
        recipientName: user.lastName,
        subject: 'Password Reset Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Successful</h2>
            <p>Hi ${user.firstName},</p>
            <p>Your password has been successfully reset for your account.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>${userTypeLabel}:</strong> ${userNo}</p>
            </div>
            <p style="color: #e74c3c;"><strong>Important:</strong> If you didn't make this change, please contact support immediately.</p>
            <p>Best regards,<br/>The Schos Team</p>
          </div>
        `,
      };
      await this.mailService.sendEmail(emailInput);
    }

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

  private _generateResetPasswordUrl(userNo: string, userType: UserType, token: string): string {
    const baseUrl = this._getAppBaseUrl(userType);
    return `${baseUrl}/reset-password?token=${token}&userNo=${encodeURIComponent(userNo)}&userType=${userType}`;
  }

  private _getAppBaseUrl(userType: UserType): string {
    switch (userType) {
      case UserType.STUDENT:
        return this.configService.get<string>('studentAppBaseUrl') || this.configService.get<string>('frontendBaseUrl');
      case UserType.TEACHER:
        return this.configService.get<string>('teacherAppBaseUrl') || this.configService.get<string>('frontendBaseUrl');
      case UserType.ADMIN:
      case UserType.SUPER_ADMIN:
        return this.configService.get<string>('adminAppBaseUrl') || this.configService.get<string>('frontendBaseUrl');
      default:
        return this.configService.get<string>('frontendBaseUrl');
    }
  }

  private _getUserTypeLabel(userType: UserType): string {
    switch (userType) {
      case UserType.STUDENT:
        return 'Student ID';
      case UserType.TEACHER:
        return 'Teacher ID';
      case UserType.ADMIN:
      case UserType.SUPER_ADMIN:
        return 'Admin ID';
      default:
        return 'User ID';
    }
  }

  private async validateResetPasswordToken(user: User, token: string): Promise<boolean> {
    const userToken = await this.tokensService.find(user.id, TokenTypes.RESET_PASSWORD);
    if (!userToken) {
      return false;
    }

    if (userToken.blacklisted || userToken.expires < new Date()) {
      return false;
    }

    const decryptedToken = this.encryptor.decrypt(userToken.token);
    if (decryptedToken !== token) {
      return false;
    }

    await this.tokensService.blacklistToken(user.id, TokenTypes.RESET_PASSWORD);
    return true;
  }

  private async validateUpdatePassword(user: User, token: string): Promise<boolean> {
    if (!user.mustUpdatePassword) {
      return false;
    }

    return await this.hasher.compare(token, user.password);
  }

  async resetUserPassword(userId: string): Promise<ResetPasswordByAdminResult> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(ResetPasswordMessages.FAILURE.USER_NOT_FOUND);
    }

    const defaultPassword = this.passwordGenerator.generate();
    // Pass plain password - users.service.update will hash it
    await this.userService.update(user.id, {
      password: defaultPassword,
      mustUpdatePassword: true,
    });

    return ResetPasswordByAdminResult.from(
      { status: HttpStatus.OK, message: ResetPasswordMessages.SUCCESS.PASSWORD_RESET_FOR_USER },
      defaultPassword,
    );
  }
}
