import { QuestionType } from '@prisma/client';

import { normalizeQuestionConfig, normalizeTipTapMath } from './question.result';

describe('normalizeTipTapMath', () => {
  it('normalizes legacy and raw math shapes to frontend math_inline nodes', () => {
    const value = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Solve $x^2 + 3x + 2 = 0$.' },
            { type: 'inlineMath', attrs: { latex: 'a^2 + b^2 = c^2' } },
            { type: 'mathInline', attrs: { latex: '\\frac{1}{2}' } },
          ],
        },
      ],
    };

    expect(normalizeTipTapMath(value)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Solve ' },
            { type: 'math_inline', attrs: { latex: 'x^2 + 3x + 2 = 0' } },
            { type: 'text', text: '.' },
            { type: 'math_inline', attrs: { latex: 'a^2 + b^2 = c^2' } },
            { type: 'math_inline', attrs: { latex: '\\frac{1}{2}' } },
          ],
        },
      ],
    });
  });

  it('normalizes raw option-label math documents too', () => {
    expect(
      normalizeTipTapMath({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '$2^2$' }],
          },
        ],
      }),
    ).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'math_inline', attrs: { latex: '2^2' } }],
        },
      ],
    });
  });
});

describe('normalizeQuestionConfig', () => {
  it('strips math delimiters from short-answer accepted answers', () => {
    expect(
      normalizeQuestionConfig(QuestionType.SHORT_ANSWER, {
        acceptedAnswers: ['$x = -1$', 'x = -2', '-1 and -2'],
        caseSensitive: false,
        normalizeWhitespace: true,
      }),
    ).toEqual({
      acceptedAnswers: ['x = -1', 'x = -2', '-1 and -2'],
      caseSensitive: false,
      normalizeWhitespace: true,
    });
  });
});
