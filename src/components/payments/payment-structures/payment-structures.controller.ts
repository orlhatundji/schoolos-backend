import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SchoolId } from '../../../common/decorators';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
import { CheckPolicies } from '../../roles-manager/policies/check-policies.decorator';
import { PoliciesGuard } from '../../roles-manager/policies/policies.guard';
import { CreatePaymentStructureDto } from './dto/create-payment-structure.dto';
import { GeneratePaymentsDto } from './dto/generate-payments.dto';
import { UpdatePaymentStructureDto } from './dto/update-payment-structure.dto';
import { PaymentStructuresService } from './payment-structures.service';

@ApiTags('Payment Structures')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PoliciesGuard)
@Controller('payment-structures')
export class PaymentStructuresController {
  constructor(private readonly paymentStructuresService: PaymentStructuresService) {}

  @Post()
  @CheckPolicies()
  @ApiOperation({ summary: 'Create a new payment structure' })
  @ApiResponse({ status: 201, description: 'Payment structure created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(
    @SchoolId() schoolId: string,
    @Body() createPaymentStructureDto: CreatePaymentStructureDto,
  ) {
    return this.paymentStructuresService.createPaymentStructure(schoolId, createPaymentStructureDto);
  }

  @Get()
  @CheckPolicies()
  @ApiOperation({ summary: 'Get all payment structures for the school' })
  @ApiResponse({ status: 200, description: 'Payment structures retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@SchoolId() schoolId: string) {
    return this.paymentStructuresService.getAllPaymentStructures(schoolId);
  }

  @Get(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get a specific payment structure by ID' })
  @ApiResponse({ status: 200, description: 'Payment structure retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment structure not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.paymentStructuresService.getPaymentStructureById(schoolId, id);
  }

  @Patch(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Update a payment structure' })
  @ApiResponse({ status: 200, description: 'Payment structure updated successfully' })
  @ApiResponse({ status: 404, description: 'Payment structure not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() updatePaymentStructureDto: UpdatePaymentStructureDto,
  ) {
    return this.paymentStructuresService.updatePaymentStructure(
      schoolId,
      id,
      updatePaymentStructureDto,
    );
  }

  @Delete(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Delete a payment structure' })
  @ApiResponse({ status: 200, description: 'Payment structure deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment structure not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - has associated student payments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.paymentStructuresService.deletePaymentStructure(schoolId, id);
  }

  @Post(':id/generate-payments')
  @CheckPolicies()
  @ApiOperation({ summary: 'Generate student payments for a payment structure' })
  @ApiResponse({ status: 200, description: 'Student payments generated successfully' })
  @ApiResponse({ status: 404, description: 'Payment structure not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  generateStudentPayments(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() generatePaymentsDto: GeneratePaymentsDto,
  ) {
    return this.paymentStructuresService.generateStudentPayments(schoolId, id, generatePaymentsDto);
  }
}
