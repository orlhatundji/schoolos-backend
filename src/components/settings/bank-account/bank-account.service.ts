import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaystackService } from '../../../shared/services/paystack.service';
import { AddBankAccountDto, VerifyBankAccountDto } from './dto/add-bank-account.dto';

@Injectable()
export class BankAccountService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {
    super(BankAccountService.name);
  }

  async getBankAccount(userId: string) {
    const school = await this.getSchoolForUser(userId);

    const bankAccount = await this.prisma.schoolBankAccount.findUnique({
      where: { schoolId: school.id },
    });

    if (!bankAccount) {
      return null;
    }

    return {
      id: bankAccount.id,
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      paystackSubaccountCode: bankAccount.paystackSubaccountCode,
      isVerified: bankAccount.isVerified,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt,
    };
  }

  async listBanks() {
    const banks = await this.paystackService.listBanks();
    return banks
      .filter((bank) => bank.active)
      .map((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
      }));
  }

  async verifyAccount(dto: VerifyBankAccountDto) {
    const resolved = await this.paystackService.resolveAccountNumber(
      dto.accountNumber,
      dto.bankCode,
    );

    return {
      accountName: resolved.account_name,
      accountNumber: resolved.account_number,
      bankCode: dto.bankCode,
    };
  }

  async addOrUpdateBankAccount(userId: string, dto: AddBankAccountDto) {
    const school = await this.getSchoolForUser(userId);

    // Verify the account first
    const resolved = await this.paystackService.resolveAccountNumber(
      dto.accountNumber,
      dto.bankCode,
    );

    const existingAccount = await this.prisma.schoolBankAccount.findUnique({
      where: { schoolId: school.id },
    });

    if (existingAccount) {
      // Update existing account
      let subaccountCode = existingAccount.paystackSubaccountCode;

      if (subaccountCode) {
        // Update existing Paystack subaccount
        await this.paystackService.updateSubaccount(subaccountCode, {
          settlement_bank: dto.bankCode,
          account_number: dto.accountNumber,
        });
      } else {
        // Create new Paystack subaccount
        const subaccount = await this.paystackService.createSubaccount(
          school.name,
          dto.bankCode,
          dto.accountNumber,
          0, // We use transaction_charge per payment, not percentage
        );
        subaccountCode = subaccount.subaccount_code;
      }

      const updated = await this.prisma.schoolBankAccount.update({
        where: { schoolId: school.id },
        data: {
          bankCode: dto.bankCode,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          accountName: resolved.account_name,
          paystackSubaccountCode: subaccountCode,
          isVerified: true,
        },
      });

      return {
        id: updated.id,
        bankCode: updated.bankCode,
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
        paystackSubaccountCode: updated.paystackSubaccountCode,
        isVerified: updated.isVerified,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    // Create new account + Paystack subaccount
    const subaccount = await this.paystackService.createSubaccount(
      school.name,
      dto.bankCode,
      dto.accountNumber,
      0,
    );

    const bankAccount = await this.prisma.schoolBankAccount.create({
      data: {
        schoolId: school.id,
        bankCode: dto.bankCode,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: resolved.account_name,
        paystackSubaccountCode: subaccount.subaccount_code,
        isVerified: true,
        createdBy: userId,
      },
    });

    return {
      id: bankAccount.id,
      bankCode: bankAccount.bankCode,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      paystackSubaccountCode: bankAccount.paystackSubaccountCode,
      isVerified: bankAccount.isVerified,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt,
    };
  }

  private async getSchoolForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true, type: true },
    });

    if (!user?.schoolId) {
      throw new NotFoundException('User is not associated with a school');
    }

    if (user.type !== 'ADMIN' && user.type !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only school admins can manage bank accounts');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return school;
  }
}
