/**
 * One-off: clear all SchoolInvoice rows from the local DB so the billing-cycle
 * flow can be re-tested from scratch. Also clears the matching SCHOOL_INVOICE
 * PlatformTransaction rows so settlement state doesn't reference dead invoices.
 *
 * Usage:  pnpm ts-node scripts/clear-invoices.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const ptx = await prisma.platformTransaction.deleteMany({
    where: { operationType: 'SCHOOL_INVOICE' },
  });
  const inv = await prisma.schoolInvoice.deleteMany({});
  console.log(
    `Cleared ${inv.count} school invoice(s) and ${ptx.count} matching platform transaction(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
