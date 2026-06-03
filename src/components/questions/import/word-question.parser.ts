import { Injectable } from '@nestjs/common';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '@prisma/client';

import { CreateQuestionDto, QuestionOptionDto } from '../dto';
import { DocxArchive } from './docx-archive';

const UNSUPPORTED_EQUATION_MARKER = '[[UNSUPPORTED_WORD_EQUATION]]';

export interface ParsedWordQuestion {
  questionNumber: number;
  dto: CreateQuestionDto;
}

export interface WordQuestionImportError {
  questionNumber: number;
  field: string;
  message: string;
  value?: string | null;
}

interface RawQuestionBlock {
  questionNumber: number;
  promptLines: string[];
  options: { key: string; text: string; markedCorrect: boolean }[];
  fields: Record<string, string>;
}

@Injectable()
export class WordQuestionParser {
  parse(file: Express.Multer.File): { questions: ParsedWordQuestion[]; errors: WordQuestionImportError[] } {
    const archive = DocxArchive.read(file.buffer);
    const documentXml = archive.get('word/document.xml')?.toString('utf8');
    if (!documentXml) {
      return {
        questions: [],
        errors: [{ questionNumber: 0, field: 'file', message: 'Word document body not found' }],
      };
    }

    const errors: WordQuestionImportError[] = [];
    if ([...archive.keys()].some((name) => name.startsWith('word/media/'))) {
      errors.push({
        questionNumber: 0,
        field: 'file',
        message: 'Embedded images are not supported in Word question imports yet',
      });
    }

    const lines = this.extractLines(documentXml);
    const blocks = this.toBlocks(lines, errors);
    const questions: ParsedWordQuestion[] = [];

    for (const block of blocks) {
      const result = this.toQuestion(block);
      if ('error' in result) {
        errors.push(...result.error);
      } else {
        questions.push(result.question);
      }
    }

    if (questions.length === 0 && errors.length === 0) {
      errors.push({
        questionNumber: 0,
        field: 'file',
        message: 'No questions found. Start each question with Q1., Q2., etc.',
      });
    }

    return { questions, errors };
  }

