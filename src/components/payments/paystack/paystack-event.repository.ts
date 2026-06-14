import { Injectable } from '@nestjs/common';
import { Prisma, PaystackEvent, PaystackEventStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PaystackEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert an event row, returning the created record OR null if a row with
   * the same `paystackEventId` already exists (duplicate webhook delivery).
   * Run inside a transaction so the insert and the downstream credit are
   * committed atomically.
   */
  async tryCreate(
    tx: Prisma.TransactionClient,
    input: {
      paystackEventId: number | bigint;
      eventType: string;
      reference: string | null;
      payload: Prisma.InputJsonValue;
    },
  ): Promise<PaystackEvent | null> {
    try {
      return await tx.paystackEvent.create({
        data: {
          paystackEventId: BigInt(input.paystackEventId),
          eventType: input.eventType,
          reference: input.reference,
          payload: input.payload,
          status: 'RECEIVED',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }

  async markProcessed(
    tx: Prisma.TransactionClient,
    paystackEventId: number | bigint,
  ): Promise<void> {
    await tx.paystackEvent.update({
      where: { paystackEventId: BigInt(paystackEventId) },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  async markFinal(
    tx: Prisma.TransactionClient,
    paystackEventId: number | bigint,
    status: Extract<PaystackEventStatus, 'FAILED' | 'IGNORED'>,
    error: string,
  ): Promise<void> {
    await tx.paystackEvent.update({
      where: { paystackEventId: BigInt(paystackEventId) },
      data: { status, error, processedAt: new Date() },
    });
  }
}
