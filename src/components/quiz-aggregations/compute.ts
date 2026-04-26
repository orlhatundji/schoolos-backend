import { AggregationMethod, MissingAttemptPolicy } from '@prisma/client';

export interface ItemAttemptInput {
  /** Item weight (used by WEIGHTED). */
  weight: number;
  /**
   * The student's GRADED attempt for this item, or null if missing.
   * percentage is in [0, 100]; totalScore / maxScore are decimal numbers.
   */
  attempt: {
    percentage: number;
    totalScore: number;
    maxScore: number;
  } | null;
}

export interface PerItemBreakdown {
  weight: number;
  percentage: number | null; // null when missing AND policy excludes
  missing: boolean;
  contributingPercentage: number; // what we actually used in the aggregation (0 if treat-as-zero, else percentage)
}

export interface ComputeResult {
  /** Aggregated percentage in [0, 100]. */
  computedPercentage: number;
  /** computedPercentage / 100 * rescaleToMaxScore, rounded to integer. */
  rescaledScore: number;
  /** Item-by-item breakdown for the preview UI. */
  items: PerItemBreakdown[];
}

/**
 * Pure aggregation. No DB. Easily unit-tested.
 *
 * Method semantics:
 * - AVERAGE   : equal-weighted mean of item percentages, rescaled
 * - WEIGHTED  : item.weight-weighted mean of percentages, rescaled
 * - SUM       : Σ totalScore / Σ maxScore, rescaled (mass-weighted by maxScore)
 * - BEST_OF_N : top N percentages averaged, rescaled. n is clamped to
 *               participating-item count.
 */
export function computeForStudent(
  items: ItemAttemptInput[],
  method: AggregationMethod,
  missingPolicy: MissingAttemptPolicy,
  rescaleToMaxScore: number,
  bestOfN?: number | null,
): ComputeResult {
  const breakdown: PerItemBreakdown[] = items.map((item) => {
    if (item.attempt) {
      return {
        weight: item.weight,
        percentage: item.attempt.percentage,
        missing: false,
        contributingPercentage: item.attempt.percentage,
      };
    }
    if (missingPolicy === MissingAttemptPolicy.TREAT_AS_ZERO) {
      return {
        weight: item.weight,
        percentage: 0,
        missing: true,
        contributingPercentage: 0,
      };
    }
    return {
      weight: item.weight,
      percentage: null,
      missing: true,
      contributingPercentage: 0,
    };
  });

  const participating = breakdown.filter(
    (b) => !b.missing || missingPolicy === MissingAttemptPolicy.TREAT_AS_ZERO,
  );
  if (participating.length === 0) {
    return { computedPercentage: 0, rescaledScore: 0, items: breakdown };
  }

  let computedPercentage = 0;

  switch (method) {
    case AggregationMethod.AVERAGE: {
      const sum = participating.reduce((a, b) => a + b.contributingPercentage, 0);
      computedPercentage = sum / participating.length;
      break;
    }
    case AggregationMethod.WEIGHTED: {
      const num = participating.reduce((a, b) => a + b.contributingPercentage * b.weight, 0);
      const den = participating.reduce((a, b) => a + b.weight, 0);
      computedPercentage = den > 0 ? num / den : 0;
      break;
    }
    case AggregationMethod.SUM: {
      // mass-weighted by maxScore: sum totalScores across participating items / sum maxScores
      let totalScore = 0;
      let totalMax = 0;
      for (const item of items) {
        if (item.attempt) {
          totalScore += item.attempt.totalScore;
          totalMax += item.attempt.maxScore;
        } else if (missingPolicy === MissingAttemptPolicy.TREAT_AS_ZERO) {
          totalMax += 1; // a maxScore of 0 would skew; treat missing as a 1-point miss
        }
      }
      computedPercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      break;
    }
    case AggregationMethod.BEST_OF_N: {
      const n = Math.max(1, Math.min(bestOfN ?? participating.length, participating.length));
      const sorted = [...participating].sort(
        (a, b) => b.contributingPercentage - a.contributingPercentage,
      );
      const top = sorted.slice(0, n);
      const sum = top.reduce((a, b) => a + b.contributingPercentage, 0);
      computedPercentage = sum / top.length;
      break;
    }
  }

  const rescaledScore = Math.round((computedPercentage / 100) * rescaleToMaxScore);
  return {
    computedPercentage: round2(computedPercentage),
    rescaledScore,
    items: breakdown,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
