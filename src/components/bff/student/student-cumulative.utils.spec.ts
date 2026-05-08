import {
  computeSubjectCumulative,
  PriorBySubjectByTerm,
} from './student-cumulative.utils';

describe('computeSubjectCumulative', () => {
  const MATH = 'subj-math';
  const FRENCH = 'subj-french';

  const T1 = 'term-1';
  const T2 = 'term-2';

  it('Term 1 (no prior terms): cumulative equals current term', () => {
    const prior: PriorBySubjectByTerm = new Map();
    const result = computeSubjectCumulative(MATH, 80, [], prior);
    expect(result).toEqual({
      cumulativeTotal: 80,
      cumulativeAverage: 80,
      termsAttempted: 1,
    });
  });

  it('Term 2: subject attempted in Term 1, divisor=2', () => {
    const prior: PriorBySubjectByTerm = new Map([[T1, new Map([[MATH, 70]])]]);
    const result = computeSubjectCumulative(MATH, 80, [T1], prior);
    expect(result).toEqual({
      cumulativeTotal: 150,
      cumulativeAverage: 75,
      termsAttempted: 2,
    });
  });

  it('Term 2: subject NOT attempted in Term 1, divisor=1 (current term only)', () => {
    // French was newly picked up — should not be averaged against a phantom 0.
    const prior: PriorBySubjectByTerm = new Map([[T1, new Map([[MATH, 70]])]]);
    const result = computeSubjectCumulative(FRENCH, 60, [T1], prior);
    expect(result).toEqual({
      cumulativeTotal: 60,
      cumulativeAverage: 60,
      termsAttempted: 1,
    });
  });

  it('Term 3: subject attempted in both prior terms, divisor=3', () => {
    const prior: PriorBySubjectByTerm = new Map([
      [T1, new Map([[MATH, 70]])],
      [T2, new Map([[MATH, 75]])],
    ]);
    const result = computeSubjectCumulative(MATH, 80, [T1, T2], prior);
    // (70 + 75 + 80) / 3 = 75
    expect(result).toEqual({
      cumulativeTotal: 225,
      cumulativeAverage: 75,
      termsAttempted: 3,
    });
  });

  it('Term 3: subject attempted only in Term 2 + current, divisor=2', () => {
    const prior: PriorBySubjectByTerm = new Map([
      [T1, new Map([[MATH, 70]])], // French not attempted in T1
      [T2, new Map([[FRENCH, 50]])],
    ]);
    const result = computeSubjectCumulative(FRENCH, 60, [T1, T2], prior);
    // (50 + 60) / 2 = 55 — Term 1 absence does not pull down the average
    expect(result).toEqual({
      cumulativeTotal: 110,
      cumulativeAverage: 55,
      termsAttempted: 2,
    });
  });

  it('Term 3: prior term with explicit zero score still counts as attempted', () => {
    // A student who took the test and got 0 IS distinct from "not attempted".
    const prior: PriorBySubjectByTerm = new Map([
      [T1, new Map([[MATH, 0]])],
      [T2, new Map([[MATH, 50]])],
    ]);
    const result = computeSubjectCumulative(MATH, 70, [T1, T2], prior);
    // (0 + 50 + 70) / 3 = 40
    expect(result).toEqual({
      cumulativeTotal: 120,
      cumulativeAverage: 40,
      termsAttempted: 3,
    });
  });

  it('rounds cumulative average to 2 decimal places', () => {
    const prior: PriorBySubjectByTerm = new Map([[T1, new Map([[MATH, 70]])]]);
    const result = computeSubjectCumulative(MATH, 71, [T1], prior);
    // (70 + 71) / 2 = 70.5 — exact, but verifies rounding pass-through
    expect(result.cumulativeAverage).toBe(70.5);

    const odd = computeSubjectCumulative(
      MATH,
      33,
      [T1, T2],
      new Map([
        [T1, new Map([[MATH, 33]])],
        [T2, new Map([[MATH, 33]])],
      ]),
    );
    // 99 / 3 = 33 exactly
    expect(odd.cumulativeAverage).toBe(33);

    const odd2 = computeSubjectCumulative(
      MATH,
      34,
      [T1, T2],
      new Map([
        [T1, new Map([[MATH, 33]])],
        [T2, new Map([[MATH, 33]])],
      ]),
    );
    // 100 / 3 = 33.333... → 33.33
    expect(odd2.cumulativeAverage).toBe(33.33);
  });
});
