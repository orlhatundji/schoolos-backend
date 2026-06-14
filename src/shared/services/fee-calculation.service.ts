import { Injectable } from '@nestjs/common';

export interface PaystackBreakdownAdditive {
  baseAmount: number;
  paystackFee: number;
  totalCharged: number;
}

export interface PaystackBreakdownInclusive {
  totalCharged: number;
  paystackFee: number;
  recipientReceives: number;
}

@Injectable()
export class FeeCalculationService {
  /**
   * Paystack processing fee for an amount actually charged.
   * 1.5% + ₦100, capped at ₦2,000. Under ₦2,500 the flat ₦100 doesn't apply.
   */
  computePaystackFee(totalCharged: number): number {
    if (totalCharged < 2500) {
      return Math.ceil(totalCharged * 0.015);
    }
    const fee = Math.ceil(totalCharged * 0.015 + 100);
    return Math.min(fee, 2000);
  }

  /**
   * Payer bears the Paystack fee on top of the base amount.
   * Used for student payments: parent pays `totalCharged`; school's
   * Paystack subaccount nets the full `baseAmount` after Paystack's cut.
   *
   * Reverse-solves for the gross amount such that Paystack's fee on that
   * gross leaves the school with `baseAmount` exactly. `paystackFee` in the
   * return is the displayed/breakdown value (= totalCharged - baseAmount).
   */
  calculatePaystackBreakdownAdditive(baseAmount: number): PaystackBreakdownAdditive {
    const uncappedTotal = (baseAmount + 100) / 0.985;
    const uncappedFee = uncappedTotal * 0.015 + 100;

    let totalCharged: number;
    if (uncappedFee > 2000) {
      totalCharged = baseAmount + 2000;
    } else if (uncappedTotal < 2500) {
      totalCharged = Math.ceil(baseAmount / 0.985);
    } else {
      totalCharged = Math.ceil(uncappedTotal);
    }

    return {
      baseAmount,
      paystackFee: totalCharged - baseAmount,
      totalCharged,
    };
  }

  /**
   * Recipient absorbs the Paystack fee out of the flat total.
   * Used for school-invoice payments: school pays `totalCharged` exactly
   * (= invoice.totalAmount); Schos nets `recipientReceives` after Paystack's cut.
   */
  calculatePaystackBreakdownInclusive(totalCharged: number): PaystackBreakdownInclusive {
    const paystackFee = this.computePaystackFee(totalCharged);
    return {
      totalCharged,
      paystackFee,
      recipientReceives: totalCharged - paystackFee,
    };
  }
}
