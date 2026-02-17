import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetCurrentUserId } from '../../../common/decorators';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { StrategyEnum } from '../../auth/strategies';
import { BankAccountService } from './bank-account.service';
import { AddBankAccountDto, VerifyBankAccountDto } from './dto/add-bank-account.dto';
import {
  BankAccountResponseDto,
  VerifyAccountResponseDto,
  BankListItemDto,
} from './dto/bank-account-response.dto';

@Controller('settings')
@ApiTags('Settings - Bank Account')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get('bank-account')
  @ApiOperation({ summary: "Get school's bank account" })
  @ApiResponse({
    status: 200,
    description: 'Bank account retrieved successfully',
    type: BankAccountResponseDto,
  })
  async getBankAccount(@GetCurrentUserId() userId: string) {
    const bankAccount = await this.bankAccountService.getBankAccount(userId);
    return {
      success: true,
      message: bankAccount
        ? 'Bank account retrieved successfully'
        : 'No bank account configured',
      data: bankAccount,
    };
  }

  @Get('banks')
  @ApiOperation({ summary: 'List available banks from Paystack' })
  @ApiResponse({
    status: 200,
    description: 'Banks list retrieved successfully',
    type: [BankListItemDto],
  })
  async listBanks() {
    const banks = await this.bankAccountService.listBanks();
    return {
      success: true,
      message: 'Banks retrieved successfully',
      data: banks,
    };
  }

  @Post('bank-account/verify')
  @ApiOperation({ summary: 'Verify bank account number' })
  @ApiResponse({
    status: 200,
    description: 'Account verified successfully',
    type: VerifyAccountResponseDto,
  })
  async verifyAccount(@Body() dto: VerifyBankAccountDto) {
    const result = await this.bankAccountService.verifyAccount(dto);
    return {
      success: true,
      message: 'Account verified successfully',
      data: result,
    };
  }

  @Post('bank-account')
  @ApiOperation({ summary: 'Add or update school bank account' })
  @ApiResponse({
    status: 200,
    description: 'Bank account saved successfully',
    type: BankAccountResponseDto,
  })
  async addOrUpdateBankAccount(
    @GetCurrentUserId() userId: string,
    @Body() dto: AddBankAccountDto,
  ) {
    const bankAccount = await this.bankAccountService.addOrUpdateBankAccount(userId, dto);
    return {
      success: true,
      message: 'Bank account saved successfully',
      data: bankAccount,
    };
  }
}
