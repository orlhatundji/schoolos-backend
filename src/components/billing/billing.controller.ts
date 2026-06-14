import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SchoolInvoiceStatus } from '@prisma/client';

import { GetCurrentUserId, SchoolId } from '../../common/decorators';
import { SystemAdminGuard } from '../../common/guards';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { PaymentEventOutcome, PaymentTarget } from '../payments/domain/payment-event-result';
import { PaymentService } from '../payments/payment.service';
import { BillingService } from './billing.service';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { EditInvoiceDto } from './dto/edit-invoice.dto';
import { MarkInvoicePaidDto } from './dto/mark-paid.dto';
import { WaiveInvoiceDto } from './dto/waive-invoice.dto';

@Controller('admin/billing')
@ApiTags('Billing')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly paymentService: PaymentService,
  ) {}

  // ──────────────────────── Platform admin (Schos) ────────────────────────

  @Post('invoices/generate-current')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate invoices for every school using each school\'s current term (mirrors the daily cron). Platform admin only.',
  })
  async generateCurrent() {
    return this.billingService.generateForCurrentTerms();
  }

  @Post('invoices/generate-for-school/:schoolId/:termId')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate one invoice for a specific school and term (platform admin)' })
  async generateForSchool(
    @Param('schoolId') schoolId: string,
    @Param('termId') termId: string,
  ) {
    return this.billingService.generateForSchoolAndTerm(schoolId, termId);
  }

  @Get('schools/:schoolId/terms')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'List a school\'s terms (with current term flagged) for the generate UI' })
  async listSchoolTerms(@Param('schoolId') schoolId: string) {
    return this.billingService.listSchoolTerms(schoolId);
  }

  @Get('invoices')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'List all invoices across schools (platform admin)' })
  async listAll(
    @Query('status') status?: SchoolInvoiceStatus,
    @Query('schoolId') schoolId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.billingService.listInvoices({ status, schoolId, termId });
  }

  @Get('invoices/stats')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Aggregate invoice revenue stats (platform admin)' })
  async invoiceStats() {
    return this.billingService.getInvoiceStats();
  }

  @Get('invoices/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Get one invoice by id (platform admin)' })
  async getOne(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }

  @Post('invoices/:id/mark-paid')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an ISSUED invoice as PAID externally (platform admin)' })
  async markPaid(
    @Param('id') id: string,
    @GetCurrentUserId() actorUserId: string,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    return this.billingService.markInvoicePaid(id, actorUserId, dto.note);
  }

  @Post('invoices/:id/waive')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Waive an ISSUED invoice (platform admin)' })
  async waive(
    @Param('id') id: string,
    @GetCurrentUserId() actorUserId: string,
    @Body() dto: WaiveInvoiceDto,
  ) {
    return this.billingService.waiveInvoice(id, actorUserId, dto.reason);
  }

  @Post('invoices/:id/cancel')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an ISSUED invoice (platform admin)' })
  async cancel(
    @Param('id') id: string,
    @GetCurrentUserId() actorUserId: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.billingService.cancelInvoice(id, actorUserId, dto.reason);
  }

  @Patch('invoices/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Edit an ISSUED invoice (platform admin)' })
  async edit(
    @Param('id') id: string,
    @GetCurrentUserId() actorUserId: string,
    @Body() dto: EditInvoiceDto,
  ) {
    return this.billingService.editInvoice(id, actorUserId, dto);
  }

  @Post('invoices/:id/unwaive')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a waiver — return invoice to ISSUED status (platform admin)' })
  async unwaive(@Param('id') id: string) {
    return this.billingService.unwaiveInvoice(id);
  }

  @Post('invoices/verify-reference')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Manually verify a Paystack reference against an invoice — for cases when the webhook did not settle (platform admin)',
  })
  async verifyByReference(@Body() body: { reference: string }) {
    const reference = body?.reference?.trim();
    if (!reference) throw new BadRequestException('reference is required');
    const result = await this.paymentService.platformVerifyByReference(reference);

    if (result.outcome === PaymentEventOutcome.DUPLICATE_EVENT) {
      return {
        message: 'Payment was already processed',
        alreadyProcessed: true,
        outcome: result.outcome,
      };
    }
    if (result.outcome === PaymentEventOutcome.PAYMENT_PROCESSED) {
      if (result.target === PaymentTarget.SCHOOL_INVOICE) {
        return {
          message: 'Invoice payment verified and recorded',
          alreadyProcessed: false,
          outcome: result.outcome,
          target: result.target,
          invoiceId: result.invoiceId,
          amountNaira: result.amountNaira,
        };
      }
      return {
        message: `Payment verified and recorded (${result.status})`,
        alreadyProcessed: false,
        outcome: result.outcome,
        target: result.target,
        status: result.status,
        amountNaira: result.amountNaira,
      };
    }
    return { message: `Outcome: ${result.outcome}`, alreadyProcessed: false, outcome: result.outcome };
  }

  @Get('invoices/:id/receipt')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Download the payment receipt PDF for a PAID invoice (platform admin)' })
  async downloadInvoiceReceipt(@Param('id') id: string, @Res() res: Response) {
    return this.streamReceiptPdf(id, res);
  }

  // ──────────────────────── School admin (own school) ────────────────────────

  @Get('my-invoices')
  @ApiOperation({ summary: "List the caller school's invoices" })
  async myInvoices(@SchoolId() schoolId: string) {
    return this.billingService.getMyInvoices(schoolId);
  }

  @Get('my-outstanding')
  @ApiOperation({ summary: "List the caller school's unpaid invoices" })
  async myOutstanding(@SchoolId() schoolId: string) {
    const invoices = await this.billingService.getOutstandingInvoices(schoolId);
    const totalAmount = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    return { count: invoices.length, totalAmount, invoices };
  }

  @Get('my-billing-status')
  @ApiOperation({ summary: 'Outstanding-invoice summary + current term countdown (banner data)' })
  async myBillingStatus(@SchoolId() schoolId: string) {
    return this.billingService.getMyBillingStatus(schoolId);
  }

  @Get('my-invoices/:id')
  @ApiOperation({ summary: 'Get one of the caller school\'s invoices (full detail)' })
  async myInvoiceDetail(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
  ) {
    return this.billingService.getMyInvoiceById(schoolId, id);
  }

  @Get('my-invoices/:id/download')
  @ApiOperation({ summary: 'Download an invoice PDF (caller must own the invoice)' })
  async downloadOwnInvoice(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.billingService.requireInvoiceOwnedBySchool(id, schoolId);
    return this.streamInvoicePdf(invoice.id, res);
  }

  @Get('my-invoices/:id/receipt')
  @ApiOperation({ summary: 'Download the payment receipt PDF for a PAID invoice (caller must own the invoice)' })
  async downloadOwnInvoiceReceipt(
    @Param('id') id: string,
    @SchoolId() schoolId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.billingService.requireInvoiceOwnedBySchool(id, schoolId);
    return this.streamReceiptPdf(invoice.id, res);
  }

  @Post('my-invoices/:invoiceId/initiate-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a Paystack payment for an outstanding invoice' })
  async initiatePayment(
    @Param('invoiceId') invoiceId: string,
    @GetCurrentUserId() userId: string,
    @SchoolId() schoolId: string,
  ) {
    return this.billingService.initiateInvoicePayment(userId, schoolId, invoiceId);
  }

  @Get('my-invoices/:invoiceId/verify-payment')
  @ApiOperation({ summary: 'Verify the payment status for an invoice by reference' })
  async verifyPayment(
    @Param('invoiceId') invoiceId: string,
    @SchoolId() schoolId: string,
    @Query('reference') reference: string,
  ) {
    if (!reference) throw new BadRequestException('reference query param required');
    return this.billingService.verifyInvoicePayment(schoolId, invoiceId, reference);
  }

  @Post('my-invoices/verify-by-reference')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Verify a Paystack reference against the caller school\'s invoices (used by the post-Paystack callback page to auto-settle).',
  })
  async myVerifyInvoiceByReference(
    @SchoolId() schoolId: string,
    @Body() body: { reference: string },
  ) {
    const reference = body?.reference?.trim();
    if (!reference) throw new BadRequestException('reference is required');
    return this.billingService.verifyInvoicePaymentByReference(schoolId, reference);
  }

  // ──────────────────────── Internal ────────────────────────

  private async streamInvoicePdf(invoiceId: string, res: Response): Promise<void> {
    const url = await this.billingService.getInvoicePdfUrl(invoiceId);
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url);
    } catch {
      throw new NotFoundException('Invoice PDF is currently unavailable');
    }
    if (!upstream.ok) {
      throw new NotFoundException('Invoice PDF is currently unavailable');
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.send(buffer);
  }

  private async streamReceiptPdf(invoiceId: string, res: Response): Promise<void> {
    const { url, reference } = await this.billingService.getInvoiceReceiptUrl(invoiceId);
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url);
    } catch {
      throw new NotFoundException('Receipt is currently unavailable');
    }
    if (!upstream.ok) {
      throw new NotFoundException('Receipt is currently unavailable');
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${reference}.pdf"`);
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.send(buffer);
  }
}
