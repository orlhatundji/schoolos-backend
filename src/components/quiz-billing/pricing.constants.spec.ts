import {
  BETA_UNTIL,
  FREE_TRIAL_DAYS,
  computeChargeableUnits,
  durationTier,
  freeUntil,
  questionTier,
  resolveWaiver,
} from './pricing.constants';

describe('pricing.constants', () => {
  describe('durationTier', () => {
    it.each<[number, number]>([
      [1, 1.0],
      [30, 1.0],
      [31, 1.5],
      [60, 1.5],
      [61, 2.0],
      [180, 2.0],
    ])('durationTier(%i) === %p', (mins, expected) => {
      expect(durationTier(mins)).toBe(expected);
    });
  });

  describe('questionTier', () => {
    it.each<[number, number]>([
      [1, 1.0],
      [10, 1.0],
      [11, 1.25],
      [25, 1.25],
      [26, 1.5],
      [200, 1.5],
    ])('questionTier(%i) === %p', (count, expected) => {
      expect(questionTier(count)).toBe(expected);
    });
  });

  describe('computeChargeableUnits', () => {
    it('multiplies duration tier by question tier', () => {
      expect(computeChargeableUnits(45, 20)).toBeCloseTo(1.875);
      expect(computeChargeableUnits(15, 5)).toBeCloseTo(1.0);
      expect(computeChargeableUnits(120, 50)).toBeCloseTo(3.0);
    });
  });

  describe('resolveWaiver', () => {
    const day = 86_400_000;
    const beforeBeta = new Date(BETA_UNTIL.getTime() - 7 * day);
    const afterBeta = new Date(BETA_UNTIL.getTime() + 7 * day);

    it('returns BETA when now is before BETA_UNTIL, regardless of school age', () => {
      const oldSchool = new Date(beforeBeta.getTime() - 5 * 365 * day);
      const result = resolveWaiver(oldSchool, beforeBeta);
      expect(result).toEqual({ isWaived: true, reason: 'BETA' });
    });

    it('returns FIRST_YEAR when past Beta but school is younger than FREE_TRIAL_DAYS', () => {
      const youngSchool = new Date(afterBeta.getTime() - 30 * day);
      const result = resolveWaiver(youngSchool, afterBeta);
      expect(result).toEqual({ isWaived: true, reason: 'FIRST_YEAR' });
    });

    it('returns no waiver when past Beta and school is older than FREE_TRIAL_DAYS', () => {
      const oldSchool = new Date(afterBeta.getTime() - (FREE_TRIAL_DAYS + 30) * day);
      const result = resolveWaiver(oldSchool, afterBeta);
      expect(result).toEqual({ isWaived: false, reason: null });
    });

    it('treats the FIRST_YEAR boundary inclusively at the start, exclusively at the end', () => {
      const exactlyTrialEnd = new Date(afterBeta.getTime() - FREE_TRIAL_DAYS * day);
      // school is exactly FREE_TRIAL_DAYS old at `afterBeta` — trial just ended
      expect(resolveWaiver(exactlyTrialEnd, afterBeta)).toEqual({
        isWaived: false,
        reason: null,
      });
    });
  });

  describe('freeUntil', () => {
    const day = 86_400_000;

    it('returns BETA_UNTIL when it is later than school+365d (school created well before Beta ends)', () => {
      // school created (FREE_TRIAL_DAYS + 30) days before BETA_UNTIL
      // → trialEnd = BETA_UNTIL - 30d, which is earlier than BETA_UNTIL
      const oldSchool = new Date(BETA_UNTIL.getTime() - (FREE_TRIAL_DAYS + 30) * day);
      const fu = freeUntil(oldSchool);
      expect(fu.date.getTime()).toBe(BETA_UNTIL.getTime());
    });

    it('returns school+365d when it is later than BETA_UNTIL (school created near or after Beta)', () => {
      // school created 30d before BETA_UNTIL → trialEnd = BETA_UNTIL + 335d, which beats BETA_UNTIL
      const youngSchool = new Date(BETA_UNTIL.getTime() - 30 * day);
      const fu = freeUntil(youngSchool);
      const trialEnd = new Date(youngSchool.getTime() + FREE_TRIAL_DAYS * day);
      expect(fu.date.getTime()).toBe(trialEnd.getTime());
    });
  });
});
