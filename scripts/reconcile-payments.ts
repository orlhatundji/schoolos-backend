import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const DELAY_MS = 100; // rate-limit between Paystack API calls

interface ReconcileResult {
  reference: string;
  outcome: 'settled' | 'failed' | 'skipped' | 'error';
  detail: string;
}

async function verifyWithPaystack(reference: string): Promise<any> {
  const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reconcilePayments() {
  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set in environment');
    process.exit(1);
  }

  console.log('Starting bulk payment reconciliation...\n');

  // Find all PENDING platform transactions (payments initiated but not confirmed)
  const pendingTxns = await prisma.platformTransaction.findMany({
    where: { status: 'PENDING' },
    include: {
      studentPayment: {
        include: {
          student: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          paymentStructure: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${pendingTxns.length} pending transaction(s) to reconcile.\n`);

  if (pendingTxns.length === 0) {
    console.log('Nothing to reconcile.');
    return;
  }

  const results: ReconcileResult[] = [];

  for (const tx of pendingTxns) {
    const ref = tx.paymentReference;
    const studentPayment = tx.studentPayment;
    const studentName = studentPayment
      ? `${studentPayment.student.user.firstName} ${studentPayment.student.user.lastName}`
      : 'Unknown';
    const structureName = studentPayment?.paymentStructure?.name || 'Unknown';

    process.stdout.write(`[${ref}] ${studentName} — ${structureName} ... `);

    // Skip if StudentPayment is already fully paid
    if (studentPayment && studentPayment.status === 'PAID') {
      // Just settle the PlatformTransaction
      await prisma.platformTransaction.update({
        where: { id: tx.id },
        data: { status: 'SETTLED', settledAt: new Date() },
      });
      console.log('SKIPPED (already paid)');
      results.push({ reference: ref, outcome: 'skipped', detail: 'StudentPayment already PAID' });
      await sleep(DELAY_MS);
      continue;
    }

    if (!studentPayment) {
      console.log('SKIPPED (no linked student payment)');
      results.push({ reference: ref, outcome: 'skipped', detail: 'No linked StudentPayment' });
      await sleep(DELAY_MS);
      continue;
    }

    try {
      const paystackRes = await verifyWithPaystack(ref);

      if (!paystackRes.status) {
        console.log(`ERROR (Paystack: ${paystackRes.message})`);
        results.push({ reference: ref, outcome: 'error', detail: paystackRes.message });
        await sleep(DELAY_MS);
        continue;
      }

      const txStatus = paystackRes.data?.status;

      if (txStatus === 'success') {
        // Credit the feeAmount (what the school receives, not the full Paystack charge)
        const amountToCredit = Number(tx.feeAmount);
        const newPaidAmount = Number(studentPayment.paidAmount) + amountToCredit;
        const totalAmount = Number(studentPayment.amount);
        const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

        await prisma.$transaction([
          prisma.studentPayment.update({
            where: { id: studentPayment.id },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus,
              paidAt: new Date(),
              notes: `Payment reconciled via bulk script. Reference: ${ref}. Amount credited: ${amountToCredit}`,
            },
          }),
          prisma.platformTransaction.update({
            where: { id: tx.id },
            data: { status: 'SETTLED', settledAt: new Date() },
          }),
        ]);

        console.log(`SETTLED (${newStatus}, credited ${amountToCredit})`);
        results.push({
          reference: ref,
          outcome: 'settled',
          detail: `${newStatus} — credited ${amountToCredit}`,
        });
      } else if (txStatus === 'failed' || txStatus === 'abandoned') {
        await prisma.platformTransaction.update({
          where: { id: tx.id },
          data: { status: 'FAILED' },
        });
        console.log(`FAILED (Paystack status: ${txStatus})`);
        results.push({ reference: ref, outcome: 'failed', detail: `Paystack: ${txStatus}` });
      } else {
        console.log(`SKIPPED (Paystack status: ${txStatus})`);
        results.push({ reference: ref, outcome: 'skipped', detail: `Paystack status: ${txStatus}` });
      }
    } catch (err: any) {
      console.log(`ERROR (${err.message})`);
      results.push({ reference: ref, outcome: 'error', detail: err.message });
    }

    await sleep(DELAY_MS);
  }

  // Print summary
  const settled = results.filter((r) => r.outcome === 'settled').length;
  const failed = results.filter((r) => r.outcome === 'failed').length;
  const skipped = results.filter((r) => r.outcome === 'skipped').length;
  const errors = results.filter((r) => r.outcome === 'error').length;

  console.log('\n========================================');
  console.log('  Reconciliation Summary');
  console.log('========================================');
  console.log(`  Total checked:  ${results.length}`);
  console.log(`  Settled:        ${settled}`);
  console.log(`  Failed:         ${failed}`);
  console.log(`  Skipped:        ${skipped}`);
  console.log(`  Errors:         ${errors}`);
  console.log('========================================\n');

  if (errors > 0) {
    console.log('Errors:');
    results
      .filter((r) => r.outcome === 'error')
      .forEach((r) => console.log(`  [${r.reference}] ${r.detail}`));
    console.log('');
  }
}

// Run
if (require.main === module) {
  reconcilePayments()
    .then(() => {
      console.log('Reconciliation completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Reconciliation failed:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

export { reconcilePayments };
