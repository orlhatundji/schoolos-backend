import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Note: if we have a distributed db replication in a near future deployment,
// like a db cluster or multiple write nodes, there is still room for race condition
// because locking a row is scoped to a single db node so in that case, we would have
// to move to redis/redlock to wrap critical logic instead of relying on postgres transactions.
// this is simply a future note as i dont think we need distributed coordination yet

type PrismaClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * allows to safely count up a sequence number for a given entity of a school (student, teacher, etc)
   * @param entity
   * @param schoolId
   * @param prismaClient - optional transaction client to use instead of the default prisma client
   * @returns number
   */
  async getNextSequenceNo(
    entity: string,
    schoolId: string,
    prismaClient?: PrismaClient,
  ): Promise<number> {
    const client = prismaClient || this.prisma;

    // ensure the counter row exists
    try {
      await client.counter.create({
        data: {
          entity,
          schoolId,
          current: 0,
        },
      });
    } catch (error) {
      // ignore if already exists (P2002)
      if (error.code !== 'P2002') throw error;
    }

    // If we're already in a transaction, use that client directly
    if (prismaClient) {
      const [counter] = await client.$queryRawUnsafe<{ id: string; current: number }[]>(
        `SELECT * FROM "counters" WHERE "entity" = $1 AND "schoolId" = $2 FOR UPDATE`,
        entity,
        schoolId,
      );

      if (!counter) {
        throw new Error(`Counter record unexpectedly missing after create`);
      }

      const next = counter.current + 1;

      await client.counter.update({
        where: { id: counter.id },
        data: { current: next },
      });

      return next;
    }

    // Otherwise, create our own transaction
    return await this.prisma.$transaction(async (tx) => {
      // Locks the existing row before reading until transaction commits
      const [counter] = await tx.$queryRawUnsafe<{ id: string; current: number }[]>(
        `SELECT * FROM "counters" WHERE "entity" = $1 AND "schoolId" = $2 FOR UPDATE`,
        entity,
        schoolId,
      );

      if (!counter) {
        throw new Error(`Counter record unexpectedly missing after create`);
      }

      // compute next value
      const next = counter.current + 1;

      // update the counter
      await tx.counter.update({
        where: { id: counter.id },
        data: { current: next },
      });

      return next;
    });
  }

  /**
   * Safely generates the next sequence number for a global/platform-level entity (e.g., school codes).
   * Unlike getNextSequenceNo, this is not scoped to a school.
   * @param entity - The entity type (e.g., 'school')
   * @returns The next sequence number
   */
  async getNextGlobalSequenceNo(entity: string): Promise<number> {
    // Ensure the global counter row exists outside of the transaction
    try {
      await this.prisma.globalCounter.create({
        data: {
          entity,
          current: 0,
        },
      });
    } catch (error) {
      // Ignore if already exists (P2002 is unique constraint violation)
      if (error.code !== 'P2002') throw error;
    }

    return await this.prisma.$transaction(async (tx) => {
      // Lock the existing row before reading until transaction commits
      const [counter] = await tx.$queryRawUnsafe<{ id: string; current: number }[]>(
        `SELECT * FROM "global_counters" WHERE "entity" = $1 FOR UPDATE`,
        entity,
      );

      if (!counter) {
        throw new Error(`GlobalCounter record unexpectedly missing after create`);
      }

      // Compute next value
      const next = counter.current + 1;

      // Update the counter
      await tx.globalCounter.update({
        where: { id: counter.id },
        data: { current: next },
      });

      return next;
    });
  }
}
