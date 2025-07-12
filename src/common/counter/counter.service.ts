import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Note: if we have a distributed db replication in a near future deployment,
// like a db cluster or multiple write nodes, there is still room for race condition
// because locking a row is scoped to a single db node so in that case, we would have
// to move to redis/redlock to wrap critical logic instead of relying on postgres transactions.
// this is simply a future note as i dont think we need distributed coordination yet

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * allows to safely count up a sequence number for a given entity of a school (student, teacher, etc)
   * @param entity
   * @param schoolId
   * @returns number
   */
  async getNextSequenceNo(entity: string, schoolId: string): Promise<number> {
    // ensure the counter row exists outside of the transaction
    try {
      await this.prisma.counter.create({
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

    return await this.prisma.$transaction(async (tx) => {
      // Locks the existing row before reading until transaction commits
      const [counter] = await tx.$queryRawUnsafe<{ id: string; current: number }[]>(
        `SELECT * FROM "Counter" WHERE "entity" = $1 AND "schoolId" = $2 FOR UPDATE`,
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
}
