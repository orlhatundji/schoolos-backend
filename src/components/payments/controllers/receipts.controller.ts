import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PlatformTransactionOperation } from '@prisma/client';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUser } from '../../../common/decorators';
import { PrismaService } from '../../../prisma/prisma.service';
import { IJwtPayload } from '../../auth/strategies/jwt/types';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('receipts')
export class ReceiptsController {
  private readonly logger = new Logger(ReceiptsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':reference/download')
  @ApiOperation({ summary: 'Download the PDF receipt for a payment by reference' })
  @ApiResponse({ status: 200, description: 'PDF receipt streamed' })
  @ApiResponse({ status: 403, description: 'Caller is not authorized for this receipt' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async download(
    @GetCurrentUser() user: IJwtPayload,
    @Param('reference') reference: string,
    @Res() res: Response,
  ) {
    const tx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
      select: {
        id: true,
        schoolId: true,
        receiptUrl: true,
        operationType: true,
        operationId: true,
      },
    });

    if (!tx) {
      throw new NotFoundException('Receipt not found');
    }

    const isSchoolMember = user.schoolId === tx.schoolId;
    let isOwningStudent = false;
    if (tx.operationType === PlatformTransactionOperation.STUDENT_PAYMENT) {
      const sp = await this.prisma.studentPayment.findUnique({
        where: { id: tx.operationId },
        select: { student: { select: { userId: true } } },
      });
      isOwningStudent = sp?.student?.userId === user.sub;
    }
    if (!isSchoolMember && !isOwningStudent) {
      throw new ForbiddenException('Not authorized to view this receipt');
    }

    if (!tx.receiptUrl) {
      throw new NotFoundException('Receipt not yet generated');
    }

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(tx.receiptUrl);
    } catch (error) {
      this.logger.error(
        `Failed to fetch archived receipt ${tx.receiptUrl}: ${(error as Error).message}`,
      );
      throw new NotFoundException('Receipt is currently unavailable');
    }

    if (!upstream.ok) {
      this.logger.error(`Upstream returned ${upstream.status} for ${tx.receiptUrl}`);
      throw new NotFoundException('Receipt is currently unavailable');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${reference}.pdf"`,
    );
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.send(buffer);
  }
}
