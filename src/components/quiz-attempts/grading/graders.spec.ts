import { QuestionType } from '@prisma/client';

import { gradeResponse } from './graders';

describe('gradeResponse', () => {
  it('matches short-answer accepted answers saved with math delimiters', () => {
    expect(
      gradeResponse(
        { text: 'x = -1' },
        {
          type: QuestionType.SHORT_ANSWER,
          options: [],
          config: {
            acceptedAnswers: ['$x = -1$', 'x = -2', '-1 and -2'],
            caseSensitive: false,
            normalizeWhitespace: true,
          },
          partialCreditMode: null,
        },
      ),
    ).toBe(1);
  });
});
