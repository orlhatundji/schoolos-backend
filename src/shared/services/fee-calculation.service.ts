import { Injectable } from '@nestjs/common';

export interface FeeBreakdown {
  studentTotal: number; // What the student pays
  platformFee: number; // Platform's commission
  paystackFee: number; // Paystack processing fee
  schoolReceives: number; // = feeAmount (school gets exact amount)
}

@Injectable()
export class FeeCalculationService {
  /**
   * Calculate the total amount a student pays, ensuring the school
   * receives the exact fee amount after all deductions.
   *
   * Paystack fee structure (NGN):
   * - 1.5% + NGN100 flat fee
   * - Capped at NGN2,000
   * - For transactions < NGN2,500: no NGN100 flat fee, just 1.5%
   *
   * We reverse-calculate so that after Paystack takes its fee,
   * the school still receives the original fee amount.
   */
  calculateStudentTotal(feeAmount: number, platformRate = 0.01): FeeBreakdown {
    const platformFee = Math.ceil(feeAmount * platformRate);
    const baseAmount = feeAmount + platformFee;

    let studentTotal: number;
    let paystackFee: number;

    // Try uncapped calculation first: total = (base + 100) / 0.985
    const uncappedTotal = (baseAmount + 100) / 0.985;
    const uncappedPaystackFee = uncappedTotal * 0.015 + 100;

    if (uncappedPaystackFee > 2000) {
      // Paystack fee is capped at NGN2,000
      studentTotal = baseAmount + 2000;
      paystackFee = 2000;
    } else if (uncappedTotal < 2500) {
      // For amounts under NGN2,500, no flat NGN100 fee — just 1.5%
      studentTotal = Math.ceil(baseAmount / 0.985);
      paystackFee = Math.ceil(studentTotal * 0.015);
    } else {
      studentTotal = Math.ceil(uncappedTotal);
      paystackFee = Math.ceil(studentTotal * 0.015 + 100);
    }

    return {
      studentTotal,
      platformFee,
      paystackFee,
      schoolReceives: feeAmount,
    };
  }
}