  private extractLines(documentXml: string): string[] {
    const paragraphs = documentXml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];
    return paragraphs
      .map((paragraph) => this.paragraphToText(paragraph).trim())
      .filter((line) => line.length > 0);
  }

  private paragraphToText(paragraphXml: string): string {
    const parts: string[] = [];
    const tokenRegex =
      /<m:oMathPara[\s\S]*?<\/m:oMathPara>|<m:oMath[\s\S]*?<\/m:oMath>|<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(paragraphXml))) {
      const token = match[0];
      if (token.startsWith('<w:t')) {
        parts.push(decodeXml(match[1] ?? ''));
      } else if (token.startsWith('<w:tab')) {
        parts.push('\t');
      } else if (token.startsWith('<w:br')) {
        parts.push('\n');
      } else {
        const latex = this.ommlToLatex(token);
        parts.push(latex ? `$${latex}$` : UNSUPPORTED_EQUATION_MARKER);
      }
    }

    return parts.join('');
  }

  private toBlocks(lines: string[], errors: WordQuestionImportError[]): RawQuestionBlock[] {
    const blocks: RawQuestionBlock[] = [];
    let current: RawQuestionBlock | null = null;

    for (const line of lines) {
      const questionMatch = line.match(/^Q(\d+)[.)]\s*(.+)$/i);
      if (questionMatch) {
        current = {
          questionNumber: Number(questionMatch[1]),
          promptLines: [questionMatch[2].trim()],
          options: [],
          fields: {},
        };
        blocks.push(current);
        continue;
      }

      if (!current) {
        continue;
      }

      const optionMatch = line.match(/^([A-J])[.)]\s*(.+)$/i);
      if (optionMatch) {
        const rawText = optionMatch[2].trim();
        const markedCorrect = /\*$/.test(rawText);
        current.options.push({
          key: optionMatch[1].toUpperCase(),
          text: markedCorrect ? rawText.replace(/\*$/, '').trim() : rawText,
          markedCorrect,
        });
        continue;
      }

      const fieldMatch = line.match(/^([A-Za-z][A-Za-z\s]*):\s*(.*)$/);
      if (fieldMatch) {
        current.fields[normalizeFieldName(fieldMatch[1])] = fieldMatch[2].trim();
        continue;
      }

      current.promptLines.push(line);
    }

    return blocks;
  }

  private toQuestion(
    block: RawQuestionBlock,
  ): { question: ParsedWordQuestion } | { error: WordQuestionImportError[] } {
    const errors: WordQuestionImportError[] = [];
    const promptPlainText = block.promptLines.join('\n').trim();
    const type = this.resolveType(block, errors);
    const answer = block.fields.answer;
    const explanation = block.fields.explanation;

    if (!promptPlainText) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'prompt',
        message: 'Question prompt is required',
      });
    }
    if (promptPlainText.includes(UNSUPPORTED_EQUATION_MARKER)) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'prompt',
        message: 'Unsupported Word equation; retype as LaTeX or simplify the equation',
      });
    }
    if (explanation?.includes(UNSUPPORTED_EQUATION_MARKER)) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Explanation',
        message: 'Unsupported Word equation; retype as LaTeX or simplify the equation',
      });
    }
    if (!type) return { error: errors };

    const difficulty = this.parseDifficulty(block, errors);
    const weight = this.parseNumberField(block, 'weight', errors, false);
    const options = this.buildOptions(block, type, answer, errors);
    const config = this.buildConfig(block, type, answer, errors);

    if (errors.length > 0) return { error: errors };

    const dto: CreateQuestionDto = {
      type,
      prompt: toTipTap(promptPlainText),
      promptPlainText: toPlainText(promptPlainText),
      status: QuestionStatus.PUBLISHED,
      ...(explanation && { explanation: toTipTap(explanation) }),
      ...(weight !== undefined && { weight }),
      ...(difficulty && { difficulty }),
      ...(options.length > 0 && { options }),
      ...(config && { config }),
    };

    return { question: { questionNumber: block.questionNumber, dto } };
  }

  private resolveType(block: RawQuestionBlock, errors: WordQuestionImportError[]) {
    const raw = block.fields.type;
    if (!raw) {
      if (block.options.length > 0) return QuestionType.MCQ_SINGLE;
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Type',
        message: 'Type is required when the question has no MCQ options',
      });
      return undefined;
    }
    const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_');
    if (Object.values(QuestionType).includes(normalized as QuestionType)) {
      return normalized as QuestionType;
    }
    errors.push({
      questionNumber: block.questionNumber,
      field: 'Type',
      message: `Unsupported question type "${raw}"`,
      value: raw,
    });
    return undefined;
  }

  private parseDifficulty(block: RawQuestionBlock, errors: WordQuestionImportError[]) {
    const raw = block.fields.difficulty;
    if (!raw) return undefined;
    const normalized = raw.toUpperCase();
    if (Object.values(QuestionDifficulty).includes(normalized as QuestionDifficulty)) {
      return normalized as QuestionDifficulty;
    }
    errors.push({
      questionNumber: block.questionNumber,
      field: 'Difficulty',
      message: `Unsupported difficulty "${raw}"`,
      value: raw,
    });
    return undefined;
  }

  private parseNumberField(
    block: RawQuestionBlock,
    field: string,
    errors: WordQuestionImportError[],
    required: boolean,
  ) {
    const raw = block.fields[field];
    if (!raw) {
      if (required) {
        errors.push({
          questionNumber: block.questionNumber,
          field,
          message: `${field} is required`,
        });
      }
      return undefined;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      errors.push({
        questionNumber: block.questionNumber,
        field,
        message: `${field} must be a number`,
        value: raw,
      });
      return undefined;
    }
    return value;
  }

  private buildOptions(
    block: RawQuestionBlock,
    type: QuestionType,
    answer: string | undefined,
    errors: WordQuestionImportError[],
  ): QuestionOptionDto[] {
    if (type !== QuestionType.MCQ_SINGLE && type !== QuestionType.MCQ_MULTI) {
      if (block.options.length > 0) {
        errors.push({
          questionNumber: block.questionNumber,
          field: 'options',
          message: `${type} questions must not include A., B., C. options`,
        });
      }
      return [];
    }

    if (block.options.length < 2) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'options',
        message: `${type} requires at least two options`,
      });
      return [];
    }

    const unsupportedEquationOption = block.options.find((option) =>
      option.text.includes(UNSUPPORTED_EQUATION_MARKER),
    );
    if (unsupportedEquationOption) {
      errors.push({
        questionNumber: block.questionNumber,
        field: `Option ${unsupportedEquationOption.key}`,
        message: 'Unsupported Word equation; retype as LaTeX or simplify the equation',
      });
      return [];
    }

    const duplicate = findDuplicate(block.options.map((o) => o.key));
    if (duplicate) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'options',
        message: `Duplicate option label "${duplicate}"`,
        value: duplicate,
      });
      return [];
    }

    const answerKeys = answer
      ? answer
          .split(',')
          .map((part) => part.trim().toUpperCase())
          .filter(Boolean)
      : block.options.filter((option) => option.markedCorrect).map((option) => option.key);

    if (answer && block.options.some((option) => option.markedCorrect)) {
      const marked = block.options.filter((option) => option.markedCorrect).map((option) => option.key);
      if (marked.sort().join(',') !== [...answerKeys].sort().join(',')) {
        errors.push({
          questionNumber: block.questionNumber,
          field: 'Answer',
          message: 'Answer line conflicts with * markers. Remove * markers or make them match Answer.',
          value: answer,
        });
      }
    }

    if (answerKeys.length === 0) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Answer',
        message: `${type} requires Answer: ${type === QuestionType.MCQ_MULTI ? 'A, C' : 'B'}`,
      });
    }
    if (type === QuestionType.MCQ_SINGLE && answerKeys.length !== 1) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Answer',
        message: 'MCQ_SINGLE must have exactly one correct option',
        value: answer,
      });
    }

    const validOptionKeys = new Set(block.options.map((option) => option.key));
    const invalidAnswer = answerKeys.find((key) => !validOptionKeys.has(key));
    if (invalidAnswer) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Answer',
        message: `Answer references missing option "${invalidAnswer}"`,
        value: answer,
      });
    }

    return block.options.map((option, index) => ({
      order: index,
      label: toTipTap(option.text),
      labelPlainText: toPlainText(option.text),
      isCorrect: answerKeys.includes(option.key),
    }));
  }

  private buildConfig(
    block: RawQuestionBlock,
    type: QuestionType,
    answer: string | undefined,
    errors: WordQuestionImportError[],
  ): Record<string, unknown> | undefined {
    if (type === QuestionType.MCQ_SINGLE || type === QuestionType.MCQ_MULTI) return undefined;
    if (!answer) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Answer',
        message: `${type} requires an Answer line`,
      });
      return undefined;
    }
    if (answer.includes(UNSUPPORTED_EQUATION_MARKER)) {
      errors.push({
        questionNumber: block.questionNumber,
        field: 'Answer',
        message: 'Unsupported Word equation; retype as LaTeX or simplify the equation',
      });
      return undefined;
    }

    switch (type) {
      case QuestionType.TRUE_FALSE: {
        const normalized = answer.toLowerCase();
        if (!['true', 'false'].includes(normalized)) {
          errors.push({
            questionNumber: block.questionNumber,
            field: 'Answer',
            message: 'TRUE_FALSE answer must be True or False',
            value: answer,
          });
          return undefined;
        }
        return { correctAnswer: normalized === 'true' };
      }
      case QuestionType.NUMERIC: {
        const correctAnswer = Number(answer);
        if (!Number.isFinite(correctAnswer)) {
          errors.push({
            questionNumber: block.questionNumber,
            field: 'Answer',
            message: 'NUMERIC answer must be a number',
            value: answer,
          });
        }
        const tolerance = this.parseNumberField(block, 'tolerance', errors, true);
        const toleranceMode = (block.fields.tolerancemode ?? '').toUpperCase();
        if (toleranceMode !== 'ABSOLUTE' && toleranceMode !== 'PERCENT') {
          errors.push({
            questionNumber: block.questionNumber,
            field: 'Tolerance Mode',
            message: 'Tolerance Mode must be ABSOLUTE or PERCENT',
            value: block.fields.tolerancemode,
          });
        }
        return {
          correctAnswer,
          tolerance,
          toleranceMode,
        };
      }
      case QuestionType.SHORT_ANSWER:
        return {
          acceptedAnswers: answer
            .split(';')
            .map((part) => stripMathDelimiters(part.trim()))
            .filter(Boolean),
          caseSensitive: parseBoolean(block.fields.casesensitive, false),
          normalizeWhitespace: parseBoolean(block.fields.normalizewhitespace, true),
        };
      case QuestionType.THEORY:
        return { modelAnswer: answer };
      default:
        return undefined;
    }
  }

  private ommlToLatex(omml: string): string {
    const math = omml.replace(/<m:oMathPara[^>]*>|<\/m:oMathPara>|<m:oMath[^>]*>|<\/m:oMath>/g, '');
    return convertOmmlFragment(math)
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function convertOmmlFragment(xml: string): string {
  const fraction = xml.match(/<m:f[^>]*>[\s\S]*?<m:num>([\s\S]*?)<\/m:num>[\s\S]*?<m:den>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/);
  if (fraction) {
    return `\\frac{${convertOmmlFragment(fraction[1])}}{${convertOmmlFragment(fraction[2])}}`;
  }

  const sup = xml.match(/<m:sSup[^>]*>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/);
  if (sup) {
    return `${convertOmmlFragment(sup[1])}^{${convertOmmlFragment(sup[2])}}`;
  }

  const sub = xml.match(/<m:sSub[^>]*>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/);
  if (sub) {
    return `${convertOmmlFragment(sub[1])}_{${convertOmmlFragment(sub[2])}}`;
  }

  const radical = xml.match(/<m:rad[^>]*>[\s\S]*?<m:e>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/);
  if (radical) {
    return `\\sqrt{${convertOmmlFragment(radical[1])}}`;
  }

  const rows = [...xml.matchAll(/<m:mr>([\s\S]*?)<\/m:mr>/g)];
  if (rows.length > 0) {
    const body = rows
      .map((row) =>
        [...row[1].matchAll(/<m:e>([\s\S]*?)<\/m:e>/g)]
          .map((cell) => convertOmmlFragment(cell[1]))
          .join(' & '),
      )
      .join(' \\\\ ');
    return `\\begin{pmatrix} ${body} \\end{pmatrix}`;
  }

  const text = [...xml.matchAll(/<m:t[^>]*>([\s\S]*?)<\/m:t>/g)]
    .map((match) => decodeXml(match[1]))
    .join('');
  if (text) return normalizeMathText(text);

  const wordText = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXml(match[1]))
    .join('');
  return wordText ? normalizeMathText(wordText) : '';
}

function normalizeMathText(value: string) {
  return value
    .replace(/±/g, '\\pm ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/π/g, '\\pi ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/∞/g, '\\infty ');
}

function toTipTap(value: string) {
  const content: unknown[] = [];
  const mathRegex = /\$(.+?)\$/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(value))) {
    if (match.index > cursor) {
      content.push({ type: 'text', text: value.slice(cursor, match.index) });
    }
    content.push({ type: 'math_inline', attrs: { latex: match[1] } });
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    content.push({ type: 'text', text: value.slice(cursor) });
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: content.length > 0 ? content : [{ type: 'text', text: value }],
      },
    ],
  };
}

function toPlainText(value: string) {
  return value.replace(/\$(.+?)\$/g, '$1');
}

function stripMathDelimiters(value: string) {
  return value.replace(/\$(.+?)\$/g, '$1');
}

function normalizeFieldName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function findDuplicate(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
