import { PartialCreditMode, QuestionType } from '@prisma/client';

export interface GraderQuestionContext {
  type: QuestionType;
  options: { id: string; isCorrect: boolean }[];
  config: Record<string, unknown> | null;
  partialCreditMode: PartialCreditMode | null;
}

/**
 * Returns a fraction in [0, 1]. Multiplied by the question's snapshot weight
 * to yield pointsAwarded. Returns 0 for malformed responses (no exception)
 * so a single bad response can't poison the whole attempt.
 */
export function gradeResponse(
  response: unknown,
  question: GraderQuestionContext,
): number {
  if (response == null || typeof response !== 'object') return 0;
  const r = response as Record<string, unknown>;

  switch (question.type) {
    case QuestionType.MCQ_SINGLE: {
      const selected = r.selectedOptionId;
      if (typeof selected !== 'string') return 0;
      const correct = question.options.find((o) => o.isCorrect);
      return correct && correct.id === selected ? 1 : 0;
    }
    case QuestionType.MCQ_MULTI: {
      const selectedIds = Array.isArray(r.selectedOptionIds)
        ? (r.selectedOptionIds as unknown[]).filter((s): s is string => typeof s === 'string')
        : null;
      if (!selectedIds) return 0;
      const correctSet = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
      const totalCorrect = correctSet.size;
      if (totalCorrect === 0) return 0;

      const correctSelected = selectedIds.filter((id) => correctSet.has(id)).length;
      const incorrectSelected = selectedIds.filter((id) => !correctSet.has(id)).length;

      if (question.partialCreditMode === PartialCreditMode.PROPORTIONAL) {
        const fraction = (correctSelected - incorrectSelected) / totalCorrect;
        return Math.max(0, Math.min(1, fraction));
      }
      // all-or-nothing
      const allCorrectChosen = correctSelected === totalCorrect;
      const noneIncorrectChosen = incorrectSelected === 0;
      return allCorrectChosen && noneIncorrectChosen ? 1 : 0;
    }
    case QuestionType.TRUE_FALSE: {
      const cfg = question.config as { correctAnswer?: boolean } | null;
      if (!cfg || typeof cfg.correctAnswer !== 'boolean') return 0;
      const value = r.value;
      if (typeof value !== 'boolean') return 0;
      return value === cfg.correctAnswer ? 1 : 0;
    }
    case QuestionType.NUMERIC: {
      const cfg = question.config as
        | {
            correctAnswer?: number;
            tolerance?: number;
            unit?: string;
            toleranceMode?: 'ABSOLUTE' | 'PERCENT';
          }
        | null;
      if (
        !cfg ||
        typeof cfg.correctAnswer !== 'number' ||
        typeof cfg.tolerance !== 'number' ||
        cfg.tolerance < 0
      ) {
        return 0;
      }
      const value = r.value;
      if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
      if (cfg.unit && r.unit !== cfg.unit) return 0;

      const diff = Math.abs(value - cfg.correctAnswer);
      const allowed =
        cfg.toleranceMode === 'PERCENT'
          ? Math.abs(cfg.correctAnswer) * (cfg.tolerance / 100)
          : cfg.tolerance;
      return diff <= allowed ? 1 : 0;
    }
    case QuestionType.SHORT_ANSWER: {
      const cfg = question.config as
        | {
            acceptedAnswers?: string[];
            caseSensitive?: boolean;
            normalizeWhitespace?: boolean;
          }
        | null;
      if (!cfg || !Array.isArray(cfg.acceptedAnswers) || cfg.acceptedAnswers.length === 0) {
        return 0;
      }
      const text = r.text;
      if (typeof text !== 'string') return 0;

      const normalize = (s: string) => {
        let n = s;
        if (cfg.normalizeWhitespace !== false) n = n.trim().replace(/\s+/g, ' ');
        if (!cfg.caseSensitive) n = n.toLowerCase();
        return n;
      };
      const target = normalize(text);
      return cfg.acceptedAnswers.some((a) => normalize(a) === target) ? 1 : 0;
    }
    default:
      return 0;
  }
}
