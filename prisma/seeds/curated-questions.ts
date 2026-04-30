/**
 * Sample SCHOS_CURATED starter questions across subjects. Owned by the
 * platform (schoolId = null), authored by the bootstrap PLATFORM_ADMIN user.
 * Seeded as DRAFT status so platform staff can review + publish via the
 * curator UI before they appear in /questions/library for teachers.
 *
 * Idempotency: each row carries a stable `seedKey` (e.g. "math-quad-roots")
 * used to look up an existing curated question whose promptPlainText starts
 * with the seed-key marker line. Re-running the seed updates existing rows
 * (prompt body, options, weights) but never duplicates.
 *
 * LaTeX: math is embedded as TipTap MathInline nodes; raw `\\frac{...}` etc
 * is fine since it lives inside a JSON string (no shell escaping concerns).
 */

import {
  PartialCreditMode,
  Prisma,
  PrismaClient,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '@prisma/client';

import { SeedRunResult } from './types';

interface CuratedOption {
  text: string; // plain text, will be wrapped in TipTap JSON
  isCorrect: boolean;
}

interface CuratedQuestionSeed {
  seedKey: string;
  canonicalSubjectName: string;
  canonicalLevelCode: string;
  canonicalTermName?: string;
  type: QuestionType;
  prompt: string; // plain text — will be wrapped in TipTap JSON
  weight?: number;
  difficulty?: QuestionDifficulty;
  options?: CuratedOption[]; // for MCQ_*
  config?: Record<string, unknown>; // for NUMERIC / SHORT_ANSWER / TRUE_FALSE
  partialCreditMode?: PartialCreditMode;
}

// Helper: minimal TipTap JSON document with one paragraph.
function tipTapDoc(text: string): Prisma.InputJsonValue {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}

// First line of promptPlainText is a hidden anchor used for idempotent lookup.
// We strip it before display by storing the actual question on subsequent
// lines and treating the anchor as machine metadata only.
const ANCHOR_PREFIX = '[seed:';

function buildPromptPlainText(seedKey: string, prompt: string): string {
  return `${ANCHOR_PREFIX}${seedKey}]\n${prompt}`;
}

// Visible prompt text for promptPlainText is the prompt itself; the anchor
// lives in a separate metadata channel. After review we discovered Question
// has no metadata column — so we keep the anchor on the FIRST line of the
// promptPlainText (cheap), but the TipTap prompt JSON only contains the
// real prompt so users see clean text in the UI.
//
// Trade-off: search/filter against promptPlainText could match the anchor
// fragment. Mitigation: the anchor uses square brackets with a `seed:`
// prefix that's unlikely to appear in a normal question.

const QUESTIONS: CuratedQuestionSeed[] = [
  // ─── Mathematics ──────────────────────────────────────────────────────────
  {
    seedKey: 'math-quad-roots',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'What are the roots of x² − 5x + 6 = 0?',
    weight: 1,
    difficulty: 'EASY',
    options: [
      { text: '1 and 6', isCorrect: false },
      { text: '2 and 3', isCorrect: true },
      { text: '−2 and −3', isCorrect: false },
      { text: '5 and 6', isCorrect: false },
    ],
  },
  {
    seedKey: 'math-pyth',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: 'A right triangle has legs of length 3 and 4. What is the length of the hypotenuse?',
    difficulty: 'EASY',
    options: [
      { text: '5', isCorrect: true },
      { text: '6', isCorrect: false },
      { text: '7', isCorrect: false },
      { text: '12', isCorrect: false },
    ],
  },
  {
    seedKey: 'math-circle-area',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SSS1',
    type: 'NUMERIC',
    prompt: 'A circle has radius 7 cm. What is its area in cm² (use π ≈ 22/7)?',
    difficulty: 'EASY',
    config: { correctAnswer: 154, tolerance: 0.5, toleranceMode: 'ABSOLUTE', unit: 'cm²' },
  },
  {
    seedKey: 'math-derivative',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SSS3',
    type: 'MCQ_SINGLE',
    prompt: 'What is the derivative of f(x) = 3x² + 2x + 5?',
    difficulty: 'MEDIUM',
    options: [
      { text: '6x + 2', isCorrect: true },
      { text: '3x + 2', isCorrect: false },
      { text: '6x² + 2', isCorrect: false },
      { text: '6x', isCorrect: false },
    ],
  },
  {
    seedKey: 'math-mean',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SSS1',
    type: 'NUMERIC',
    prompt: 'Find the mean of 4, 8, 12, 16, 20.',
    difficulty: 'EASY',
    config: { correctAnswer: 12, tolerance: 0, toleranceMode: 'ABSOLUTE' },
  },
  {
    seedKey: 'math-trig-identity',
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SSS2',
    type: 'TRUE_FALSE',
    prompt: 'sin²(θ) + cos²(θ) = 1 holds for every real θ.',
    difficulty: 'EASY',
    config: { correctAnswer: true },
  },

  // ─── Physics ──────────────────────────────────────────────────────────────
  {
    seedKey: 'phys-newton-2nd',
    canonicalSubjectName: 'Physics',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'A 5 kg object accelerates at 4 m/s². What net force acts on it?',
    difficulty: 'EASY',
    options: [
      { text: '9 N', isCorrect: false },
      { text: '20 N', isCorrect: true },
      { text: '1.25 N', isCorrect: false },
      { text: '40 N', isCorrect: false },
    ],
  },
  {
    seedKey: 'phys-ohm',
    canonicalSubjectName: 'Physics',
    canonicalLevelCode: 'SSS3',
    type: 'NUMERIC',
    prompt: 'A 12 V battery drives a current of 0.5 A through a resistor. What is the resistance in ohms?',
    difficulty: 'EASY',
    config: { correctAnswer: 24, tolerance: 0, toleranceMode: 'ABSOLUTE', unit: 'Ω' },
  },
  {
    seedKey: 'phys-kinematic',
    canonicalSubjectName: 'Physics',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'A car starts from rest and accelerates uniformly at 2 m/s² for 5 seconds. How far has it travelled?',
    difficulty: 'MEDIUM',
    options: [
      { text: '10 m', isCorrect: false },
      { text: '25 m', isCorrect: true },
      { text: '50 m', isCorrect: false },
      { text: '5 m', isCorrect: false },
    ],
  },
  {
    seedKey: 'phys-kinetic-energy',
    canonicalSubjectName: 'Physics',
    canonicalLevelCode: 'SSS3',
    type: 'NUMERIC',
    prompt: 'A 2 kg ball moves at 3 m/s. What is its kinetic energy in joules?',
    difficulty: 'EASY',
    config: { correctAnswer: 9, tolerance: 0, toleranceMode: 'ABSOLUTE', unit: 'J' },
  },

  // ─── Chemistry ────────────────────────────────────────────────────────────
  {
    seedKey: 'chem-ph',
    canonicalSubjectName: 'Chemistry',
    canonicalLevelCode: 'SSS3',
    type: 'NUMERIC',
    prompt: 'What is the pH of a solution with [H⁺] = 1 × 10⁻⁴ M?',
    difficulty: 'EASY',
    config: { correctAnswer: 4, tolerance: 0, toleranceMode: 'ABSOLUTE' },
  },
  {
    seedKey: 'chem-mol',
    canonicalSubjectName: 'Chemistry',
    canonicalLevelCode: 'SSS2',
    type: 'NUMERIC',
    prompt: 'How many moles are in 18 g of water (molar mass 18 g/mol)?',
    difficulty: 'EASY',
    config: { correctAnswer: 1, tolerance: 0.01, toleranceMode: 'ABSOLUTE', unit: 'mol' },
  },
  {
    seedKey: 'chem-ideal-gas',
    canonicalSubjectName: 'Chemistry',
    canonicalLevelCode: 'SSS3',
    type: 'MCQ_SINGLE',
    prompt: 'Which equation correctly relates the pressure, volume, moles, and temperature of an ideal gas?',
    difficulty: 'EASY',
    options: [
      { text: 'P + V = nRT', isCorrect: false },
      { text: 'PV = nRT', isCorrect: true },
      { text: 'P/V = nRT', isCorrect: false },
      { text: 'V = nRT/P²', isCorrect: false },
    ],
  },
  {
    seedKey: 'chem-balance-1',
    canonicalSubjectName: 'Chemistry',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Balance: __ H₂ + __ O₂ → __ H₂O. The smallest set of whole-number coefficients is:',
    difficulty: 'EASY',
    options: [
      { text: '1, 1, 1', isCorrect: false },
      { text: '2, 1, 2', isCorrect: true },
      { text: '1, 2, 2', isCorrect: false },
      { text: '2, 2, 1', isCorrect: false },
    ],
  },

  // ─── Biology ──────────────────────────────────────────────────────────────
  {
    seedKey: 'bio-mitosis',
    canonicalSubjectName: 'Biology',
    canonicalLevelCode: 'SSS1',
    type: 'MCQ_SINGLE',
    prompt: 'Which phase of mitosis is characterized by chromosomes lining up at the cell equator?',
    difficulty: 'EASY',
    options: [
      { text: 'Prophase', isCorrect: false },
      { text: 'Metaphase', isCorrect: true },
      { text: 'Anaphase', isCorrect: false },
      { text: 'Telophase', isCorrect: false },
    ],
  },
  {
    seedKey: 'bio-photosynthesis',
    canonicalSubjectName: 'Biology',
    canonicalLevelCode: 'JSS3',
    type: 'SHORT_ANSWER',
    prompt: 'Name the green pigment in plants that absorbs light energy for photosynthesis.',
    difficulty: 'EASY',
    config: {
      acceptedAnswers: ['chlorophyll'],
      caseSensitive: false,
      normalizeWhitespace: true,
    },
  },

  // ─── English Language ─────────────────────────────────────────────────────
  // 20 questions, used together by the curated-quizzes seed to assemble the
  // "Generic English Language Quiz". Mix of vocabulary, grammar, concord,
  // voice, tense, punctuation, idiom and figurative-language items at JSS/SSS
  // level — WAEC/JAMB flavoured.
  {
    seedKey: 'eng-tense',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the sentence in correct past tense:',
    difficulty: 'EASY',
    options: [
      { text: 'She go to the market yesterday.', isCorrect: false },
      { text: 'She went to the market yesterday.', isCorrect: true },
      { text: 'She goes to the market yesterday.', isCorrect: false },
      { text: 'She gone to the market yesterday.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-synonym',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS1',
    type: 'MCQ_SINGLE',
    prompt: "Which word is closest in meaning to 'benevolent'?",
    difficulty: 'EASY',
    options: [
      { text: 'cruel', isCorrect: false },
      { text: 'kind', isCorrect: true },
      { text: 'lazy', isCorrect: false },
      { text: 'serious', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-antonym-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS1',
    type: 'MCQ_SINGLE',
    prompt: "Which word is the OPPOSITE of 'abundant'?",
    difficulty: 'EASY',
    options: [
      { text: 'plentiful', isCorrect: false },
      { text: 'scarce', isCorrect: true },
      { text: 'enormous', isCorrect: false },
      { text: 'common', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-concord-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the option that completes the sentence correctly: "The list of names ___ on the noticeboard."',
    difficulty: 'EASY',
    options: [
      { text: 'are', isCorrect: false },
      { text: 'is', isCorrect: true },
      { text: 'were', isCorrect: false },
      { text: 'have been', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-concord-2',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS1',
    type: 'MCQ_SINGLE',
    prompt: 'Pick the grammatically correct sentence:',
    difficulty: 'MEDIUM',
    options: [
      { text: 'Neither the captain nor the players was at the meeting.', isCorrect: false },
      { text: 'Neither the captain nor the players were at the meeting.', isCorrect: true },
      { text: 'Neither the captain nor the players is at the meeting.', isCorrect: false },
      { text: 'Neither the captain nor the players has been at the meeting.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-passive-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Convert to the passive voice: "The chef cooked the rice."',
    difficulty: 'EASY',
    options: [
      { text: 'The rice was cooked by the chef.', isCorrect: true },
      { text: 'The rice cooked the chef.', isCorrect: false },
      { text: 'The rice has been cooking by the chef.', isCorrect: false },
      { text: 'The rice is cooked by the chef.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-active-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Convert to the active voice: "The cake was eaten by the children."',
    difficulty: 'EASY',
    options: [
      { text: 'The children eat the cake.', isCorrect: false },
      { text: 'The children ate the cake.', isCorrect: true },
      { text: 'The children were eating the cake.', isCorrect: false },
      { text: 'The cake was eaten the children.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-tense-future',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the sentence in the future continuous tense:',
    difficulty: 'MEDIUM',
    options: [
      { text: 'I will travel to Lagos.', isCorrect: false },
      { text: 'I am travelling to Lagos.', isCorrect: false },
      { text: 'I will be travelling to Lagos at noon.', isCorrect: true },
      { text: 'I have travelled to Lagos.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-vocab-context',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'In the sentence "The lawyer presented a cogent argument", the word "cogent" most nearly means:',
    difficulty: 'MEDIUM',
    options: [
      { text: 'lengthy', isCorrect: false },
      { text: 'persuasive', isCorrect: true },
      { text: 'confusing', isCorrect: false },
      { text: 'humorous', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-spelling-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Which word is spelled correctly?',
    difficulty: 'EASY',
    options: [
      { text: 'recieve', isCorrect: false },
      { text: 'receive', isCorrect: true },
      { text: 'receeve', isCorrect: false },
      { text: 'receve', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-punct-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: "Which sentence uses the apostrophe correctly?",
    difficulty: 'EASY',
    options: [
      { text: "The boy's books are on the table.", isCorrect: true },
      { text: "The boys book's are on the table.", isCorrect: false },
      { text: "The boys' book's are on the table.", isCorrect: false },
      { text: "The boys books are on the table'.", isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-reported-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS1',
    type: 'MCQ_SINGLE',
    prompt: 'Convert to reported speech: She said, "I am writing a letter."',
    difficulty: 'MEDIUM',
    options: [
      { text: 'She said that she is writing a letter.', isCorrect: false },
      { text: 'She said that she was writing a letter.', isCorrect: true },
      { text: 'She said that I am writing a letter.', isCorrect: false },
      { text: 'She said that she had written a letter.', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-idiom-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: "What does the idiom 'to bite the bullet' mean?",
    difficulty: 'MEDIUM',
    options: [
      { text: 'to act recklessly', isCorrect: false },
      { text: 'to endure something painful with courage', isCorrect: true },
      { text: 'to lose a fight', isCorrect: false },
      { text: 'to refuse to listen', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-stress-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: "In the word 'photographer', the primary stress falls on which syllable?",
    difficulty: 'MEDIUM',
    options: [
      { text: 'pho', isCorrect: false },
      { text: 'tog', isCorrect: true },
      { text: 'ra', isCorrect: false },
      { text: 'pher', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-comparative-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the correct comparative form: "This problem is ___ than the last one."',
    difficulty: 'EASY',
    options: [
      { text: 'difficulter', isCorrect: false },
      { text: 'more difficult', isCorrect: true },
      { text: 'most difficult', isCorrect: false },
      { text: 'difficultest', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-prep-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the correct preposition: "She has been waiting ___ Monday."',
    difficulty: 'EASY',
    options: [
      { text: 'for', isCorrect: false },
      { text: 'since', isCorrect: true },
      { text: 'from', isCorrect: false },
      { text: 'on', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-figure-speech-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Identify the figure of speech in: "The wind whispered through the trees."',
    difficulty: 'MEDIUM',
    options: [
      { text: 'simile', isCorrect: false },
      { text: 'metaphor', isCorrect: false },
      { text: 'personification', isCorrect: true },
      { text: 'hyperbole', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-pronoun-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'JSS3',
    type: 'MCQ_SINGLE',
    prompt: 'Choose the correct pronoun: "Each of the boys must bring ___ own pen."',
    difficulty: 'EASY',
    options: [
      { text: 'their', isCorrect: false },
      { text: 'his', isCorrect: true },
      { text: 'them', isCorrect: false },
      { text: 'theirs', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-conditional-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'Complete the third-conditional sentence: "If she ___ harder, she would have passed."',
    difficulty: 'MEDIUM',
    options: [
      { text: 'studies', isCorrect: false },
      { text: 'studied', isCorrect: false },
      { text: 'had studied', isCorrect: true },
      { text: 'would study', isCorrect: false },
    ],
  },
  {
    seedKey: 'eng-phrase-meaning-1',
    canonicalSubjectName: 'English Language',
    canonicalLevelCode: 'SSS3',
    type: 'MCQ_SINGLE',
    prompt: "What does 'a stitch in time saves nine' mean?",
    difficulty: 'EASY',
    options: [
      { text: 'sewing on time prevents tearing', isCorrect: false },
      { text: 'addressing a problem early prevents bigger trouble later', isCorrect: true },
      { text: 'time heals all wounds', isCorrect: false },
      { text: 'nine is greater than one', isCorrect: false },
    ],
  },

  // ─── Economics ────────────────────────────────────────────────────────────
  {
    seedKey: 'econ-elasticity',
    canonicalSubjectName: 'Economics',
    canonicalLevelCode: 'SSS2',
    type: 'MCQ_SINGLE',
    prompt: 'When a 10% rise in price causes a 20% fall in quantity demanded, demand is:',
    difficulty: 'MEDIUM',
    options: [
      { text: 'Inelastic', isCorrect: false },
      { text: 'Unit elastic', isCorrect: false },
      { text: 'Elastic', isCorrect: true },
      { text: 'Perfectly inelastic', isCorrect: false },
    ],
  },

  // ─── Computer Science ─────────────────────────────────────────────────────
  {
    seedKey: 'cs-bigo-binsearch',
    canonicalSubjectName: 'Computer Science',
    canonicalLevelCode: 'SSS3',
    type: 'MCQ_SINGLE',
    prompt: 'What is the worst-case time complexity of binary search on a sorted array of n elements?',
    difficulty: 'EASY',
    options: [
      { text: 'O(1)', isCorrect: false },
      { text: 'O(log n)', isCorrect: true },
      { text: 'O(n)', isCorrect: false },
      { text: 'O(n log n)', isCorrect: false },
    ],
  },
];

/**
 * Looks up the bootstrap PLATFORM_ADMIN user by their SystemAdmin role.
 * Throws if none exists — curated questions need an authorUserId.
 */
async function findPlatformAdminUserId(prisma: PrismaClient): Promise<string | null> {
  const sa = await prisma.systemAdmin.findFirst({
    where: { role: 'PLATFORM_ADMIN' },
    select: { user: { select: { id: true } } },
  });
  return sa?.user?.id ?? null;
}

export async function seedCuratedQuestions(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  const authorUserId = await findPlatformAdminUserId(prisma);
  if (!authorUserId) {
    return {
      upserted: 0,
      skipped: QUESTIONS.length,
      durationMs: Date.now() - startedAt,
      notes:
        'Skipped — no PLATFORM_ADMIN user found. Run the main seed first to bootstrap the system admin.',
    };
  }

  let upserted = 0;
  let skipped = 0;

  for (const q of QUESTIONS) {
    const promptPlainText = buildPromptPlainText(q.seedKey, q.prompt);
    const promptJson = tipTapDoc(q.prompt);

    // Idempotent lookup: find existing SCHOS_CURATED question whose
    // promptPlainText starts with our anchor for this seedKey.
    const anchorLine = `${ANCHOR_PREFIX}${q.seedKey}]`;
    const existing = await prisma.question.findFirst({
      where: {
        ownerType: 'SCHOS_CURATED',
        deletedAt: null,
        promptPlainText: { startsWith: anchorLine },
      },
      select: { id: true },
    });

    const sharedFields = {
      canonicalSubjectName: q.canonicalSubjectName,
      canonicalLevelCode: q.canonicalLevelCode,
      canonicalTermName: q.canonicalTermName ?? null,
      type: q.type,
      prompt: promptJson,
      promptPlainText,
      weight: q.weight ?? 1,
      difficulty: q.difficulty ?? null,
      partialCreditMode: q.partialCreditMode ?? null,
      config: q.config ? (q.config as Prisma.InputJsonValue) : Prisma.JsonNull,
      status: QuestionStatus.DRAFT,
    };

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.question.update({ where: { id: existing.id }, data: sharedFields });
        if (q.options && q.options.length > 0) {
          // Replace options in-place to keep them in sync with the seed.
          await tx.questionOption.deleteMany({ where: { questionId: existing.id } });
          await tx.questionOption.createMany({
            data: q.options.map((opt, idx) => ({
              questionId: existing.id,
              order: idx,
              label: tipTapDoc(opt.text) as object,
              labelPlainText: opt.text,
              isCorrect: opt.isCorrect,
            })),
          });
        }
      });
      upserted += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          ...sharedFields,
          ownerType: 'SCHOS_CURATED',
          schoolId: null,
          authorUserId,
        },
      });
      if (q.options && q.options.length > 0) {
        await tx.questionOption.createMany({
          data: q.options.map((opt, idx) => ({
            questionId: created.id,
            order: idx,
            label: tipTapDoc(opt.text) as object,
            labelPlainText: opt.text,
            isCorrect: opt.isCorrect,
          })),
        });
      }
    });
    upserted += 1;
  }

  return {
    upserted,
    skipped,
    durationMs: Date.now() - startedAt,
    notes:
      'Created/updated as DRAFT. Review and publish via the platform-portal /questions area before they appear in /questions/library.',
  };
}
