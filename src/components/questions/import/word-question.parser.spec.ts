import { QuestionType } from '@prisma/client';

import { DocxArchive } from './docx-archive';
import { QuestionWordTemplateService } from './question-word-template.service';
import { WordQuestionParser } from './word-question.parser';

describe('WordQuestionParser', () => {
  const parser = new WordQuestionParser();

  it('parses the official template examples for every question type', () => {
    const file = makeFile(new QuestionWordTemplateService().generateTemplate());

    const result = parser.parse(file);

    expect(result.errors).toEqual([]);
    expect(result.questions.map((q) => q.dto.type)).toEqual([
      QuestionType.MCQ_SINGLE,
      QuestionType.MCQ_MULTI,
      QuestionType.TRUE_FALSE,
      QuestionType.NUMERIC,
      QuestionType.SHORT_ANSWER,
      QuestionType.THEORY,
      QuestionType.SHORT_ANSWER,
    ]);
    expect(result.questions[0].dto.options?.find((o) => o.isCorrect)?.labelPlainText).toBe('4');
    expect(result.questions[1].dto.options?.filter((o) => o.isCorrect).map((o) => o.labelPlainText)).toEqual([
      '2',
      '3',
    ]);
    expect(result.questions[3].dto.config).toEqual({
      correctAnswer: 50,
      tolerance: 0,
      toleranceMode: 'ABSOLUTE',
    });
    expect(result.questions[6].dto.prompt).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Solve the equation ' },
            { type: 'math_inline', attrs: { latex: 'x^2 + 3x + 2 = 0' } },
            { type: 'text', text: '.' },
          ],
        },
      ],
    });
    expect(result.questions[6].dto.promptPlainText).toBe('Solve the equation x^2 + 3x + 2 = 0.');
    expect(result.questions[6].dto.config).toEqual({
      acceptedAnswers: ['x = -1', 'x = -2', '-1 and -2'],
      caseSensitive: false,
      normalizeWhitespace: true,
    });
  });

  it('returns question-level errors for missing answers', () => {
    const file = makeFile(
      makeDocx([
        'Q1. The earth revolves around the sun.',
        'Type: TRUE_FALSE',
        'Explanation: This question is missing Answer.',
      ]),
    );

    const result = parser.parse(file);

    expect(result.questions).toHaveLength(0);
    expect(result.errors).toEqual([
      expect.objectContaining({
        questionNumber: 1,
        field: 'Answer',
      }),
    ]);
  });

  it('flags embedded images as unsupported', () => {
    const file = makeFile(
      DocxArchive.create([
        ...docxEntries(['Q1. What is 2 + 2?', 'Type: MCQ_SINGLE', 'A. 3', 'B. 4', 'Answer: B']),
        { name: 'word/media/image1.png', data: Buffer.from('fake image') },
      ]),
    );

    const result = parser.parse(file);

    expect(result.errors).toEqual([
      expect.objectContaining({
        questionNumber: 0,
        field: 'file',
        message: expect.stringContaining('Embedded images'),
      }),
    ]);
  });

  it('preserves native Word equation nodes as inline math content', () => {
    const file = makeFile(
      makeDocxWithRawParagraphs([
        `<w:p><w:r><w:t>Q1. Solve </w:t></w:r><m:oMath><m:f><m:num><m:r><m:t>1</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath></w:p>`,
        paragraphXml('Type: SHORT_ANSWER'),
        paragraphXml('Answer: 0.5; 1/2'),
      ]),
    );

    const result = parser.parse(file);

    expect(result.errors).toEqual([]);
    expect(result.questions[0].dto.prompt).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Solve ' },
            { type: 'math_inline', attrs: { latex: '\\frac{1}{2}' } },
          ],
        },
      ],
    });
    expect(result.questions[0].dto.promptPlainText).toContain('\\frac{1}{2}');
  });

  it('preserves option equations as inline math content', () => {
    const file = makeFile(
      makeDocx([
        'Q1. Which expression equals four?',
        'Type: MCQ_SINGLE',
        'A. $2^2$',
        'B. $2^3$',
        'Answer: A',
      ]),
    );

    const result = parser.parse(file);

    expect(result.errors).toEqual([]);
    expect(result.questions[0].dto.options?.[0]).toEqual(
      expect.objectContaining({
        label: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'math_inline', attrs: { latex: '2^2' } }],
            },
          ],
        },
        labelPlainText: '2^2',
      }),
    );
    expect(result.questions[0].dto.options?.[1]).toEqual(
      expect.objectContaining({
        label: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'math_inline', attrs: { latex: '2^3' } }],
            },
          ],
        },
        labelPlainText: '2^3',
      }),
    );
  });

  it('stores short-answer equation answers as plain accepted-answer text', () => {
    const file = makeFile(
      makeDocx([
        'Q1. Solve the equation $x^2 + 3x + 2 = 0$.',
        'Type: SHORT_ANSWER',
        'Answer: $x = -1$; x = -2; -1 and -2',
      ]),
    );

    const result = parser.parse(file);

    expect(result.errors).toEqual([]);
    expect(result.questions[0].dto.config).toEqual({
      acceptedAnswers: ['x = -1', 'x = -2', '-1 and -2'],
      caseSensitive: false,
      normalizeWhitespace: true,
    });
  });
});

function makeFile(buffer: Buffer): Express.Multer.File {
  return {
    buffer,
    originalname: 'questions.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: buffer.length,
  } as Express.Multer.File;
}

function makeDocx(lines: string[]) {
  return DocxArchive.create(docxEntries(lines));
}

function makeDocxWithRawParagraphs(paragraphs: string[]) {
  return DocxArchive.create(baseDocxEntries(paragraphs.join('\n')));
}

function docxEntries(lines: string[]) {
  return baseDocxEntries(lines.map((line) => paragraphXml(line)).join('\n'));
}

function baseDocxEntries(body: string) {
  return [
    { name: '[Content_Types].xml', data: Buffer.from('<Types/>') },
    { name: '_rels/.rels', data: Buffer.from('<Relationships/>') },
    {
      name: 'word/document.xml',
      data: Buffer.from(
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body>${body}</w:body></w:document>`,
      ),
    },
  ];
}

function paragraphXml(text: string) {
  return `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
