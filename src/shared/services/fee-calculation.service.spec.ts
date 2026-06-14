import { FeeCalculationService } from './fee-calculation.service';

describe('FeeCalculationService', () => {
  let service: FeeCalculationService;

  beforeEach(() => {
    service = new FeeCalculationService();
  });

  describe('computePaystackFee', () => {
    it('charges 1.5% only under ₦2,500', () => {
      expect(service.computePaystackFee(1000)).toBe(15);
      expect(service.computePaystackFee(2499)).toBe(38);
    });

    it('charges 1.5% + ₦100 from ₦2,500 up', () => {
      expect(service.computePaystackFee(2500)).toBe(138);
      expect(service.computePaystackFee(50_000)).toBe(850);
    });

    it('caps at ₦2,000', () => {
      expect(service.computePaystackFee(200_000)).toBe(2000);
      expect(service.computePaystackFee(1_000_000)).toBe(2000);
    });
  });

  describe('calculatePaystackBreakdownAdditive', () => {
    it('returns a breakdown where totalCharged = baseAmount + paystackFee', () => {
      const b = service.calculatePaystackBreakdownAdditive(50_000);
      expect(b.baseAmount).toBe(50_000);
      expect(b.totalCharged).toBe(b.baseAmount + b.paystackFee);
      expect(b.paystackFee).toBeGreaterThan(0);
    });

    it('applies the ₦2,000 cap for large amounts', () => {
      const b = service.calculatePaystackBreakdownAdditive(200_000);
      expect(b.paystackFee).toBe(2000);
      expect(b.totalCharged).toBe(202_000);
    });

    it('omits the ₦100 flat fee for amounts that resolve below ₦2,500', () => {
      const b = service.calculatePaystackBreakdownAdditive(1000);
      expect(b.totalCharged).toBeLessThan(2500);
      expect(b.totalCharged).toBe(b.baseAmount + b.paystackFee);
    });
  });

  describe('calculatePaystackBreakdownInclusive', () => {
    it('subtracts Paystack fee from totalCharged so recipientReceives is the net', () => {
      const b = service.calculatePaystackBreakdownInclusive(50_000);
      expect(b.totalCharged).toBe(50_000);
      expect(b.paystackFee).toBe(850);
      expect(b.recipientReceives).toBe(49_150);
    });

    it('caps at ₦2,000', () => {
      const b = service.calculatePaystackBreakdownInclusive(200_000);
      expect(b.paystackFee).toBe(2000);
      expect(b.recipientReceives).toBe(198_000);
    });

    it('handles small (<₦2,500) amounts with no flat fee', () => {
      const b = service.calculatePaystackBreakdownInclusive(1000);
      expect(b.paystackFee).toBe(15);
      expect(b.recipientReceives).toBe(985);
    });
  });
});
