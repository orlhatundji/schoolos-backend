/**
 * Curated symbol library — single-glyph LaTeX tokens that teachers drop into
 * a math expression at the cursor (vs equations, which replace the whole
 * draft). Categorised by `category` string so platform admins can add new
 * categories via this seed without a migration.
 *
 * Categories used (kept stable; render order in the picker follows insertion
 * order below):
 *   - GREEK_LOWER     α β γ …
 *   - GREEK_UPPER     Δ Σ Ω …
 *   - OPERATORS       ± ÷ × ≠ ≤ ≥ ≈ ∞
 *   - FUNCTIONS       \sin x, \log x, \lim, …
 *   - CALCULUS        ∂ ∇ ∫ ∮ ∑ ∏
 *   - SETS            ∈ ∉ ⊂ ⊆ ∪ ∩ ∅
 *   - ARROWS          → ↔ ⇒ ⇔
 *   - UNITS           Ω, °, ÅI etc. (when used as a unit, not a variable)
 *
 * Same LaTeX-escaping rule as equations: every backslash must be doubled in
 * TS string literals (`\\theta`, not `\theta`).
 */

import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface SymbolSeed {
  category: string;
  name: string;
  latex: string;
  tags: string[];
  order: number;
}

const SYMBOLS: SymbolSeed[] = [
  // ─── Greek lower ──────────────────────────────────────────────────────────
  { category: 'GREEK_LOWER', name: 'alpha',   latex: '\\alpha',   tags: ['greek'],          order: 10 },
  { category: 'GREEK_LOWER', name: 'beta',    latex: '\\beta',    tags: ['greek'],          order: 20 },
  { category: 'GREEK_LOWER', name: 'gamma',   latex: '\\gamma',   tags: ['greek'],          order: 30 },
  { category: 'GREEK_LOWER', name: 'delta',   latex: '\\delta',   tags: ['greek'],          order: 40 },
  { category: 'GREEK_LOWER', name: 'epsilon', latex: '\\varepsilon', tags: ['greek'],       order: 50 },
  { category: 'GREEK_LOWER', name: 'zeta',    latex: '\\zeta',    tags: ['greek'],          order: 60 },
  { category: 'GREEK_LOWER', name: 'eta',     latex: '\\eta',     tags: ['greek'],          order: 70 },
  { category: 'GREEK_LOWER', name: 'theta',   latex: '\\theta',   tags: ['greek', 'angle'], order: 80 },
  { category: 'GREEK_LOWER', name: 'kappa',   latex: '\\kappa',   tags: ['greek'],          order: 90 },
  { category: 'GREEK_LOWER', name: 'lambda',  latex: '\\lambda',  tags: ['greek', 'wavelength'], order: 100 },
  { category: 'GREEK_LOWER', name: 'mu',      latex: '\\mu',      tags: ['greek', 'mean'],  order: 110 },
  { category: 'GREEK_LOWER', name: 'nu',      latex: '\\nu',      tags: ['greek'],          order: 120 },
  { category: 'GREEK_LOWER', name: 'xi',      latex: '\\xi',      tags: ['greek'],          order: 130 },
  { category: 'GREEK_LOWER', name: 'pi',      latex: '\\pi',      tags: ['greek'],          order: 140 },
  { category: 'GREEK_LOWER', name: 'rho',     latex: '\\rho',     tags: ['greek', 'density'], order: 150 },
  { category: 'GREEK_LOWER', name: 'sigma',   latex: '\\sigma',   tags: ['greek', 'std-dev'], order: 160 },
  { category: 'GREEK_LOWER', name: 'tau',     latex: '\\tau',     tags: ['greek'],          order: 170 },
  { category: 'GREEK_LOWER', name: 'phi',     latex: '\\phi',     tags: ['greek'],          order: 180 },
  { category: 'GREEK_LOWER', name: 'chi',     latex: '\\chi',     tags: ['greek'],          order: 190 },
  { category: 'GREEK_LOWER', name: 'psi',     latex: '\\psi',     tags: ['greek'],          order: 200 },
  { category: 'GREEK_LOWER', name: 'omega',   latex: '\\omega',   tags: ['greek'],          order: 210 },

  // ─── Greek upper ──────────────────────────────────────────────────────────
  { category: 'GREEK_UPPER', name: 'Gamma',   latex: '\\Gamma',  tags: ['greek'],          order: 10 },
  { category: 'GREEK_UPPER', name: 'Delta',   latex: '\\Delta',  tags: ['greek', 'change'], order: 20 },
  { category: 'GREEK_UPPER', name: 'Theta',   latex: '\\Theta',  tags: ['greek'],          order: 30 },
  { category: 'GREEK_UPPER', name: 'Lambda',  latex: '\\Lambda', tags: ['greek'],          order: 40 },
  { category: 'GREEK_UPPER', name: 'Pi',      latex: '\\Pi',     tags: ['greek'],          order: 50 },
  { category: 'GREEK_UPPER', name: 'Sigma',   latex: '\\Sigma',  tags: ['greek', 'sum'],   order: 60 },
  { category: 'GREEK_UPPER', name: 'Phi',     latex: '\\Phi',    tags: ['greek'],          order: 70 },
  { category: 'GREEK_UPPER', name: 'Psi',     latex: '\\Psi',    tags: ['greek'],          order: 80 },
  { category: 'GREEK_UPPER', name: 'Omega',   latex: '\\Omega',  tags: ['greek', 'ohms'],  order: 90 },

  // ─── Operators ────────────────────────────────────────────────────────────
  { category: 'OPERATORS', name: 'plus-minus',    latex: '\\pm',     tags: ['operator', 'sign'],     order: 10 },
  { category: 'OPERATORS', name: 'minus-plus',    latex: '\\mp',     tags: ['operator', 'sign'],     order: 20 },
  { category: 'OPERATORS', name: 'times',         latex: '\\times',  tags: ['operator', 'multiply'], order: 30 },
  { category: 'OPERATORS', name: 'divide',        latex: '\\div',    tags: ['operator', 'divide'],   order: 40 },
  { category: 'OPERATORS', name: 'cdot',          latex: '\\cdot',   tags: ['operator', 'multiply', 'dot'], order: 50 },
  { category: 'OPERATORS', name: 'not-equal',     latex: '\\neq',    tags: ['operator', 'compare'],  order: 60 },
  { category: 'OPERATORS', name: 'less-or-equal', latex: '\\leq',    tags: ['operator', 'compare'],  order: 70 },
  { category: 'OPERATORS', name: 'greater-or-equal', latex: '\\geq', tags: ['operator', 'compare'],  order: 80 },
  { category: 'OPERATORS', name: 'approximately', latex: '\\approx', tags: ['operator', 'compare'],  order: 90 },
  { category: 'OPERATORS', name: 'equivalent',    latex: '\\equiv',  tags: ['operator', 'compare'],  order: 100 },
  { category: 'OPERATORS', name: 'proportional',  latex: '\\propto', tags: ['operator', 'compare'],  order: 110 },
  { category: 'OPERATORS', name: 'infinity',      latex: '\\infty',  tags: ['operator', 'limits'],   order: 120 },
  { category: 'OPERATORS', name: 'square-root',   latex: '\\sqrt{}',  tags: ['operator', 'root'],    order: 130 },
  { category: 'OPERATORS', name: 'nth-root',      latex: '\\sqrt[n]{}', tags: ['operator', 'root'],  order: 140 },
  { category: 'OPERATORS', name: 'fraction',      latex: '\\frac{}{}', tags: ['operator'],           order: 150 },
  { category: 'OPERATORS', name: 'degree',        latex: '^{\\circ}', tags: ['operator', 'angle'],   order: 160 },
  { category: 'OPERATORS', name: 'subscript',     latex: '_{}',      tags: ['operator'],             order: 170 },
  { category: 'OPERATORS', name: 'superscript',   latex: '^{}',      tags: ['operator', 'power'],    order: 180 },

  // ─── Functions ────────────────────────────────────────────────────────────
  { category: 'FUNCTIONS', name: 'sin',     latex: '\\sin',    tags: ['trigonometry'],            order: 10 },
  { category: 'FUNCTIONS', name: 'sin x',   latex: '\\sin x',  tags: ['trigonometry'],            order: 15 },
  { category: 'FUNCTIONS', name: 'cos',     latex: '\\cos',    tags: ['trigonometry'],            order: 20 },
  { category: 'FUNCTIONS', name: 'cos x',   latex: '\\cos x',  tags: ['trigonometry'],            order: 25 },
  { category: 'FUNCTIONS', name: 'tan',     latex: '\\tan',    tags: ['trigonometry'],            order: 30 },
  { category: 'FUNCTIONS', name: 'tan x',   latex: '\\tan x',  tags: ['trigonometry'],            order: 35 },
  { category: 'FUNCTIONS', name: 'cot',     latex: '\\cot',    tags: ['trigonometry'],            order: 40 },
  { category: 'FUNCTIONS', name: 'sec',     latex: '\\sec',    tags: ['trigonometry'],            order: 50 },
  { category: 'FUNCTIONS', name: 'csc',     latex: '\\csc',    tags: ['trigonometry'],            order: 60 },
  { category: 'FUNCTIONS', name: 'arcsin',  latex: '\\arcsin', tags: ['trigonometry', 'inverse'], order: 70 },
  { category: 'FUNCTIONS', name: 'arccos',  latex: '\\arccos', tags: ['trigonometry', 'inverse'], order: 80 },
  { category: 'FUNCTIONS', name: 'arctan',  latex: '\\arctan', tags: ['trigonometry', 'inverse'], order: 90 },
  { category: 'FUNCTIONS', name: 'log',     latex: '\\log',    tags: ['logarithm'],               order: 100 },
  { category: 'FUNCTIONS', name: 'log_b x', latex: '\\log_{b} x', tags: ['logarithm'],            order: 105 },
  { category: 'FUNCTIONS', name: 'ln',      latex: '\\ln',     tags: ['logarithm', 'natural'],    order: 110 },
  { category: 'FUNCTIONS', name: 'exp',     latex: '\\exp',    tags: ['exponential'],             order: 120 },
  { category: 'FUNCTIONS', name: 'lim',     latex: '\\lim',    tags: ['limit', 'calculus'],       order: 130 },
  { category: 'FUNCTIONS', name: 'lim x→a', latex: '\\lim_{x \\to a}', tags: ['limit', 'calculus'], order: 140 },
  { category: 'FUNCTIONS', name: 'max',     latex: '\\max',    tags: ['optimization'],            order: 150 },
  { category: 'FUNCTIONS', name: 'min',     latex: '\\min',    tags: ['optimization'],            order: 160 },
  { category: 'FUNCTIONS', name: 'absolute value', latex: '\\lvert x \\rvert', tags: ['absolute', 'modulus'], order: 170 },

  // ─── Calculus ─────────────────────────────────────────────────────────────
  { category: 'CALCULUS', name: 'partial',     latex: '\\partial',  tags: ['derivative'],   order: 10 },
  { category: 'CALCULUS', name: 'partial fraction', latex: '\\frac{\\partial}{\\partial x}', tags: ['derivative'], order: 15 },
  { category: 'CALCULUS', name: 'derivative',  latex: '\\frac{d}{dx}', tags: ['derivative'], order: 20 },
  { category: 'CALCULUS', name: 'second derivative', latex: '\\frac{d^2}{dx^2}', tags: ['derivative'], order: 25 },
  { category: 'CALCULUS', name: 'nabla',       latex: '\\nabla',    tags: ['gradient', 'vector'], order: 30 },
  { category: 'CALCULUS', name: 'integral',    latex: '\\int',      tags: ['integral'],     order: 40 },
  { category: 'CALCULUS', name: 'definite integral', latex: '\\int_{a}^{b}', tags: ['integral'], order: 45 },
  { category: 'CALCULUS', name: 'double integral', latex: '\\iint', tags: ['integral'],     order: 50 },
  { category: 'CALCULUS', name: 'contour integral', latex: '\\oint', tags: ['integral'],    order: 60 },
  { category: 'CALCULUS', name: 'sum',         latex: '\\sum',      tags: ['summation'],    order: 70 },
  { category: 'CALCULUS', name: 'sum n=1 to N',latex: '\\sum_{n=1}^{N}', tags: ['summation'], order: 75 },
  { category: 'CALCULUS', name: 'product',     latex: '\\prod',     tags: ['product'],      order: 80 },

  // ─── Sets ─────────────────────────────────────────────────────────────────
  { category: 'SETS', name: 'element-of',     latex: '\\in',         tags: ['set'], order: 10 },
  { category: 'SETS', name: 'not-element-of', latex: '\\notin',      tags: ['set'], order: 20 },
  { category: 'SETS', name: 'subset',         latex: '\\subset',     tags: ['set'], order: 30 },
  { category: 'SETS', name: 'subset-or-equal',latex: '\\subseteq',   tags: ['set'], order: 40 },
  { category: 'SETS', name: 'superset',       latex: '\\supset',     tags: ['set'], order: 50 },
  { category: 'SETS', name: 'union',          latex: '\\cup',        tags: ['set'], order: 60 },
  { category: 'SETS', name: 'intersection',   latex: '\\cap',        tags: ['set'], order: 70 },
  { category: 'SETS', name: 'empty-set',      latex: '\\emptyset',   tags: ['set'], order: 80 },
  { category: 'SETS', name: 'set-natural',    latex: '\\mathbb{N}',  tags: ['set', 'naturals'], order: 90 },
  { category: 'SETS', name: 'set-integer',    latex: '\\mathbb{Z}',  tags: ['set', 'integers'], order: 100 },
  { category: 'SETS', name: 'set-rational',   latex: '\\mathbb{Q}',  tags: ['set', 'rationals'], order: 110 },
  { category: 'SETS', name: 'set-real',       latex: '\\mathbb{R}',  tags: ['set', 'reals'], order: 120 },
  { category: 'SETS', name: 'set-complex',    latex: '\\mathbb{C}',  tags: ['set', 'complex'], order: 130 },

  // ─── Arrows / logic ───────────────────────────────────────────────────────
  { category: 'ARROWS', name: 'right-arrow',  latex: '\\rightarrow',     tags: ['arrow', 'logic'], order: 10 },
  { category: 'ARROWS', name: 'left-arrow',   latex: '\\leftarrow',      tags: ['arrow'],          order: 20 },
  { category: 'ARROWS', name: 'left-right-arrow', latex: '\\leftrightarrow', tags: ['arrow'],      order: 30 },
  { category: 'ARROWS', name: 'implies',      latex: '\\Rightarrow',     tags: ['arrow', 'logic'], order: 40 },
  { category: 'ARROWS', name: 'iff',          latex: '\\Leftrightarrow', tags: ['arrow', 'logic'], order: 50 },
  { category: 'ARROWS', name: 'maps-to',      latex: '\\mapsto',         tags: ['arrow'],          order: 60 },
  { category: 'ARROWS', name: 'logical-and',  latex: '\\land',           tags: ['logic'],          order: 70 },
  { category: 'ARROWS', name: 'logical-or',   latex: '\\lor',            tags: ['logic'],          order: 80 },
  { category: 'ARROWS', name: 'not',          latex: '\\neg',            tags: ['logic'],          order: 90 },
  { category: 'ARROWS', name: 'for-all',      latex: '\\forall',         tags: ['logic'],          order: 100 },
  { category: 'ARROWS', name: 'exists',       latex: '\\exists',         tags: ['logic'],          order: 110 },

  // ─── Units (when used as a unit token, not a variable) ────────────────────
  { category: 'UNITS', name: 'ohm-omega', latex: '\\,\\Omega', tags: ['unit', 'electricity'], order: 10 },
  { category: 'UNITS', name: 'micro',     latex: '\\mu',       tags: ['unit', 'prefix'],      order: 20 },
  { category: 'UNITS', name: 'angstrom',  latex: '\\text{\\AA}', tags: ['unit', 'length'],    order: 30 },
  { category: 'UNITS', name: 'celsius',   latex: '^{\\circ}\\mathrm{C}', tags: ['unit', 'temperature'], order: 40 },
  { category: 'UNITS', name: 'fahrenheit',latex: '^{\\circ}\\mathrm{F}', tags: ['unit', 'temperature'], order: 50 },
  { category: 'UNITS', name: 'percent',   latex: '\\%',        tags: ['unit'],                order: 60 },
];

export async function seedSymbolLibrary(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();
  let upserted = 0;
  for (const sym of SYMBOLS) {
    await prisma.symbolLibraryItem.upsert({
      where: { category_name: { category: sym.category, name: sym.name } },
      update: {
        latex: sym.latex,
        tags: sym.tags,
        order: sym.order,
        isActive: true,
      },
      create: {
        category: sym.category,
        name: sym.name,
        latex: sym.latex,
        tags: sym.tags,
        order: sym.order,
      },
    });
    upserted += 1;
  }
  return { upserted, skipped: 0, durationMs: Date.now() - startedAt };
}
