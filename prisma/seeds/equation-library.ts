/**
 * Curated equation library — platform-owned, exposed via /equation-library to
 * teachers in the question-authoring "Insert math" dialog.
 *
 * IMPORTANT — LaTeX escaping:
 *   In TS string literals, every backslash must be doubled. Use `\\frac{a}{b}`
 *   not `\frac{a}{b}`. Single-backslash content will be silently mangled.
 *
 * IMPORTANT — keying:
 *   Each row is upserted by (canonicalSubjectSlug, name). Renaming an existing
 *   entry creates a new row instead of updating the existing one — pick the
 *   final name first, then prefer to edit `latex`/`description`/`tags`/`order`.
 */

import { PrismaClient } from '@prisma/client';

import { SeedRunResult } from './types';

interface EquationSeed {
  subjectSlug: string;
  name: string;
  description?: string;
  latex: string;
  tags: string[];
  order: number;
}

const EQUATIONS: EquationSeed[] = [
  // ─── Mathematics ──────────────────────────────────────────────────────────
  {
    subjectSlug: 'mathematics',
    name: 'Quadratic Formula',
    description: 'Solves ax² + bx + c = 0 for x',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    tags: ['algebra', 'roots', 'polynomial'],
    order: 10,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Pythagoras Theorem',
    description: 'Right-angled triangle side relationship',
    latex: 'a^2 + b^2 = c^2',
    tags: ['geometry', 'triangle'],
    order: 20,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Distance Formula',
    description: 'Distance between two points (x₁, y₁) and (x₂, y₂)',
    latex: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
    tags: ['geometry', 'coordinates'],
    order: 30,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Slope of a Line',
    description: 'Slope between two points',
    latex: 'm = \\frac{y_2 - y_1}{x_2 - x_1}',
    tags: ['algebra', 'coordinates', 'lines'],
    order: 40,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Slope-Intercept Form',
    description: 'Linear equation with slope m and y-intercept c',
    latex: 'y = mx + c',
    tags: ['algebra', 'lines'],
    order: 50,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Area of a Circle',
    latex: 'A = \\pi r^2',
    tags: ['geometry', 'circle', 'area'],
    order: 60,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Circumference of a Circle',
    latex: 'C = 2 \\pi r',
    tags: ['geometry', 'circle'],
    order: 70,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Area of a Triangle',
    description: 'Base × height ÷ 2',
    latex: 'A = \\tfrac{1}{2} b h',
    tags: ['geometry', 'triangle', 'area'],
    order: 80,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Volume of a Sphere',
    latex: 'V = \\tfrac{4}{3} \\pi r^3',
    tags: ['geometry', 'sphere', 'volume'],
    order: 90,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Volume of a Cylinder',
    latex: 'V = \\pi r^2 h',
    tags: ['geometry', 'cylinder', 'volume'],
    order: 100,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Sum of Arithmetic Series',
    description: 'Sum of the first n terms of an arithmetic progression',
    latex: 'S_n = \\tfrac{n}{2}\\bigl(2a + (n - 1)d\\bigr)',
    tags: ['algebra', 'series', 'sequences'],
    order: 110,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Sum of Geometric Series',
    description: 'Sum of the first n terms of a geometric progression (r ≠ 1)',
    latex: 'S_n = \\frac{a(1 - r^n)}{1 - r}',
    tags: ['algebra', 'series', 'sequences'],
    order: 120,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Binomial Theorem',
    latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k}',
    tags: ['algebra', 'series'],
    order: 130,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Definite Integral',
    description: 'Fundamental theorem of calculus',
    latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)',
    tags: ['calculus', 'integral'],
    order: 140,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Power Rule (Derivative)',
    latex: '\\frac{d}{dx} x^n = n x^{n-1}',
    tags: ['calculus', 'derivative'],
    order: 150,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Mean (Average)',
    description: 'Arithmetic mean of n values',
    latex: '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i',
    tags: ['statistics', 'average'],
    order: 200,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Variance',
    description: 'Population variance',
    latex: '\\sigma^2 = \\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\bar{x})^2',
    tags: ['statistics', 'spread'],
    order: 210,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Standard Deviation',
    description: 'Population standard deviation',
    latex: '\\sigma = \\sqrt{\\frac{1}{n} \\sum_{i=1}^{n} (x_i - \\bar{x})^2}',
    tags: ['statistics', 'spread'],
    order: 220,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Z-Score',
    description: 'Number of standard deviations from the mean',
    latex: 'z = \\frac{x - \\mu}{\\sigma}',
    tags: ['statistics', 'normal-distribution'],
    order: 230,
  },

  // ─── Physics ──────────────────────────────────────────────────────────────
  {
    subjectSlug: 'physics',
    name: "Newton's Second Law",
    description: 'Net force equals mass times acceleration',
    latex: 'F = ma',
    tags: ['mechanics', 'force'],
    order: 10,
  },
  {
    subjectSlug: 'physics',
    name: 'Kinematic Equation (v = u + at)',
    description: 'Final velocity from initial velocity, acceleration, and time',
    latex: 'v = u + at',
    tags: ['kinematics', 'motion'],
    order: 20,
  },
  {
    subjectSlug: 'physics',
    name: 'Kinematic Equation (s = ut + ½at²)',
    description: 'Displacement under constant acceleration',
    latex: 's = ut + \\tfrac{1}{2} a t^2',
    tags: ['kinematics', 'motion'],
    order: 30,
  },
  {
    subjectSlug: 'physics',
    name: 'Kinematic Equation (v² = u² + 2as)',
    description: 'Velocity-displacement relation under constant acceleration',
    latex: 'v^2 = u^2 + 2as',
    tags: ['kinematics', 'motion'],
    order: 40,
  },
  {
    subjectSlug: 'physics',
    name: 'Kinetic Energy',
    latex: 'E_k = \\tfrac{1}{2} m v^2',
    tags: ['energy', 'mechanics'],
    order: 50,
  },
  {
    subjectSlug: 'physics',
    name: 'Gravitational Potential Energy',
    description: 'Energy of a mass at height h in gravity g',
    latex: 'E_p = mgh',
    tags: ['energy', 'gravity'],
    order: 60,
  },
  {
    subjectSlug: 'physics',
    name: 'Work Done',
    description: 'Force times displacement in the direction of force',
    latex: 'W = F d \\cos\\theta',
    tags: ['energy', 'mechanics'],
    order: 70,
  },
  {
    subjectSlug: 'physics',
    name: 'Newton’s Law of Gravitation',
    latex: 'F = G \\frac{m_1 m_2}{r^2}',
    tags: ['gravity', 'mechanics'],
    order: 80,
  },
  {
    subjectSlug: 'physics',
    name: 'Momentum',
    latex: 'p = mv',
    tags: ['mechanics', 'momentum'],
    order: 90,
  },
  {
    subjectSlug: 'physics',
    name: "Ohm's Law",
    description: 'Voltage equals current times resistance',
    latex: 'V = IR',
    tags: ['electricity', 'circuits'],
    order: 100,
  },
  {
    subjectSlug: 'physics',
    name: 'Electrical Power',
    latex: 'P = VI',
    tags: ['electricity', 'power'],
    order: 110,
  },
  {
    subjectSlug: 'physics',
    name: 'Wave Equation',
    description: 'Wave speed equals frequency times wavelength',
    latex: 'v = f \\lambda',
    tags: ['waves', 'frequency'],
    order: 120,
  },

  // ─── Chemistry ────────────────────────────────────────────────────────────
  {
    subjectSlug: 'chemistry',
    name: 'pH Definition',
    description: 'pH as negative log of hydrogen ion concentration',
    latex: '\\mathrm{pH} = -\\log_{10} [\\mathrm{H}^+]',
    tags: ['acid-base', 'equilibrium'],
    order: 10,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Molarity',
    description: 'Moles of solute per litre of solution',
    latex: 'M = \\frac{n}{V}',
    tags: ['solutions', 'concentration'],
    order: 20,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Ideal Gas Law',
    latex: 'PV = nRT',
    tags: ['gases', 'thermodynamics'],
    order: 30,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Number of Moles',
    description: 'Moles from mass and molar mass',
    latex: 'n = \\frac{m}{M}',
    tags: ['stoichiometry', 'moles'],
    order: 40,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Dilution Equation',
    description: 'Conservation of moles on dilution',
    latex: 'M_1 V_1 = M_2 V_2',
    tags: ['solutions', 'dilution'],
    order: 50,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Heat Energy',
    description: 'Specific heat capacity equation',
    latex: 'Q = mc\\Delta T',
    tags: ['thermodynamics', 'energy'],
    order: 60,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Equilibrium Constant (Kc)',
    description: 'For the reaction aA + bB ⇌ cC + dD',
    latex: 'K_c = \\frac{[\\mathrm{C}]^c [\\mathrm{D}]^d}{[\\mathrm{A}]^a [\\mathrm{B}]^b}',
    tags: ['equilibrium', 'kinetics'],
    order: 70,
  },

  // ─── Economics ────────────────────────────────────────────────────────────
  {
    subjectSlug: 'economics',
    name: 'Price Elasticity of Demand',
    description: 'Percentage change in quantity demanded over percentage change in price',
    latex: 'E_d = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}',
    tags: ['demand', 'elasticity'],
    order: 10,
  },
  {
    subjectSlug: 'economics',
    name: 'Simple Interest',
    latex: 'I = P r t',
    tags: ['interest', 'finance'],
    order: 20,
  },
  {
    subjectSlug: 'economics',
    name: 'Compound Interest',
    description: 'Future value of P compounded n times per period at rate r',
    latex: 'A = P \\left(1 + \\frac{r}{n}\\right)^{nt}',
    tags: ['interest', 'finance'],
    order: 30,
  },
  {
    subjectSlug: 'economics',
    name: 'Gross Domestic Product (Expenditure)',
    description: 'GDP by expenditure components',
    latex: 'GDP = C + I + G + (X - M)',
    tags: ['macro', 'gdp'],
    order: 40,
  },
  {
    subjectSlug: 'economics',
    name: 'Marginal Propensity to Consume',
    description: 'Change in consumption divided by change in income',
    latex: 'MPC = \\frac{\\Delta C}{\\Delta Y}',
    tags: ['macro', 'consumption'],
    order: 50,
  },
  {
    subjectSlug: 'economics',
    name: 'Multiplier (Simple Keynesian)',
    description: 'Income multiplier for an increase in autonomous spending',
    latex: 'k = \\frac{1}{1 - MPC}',
    tags: ['macro', 'multiplier'],
    order: 60,
  },
  {
    subjectSlug: 'economics',
    name: 'Real GDP Growth Rate',
    description: 'Year-over-year real GDP growth',
    latex: 'g = \\frac{GDP_{t} - GDP_{t-1}}{GDP_{t-1}} \\times 100\\%',
    tags: ['macro', 'growth'],
    order: 70,
  },

  // ─── Mathematics — Matrices ──────────────────────────────────────────────
  {
    subjectSlug: 'mathematics',
    name: '2×2 Matrix',
    description: 'Generic 2×2 matrix template',
    latex: 'A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    tags: ['matrix', 'linear-algebra'],
    order: 300,
  },
  {
    subjectSlug: 'mathematics',
    name: '3×3 Matrix',
    description: 'Generic 3×3 matrix template',
    latex: 'A = \\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}',
    tags: ['matrix', 'linear-algebra'],
    order: 310,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Identity Matrix (3×3)',
    latex: 'I = \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}',
    tags: ['matrix', 'linear-algebra', 'identity'],
    order: 320,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Matrix Transpose',
    description: 'Rows of A become columns of Aᵀ',
    latex: '(A^{T})_{ij} = A_{ji}',
    tags: ['matrix', 'linear-algebra', 'transpose'],
    order: 330,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Determinant of a 2×2 Matrix',
    latex: '\\det(A) = ad - bc',
    tags: ['matrix', 'determinant'],
    order: 340,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Determinant of a 3×3 Matrix',
    description: 'Cofactor expansion along the first row',
    latex: '\\det(A) = a_{11}(a_{22}a_{33} - a_{23}a_{32}) - a_{12}(a_{21}a_{33} - a_{23}a_{31}) + a_{13}(a_{21}a_{32} - a_{22}a_{31})',
    tags: ['matrix', 'determinant'],
    order: 350,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Inverse of a 2×2 Matrix',
    description: 'Provided ad − bc ≠ 0',
    latex: 'A^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
    tags: ['matrix', 'inverse'],
    order: 360,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Matrix Multiplication (Element)',
    description: 'Element (i,j) of AB',
    latex: '(AB)_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}',
    tags: ['matrix', 'multiplication'],
    order: 370,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Eigenvalue Equation',
    description: 'Av = λv',
    latex: 'A \\mathbf{v} = \\lambda \\mathbf{v}',
    tags: ['matrix', 'eigenvalue', 'linear-algebra'],
    order: 380,
  },
  {
    subjectSlug: 'mathematics',
    name: "Cramer's Rule (2 unknowns)",
    description: 'Solve Ax = b when det(A) ≠ 0',
    latex: 'x = \\frac{\\det(A_x)}{\\det(A)}, \\quad y = \\frac{\\det(A_y)}{\\det(A)}',
    tags: ['matrix', 'linear-systems'],
    order: 390,
  },

  // ─── Mathematics — Trigonometry & Logarithms ─────────────────────────────
  {
    subjectSlug: 'mathematics',
    name: 'Pythagorean Identity',
    latex: '\\sin^2 \\theta + \\cos^2 \\theta = 1',
    tags: ['trigonometry', 'identity'],
    order: 400,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Tangent Identity',
    latex: '\\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta}',
    tags: ['trigonometry', 'identity'],
    order: 410,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Sum Formula (sin)',
    latex: '\\sin(A + B) = \\sin A \\cos B + \\cos A \\sin B',
    tags: ['trigonometry', 'identity'],
    order: 420,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Sum Formula (cos)',
    latex: '\\cos(A + B) = \\cos A \\cos B - \\sin A \\sin B',
    tags: ['trigonometry', 'identity'],
    order: 430,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Double-Angle (sin)',
    latex: '\\sin 2\\theta = 2 \\sin \\theta \\cos \\theta',
    tags: ['trigonometry', 'identity'],
    order: 440,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Law of Sines',
    description: 'For any triangle with sides a, b, c opposite angles A, B, C',
    latex: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}',
    tags: ['trigonometry', 'triangle'],
    order: 450,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Law of Cosines',
    latex: 'c^2 = a^2 + b^2 - 2ab \\cos C',
    tags: ['trigonometry', 'triangle'],
    order: 460,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Logarithm Product Rule',
    latex: '\\log(xy) = \\log x + \\log y',
    tags: ['logarithm'],
    order: 470,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Logarithm Quotient Rule',
    latex: '\\log\\!\\left(\\frac{x}{y}\\right) = \\log x - \\log y',
    tags: ['logarithm'],
    order: 480,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Logarithm Power Rule',
    latex: '\\log(x^n) = n \\log x',
    tags: ['logarithm'],
    order: 490,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Change of Base',
    latex: '\\log_{a} b = \\frac{\\log b}{\\log a}',
    tags: ['logarithm'],
    order: 500,
  },

  // ─── Mathematics — Calculus extras ───────────────────────────────────────
  {
    subjectSlug: 'mathematics',
    name: 'Limit Definition of Derivative',
    latex: 'f\\,\'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}',
    tags: ['calculus', 'derivative'],
    order: 510,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Product Rule (Derivative)',
    latex: '(fg)\\,\' = f\\,\'g + fg\\,\'',
    tags: ['calculus', 'derivative'],
    order: 520,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Quotient Rule (Derivative)',
    latex: '\\left(\\frac{f}{g}\\right)\\,\' = \\frac{f\\,\'g - fg\\,\'}{g^2}',
    tags: ['calculus', 'derivative'],
    order: 530,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Chain Rule',
    latex: '\\frac{d}{dx} f(g(x)) = f\\,\'(g(x)) \\cdot g\\,\'(x)',
    tags: ['calculus', 'derivative'],
    order: 540,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Integral of x^n',
    description: 'For n ≠ −1',
    latex: '\\int x^{n}\\,dx = \\frac{x^{n+1}}{n+1} + C',
    tags: ['calculus', 'integral'],
    order: 550,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Integral of 1/x',
    latex: '\\int \\frac{1}{x}\\,dx = \\ln |x| + C',
    tags: ['calculus', 'integral'],
    order: 560,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Integration by Parts',
    latex: '\\int u\\,dv = uv - \\int v\\,du',
    tags: ['calculus', 'integral'],
    order: 570,
  },

  // ─── Mathematics — Probability & Combinatorics ───────────────────────────
  {
    subjectSlug: 'mathematics',
    name: 'Permutations nPr',
    latex: '{}^{n}P_{r} = \\frac{n!}{(n - r)!}',
    tags: ['combinatorics', 'probability'],
    order: 600,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Combinations nCr',
    latex: '{}^{n}C_{r} = \\binom{n}{r} = \\frac{n!}{r!(n - r)!}',
    tags: ['combinatorics', 'probability'],
    order: 610,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Conditional Probability',
    latex: 'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}',
    tags: ['probability'],
    order: 620,
  },
  {
    subjectSlug: 'mathematics',
    name: "Bayes' Theorem",
    latex: 'P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}',
    tags: ['probability'],
    order: 630,
  },
  {
    subjectSlug: 'mathematics',
    name: 'Expected Value (Discrete)',
    latex: 'E[X] = \\sum_{i} x_{i}\\,P(x_{i})',
    tags: ['probability', 'statistics'],
    order: 640,
  },

  // ─── Further Mathematics — Vectors & Complex ─────────────────────────────
  {
    subjectSlug: 'further-mathematics',
    name: 'Vector Magnitude (3D)',
    latex: '|\\mathbf{v}| = \\sqrt{v_x^{2} + v_y^{2} + v_z^{2}}',
    tags: ['vector', 'geometry'],
    order: 10,
  },
  {
    subjectSlug: 'further-mathematics',
    name: 'Dot Product',
    latex: '\\mathbf{a} \\cdot \\mathbf{b} = a_x b_x + a_y b_y + a_z b_z',
    tags: ['vector'],
    order: 20,
  },
  {
    subjectSlug: 'further-mathematics',
    name: 'Cross Product Magnitude',
    latex: '|\\mathbf{a} \\times \\mathbf{b}| = |\\mathbf{a}||\\mathbf{b}| \\sin \\theta',
    tags: ['vector'],
    order: 30,
  },
  {
    subjectSlug: 'further-mathematics',
    name: "Euler's Formula",
    latex: 'e^{i\\theta} = \\cos \\theta + i \\sin \\theta',
    tags: ['complex', 'identity'],
    order: 40,
  },
  {
    subjectSlug: 'further-mathematics',
    name: 'Modulus of Complex Number',
    latex: '|z| = \\sqrt{a^{2} + b^{2}}',
    tags: ['complex'],
    order: 50,
  },
  {
    subjectSlug: 'further-mathematics',
    name: 'De Moivre Theorem',
    latex: '(\\cos \\theta + i \\sin \\theta)^{n} = \\cos n\\theta + i \\sin n\\theta',
    tags: ['complex', 'identity'],
    order: 60,
  },

  // ─── Physics — Electricity & Magnetism ───────────────────────────────────
  {
    subjectSlug: 'physics',
    name: 'Electric Charge (Capacitor)',
    description: 'Charge stored on a capacitor at voltage V',
    latex: 'Q = CV',
    tags: ['electricity', 'capacitance'],
    order: 200,
  },
  {
    subjectSlug: 'physics',
    name: 'Capacitor Energy',
    latex: 'E = \\tfrac{1}{2} C V^{2}',
    tags: ['electricity', 'capacitance', 'energy'],
    order: 210,
  },
  {
    subjectSlug: 'physics',
    name: "Coulomb's Law",
    description: 'Force between two point charges',
    latex: 'F = k \\frac{q_{1} q_{2}}{r^{2}}',
    tags: ['electricity', 'force'],
    order: 220,
  },
  {
    subjectSlug: 'physics',
    name: 'Electric Field',
    latex: 'E = \\frac{F}{q}',
    tags: ['electricity', 'field'],
    order: 230,
  },
  {
    subjectSlug: 'physics',
    name: 'Resistors in Series',
    latex: 'R_{eq} = R_{1} + R_{2} + \\dots + R_{n}',
    tags: ['electricity', 'resistors'],
    order: 240,
  },
  {
    subjectSlug: 'physics',
    name: 'Resistors in Parallel',
    latex: '\\frac{1}{R_{eq}} = \\frac{1}{R_{1}} + \\frac{1}{R_{2}} + \\dots + \\frac{1}{R_{n}}',
    tags: ['electricity', 'resistors'],
    order: 250,
  },
  {
    subjectSlug: 'physics',
    name: 'Magnetic Force on a Charge',
    latex: 'F = qvB \\sin \\theta',
    tags: ['magnetism', 'force'],
    order: 260,
  },

  // ─── Physics — Thermodynamics & Modern ───────────────────────────────────
  {
    subjectSlug: 'physics',
    name: 'First Law of Thermodynamics',
    latex: '\\Delta U = Q - W',
    tags: ['thermodynamics', 'energy'],
    order: 300,
  },
  {
    subjectSlug: 'physics',
    name: 'Heat Capacity',
    latex: 'Q = mc \\Delta T',
    tags: ['thermodynamics'],
    order: 310,
  },
  {
    subjectSlug: 'physics',
    name: 'Stefan–Boltzmann Law',
    description: 'Total radiated power per unit area of a black body',
    latex: 'P = \\sigma T^{4}',
    tags: ['thermodynamics', 'radiation'],
    order: 320,
  },
  {
    subjectSlug: 'physics',
    name: "Einstein's Mass-Energy Equivalence",
    latex: 'E = mc^{2}',
    tags: ['modern', 'relativity'],
    order: 330,
  },
  {
    subjectSlug: 'physics',
    name: 'Photon Energy',
    latex: 'E = hf',
    tags: ['quantum', 'photon'],
    order: 340,
  },
  {
    subjectSlug: 'physics',
    name: 'de Broglie Wavelength',
    latex: '\\lambda = \\frac{h}{p}',
    tags: ['quantum', 'waves'],
    order: 350,
  },
  {
    subjectSlug: 'physics',
    name: 'Snell’s Law',
    latex: 'n_{1} \\sin \\theta_{1} = n_{2} \\sin \\theta_{2}',
    tags: ['optics', 'waves'],
    order: 360,
  },
  {
    subjectSlug: 'physics',
    name: 'Lens / Mirror Equation',
    latex: '\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}',
    tags: ['optics'],
    order: 370,
  },
  {
    subjectSlug: 'physics',
    name: 'Doppler Effect (Sound, observer)',
    description: 'Frequency heard by stationary observer, source moving',
    latex: "f' = f \\left( \\frac{v}{v - v_{s}} \\right)",
    tags: ['waves', 'doppler'],
    order: 380,
  },

  // ─── Chemistry — More ────────────────────────────────────────────────────
  {
    subjectSlug: 'chemistry',
    name: 'Avogadro Constant',
    description: 'Number of particles per mole',
    latex: 'N_{A} = 6.022 \\times 10^{23}\\,\\mathrm{mol}^{-1}',
    tags: ['stoichiometry', 'constants'],
    order: 100,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Number of Particles',
    latex: 'N = n \\cdot N_{A}',
    tags: ['stoichiometry'],
    order: 110,
  },
  {
    subjectSlug: 'chemistry',
    name: 'pOH',
    latex: '\\mathrm{pOH} = -\\log_{10}[\\mathrm{OH}^{-}]',
    tags: ['acid-base'],
    order: 120,
  },
  {
    subjectSlug: 'chemistry',
    name: 'pH + pOH Relationship',
    latex: '\\mathrm{pH} + \\mathrm{pOH} = 14',
    tags: ['acid-base'],
    order: 130,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Henderson–Hasselbalch',
    description: 'pH of a buffer from pKa and ratio of conjugate base to acid',
    latex: '\\mathrm{pH} = \\mathrm{p}K_{a} + \\log\\!\\left(\\frac{[\\mathrm{A}^{-}]}{[\\mathrm{HA}]}\\right)',
    tags: ['acid-base', 'buffer'],
    order: 140,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Arrhenius Equation',
    description: 'Temperature dependence of reaction rate constants',
    latex: 'k = A e^{-E_{a} / (RT)}',
    tags: ['kinetics'],
    order: 150,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Gibbs Free Energy',
    latex: '\\Delta G = \\Delta H - T \\Delta S',
    tags: ['thermodynamics'],
    order: 160,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Equilibrium and ΔG°',
    description: 'Standard Gibbs free energy and equilibrium constant',
    latex: '\\Delta G^{\\circ} = -RT \\ln K',
    tags: ['equilibrium', 'thermodynamics'],
    order: 170,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Nernst Equation',
    latex: 'E = E^{\\circ} - \\frac{RT}{nF} \\ln Q',
    tags: ['electrochemistry'],
    order: 180,
  },
  {
    subjectSlug: 'chemistry',
    name: 'Percentage Yield',
    latex: '\\% \\text{ yield} = \\frac{\\text{actual}}{\\text{theoretical}} \\times 100\\%',
    tags: ['stoichiometry'],
    order: 190,
  },

  // ─── Biology (light) ─────────────────────────────────────────────────────
  {
    subjectSlug: 'biology',
    name: 'Hardy–Weinberg Genotype Frequencies',
    latex: 'p^{2} + 2pq + q^{2} = 1',
    tags: ['genetics', 'population'],
    order: 10,
  },
  {
    subjectSlug: 'biology',
    name: 'Hardy–Weinberg Allele Frequencies',
    latex: 'p + q = 1',
    tags: ['genetics', 'population'],
    order: 20,
  },
  {
    subjectSlug: 'biology',
    name: 'Photosynthesis (overall)',
    description: 'Glucose synthesis from CO₂ and water',
    latex: '6\\,\\mathrm{CO}_{2} + 6\\,\\mathrm{H}_{2}\\mathrm{O} \\xrightarrow{\\text{light}} \\mathrm{C}_{6}\\mathrm{H}_{12}\\mathrm{O}_{6} + 6\\,\\mathrm{O}_{2}',
    tags: ['photosynthesis'],
    order: 30,
  },
  {
    subjectSlug: 'biology',
    name: 'Cellular Respiration (overall)',
    latex: '\\mathrm{C}_{6}\\mathrm{H}_{12}\\mathrm{O}_{6} + 6\\,\\mathrm{O}_{2} \\rightarrow 6\\,\\mathrm{CO}_{2} + 6\\,\\mathrm{H}_{2}\\mathrm{O} + \\text{energy}',
    tags: ['respiration'],
    order: 40,
  },

  // ─── Financial Accounting ────────────────────────────────────────────────
  {
    subjectSlug: 'financial-accounting',
    name: 'Accounting Equation',
    latex: '\\text{Assets} = \\text{Liabilities} + \\text{Equity}',
    tags: ['fundamentals'],
    order: 10,
  },
  {
    subjectSlug: 'financial-accounting',
    name: 'Gross Profit',
    latex: '\\text{Gross Profit} = \\text{Revenue} - \\text{COGS}',
    tags: ['profit'],
    order: 20,
  },
  {
    subjectSlug: 'financial-accounting',
    name: 'Net Profit',
    latex: '\\text{Net Profit} = \\text{Gross Profit} - \\text{Operating Expenses}',
    tags: ['profit'],
    order: 30,
  },
  {
    subjectSlug: 'financial-accounting',
    name: 'Current Ratio',
    latex: '\\text{Current Ratio} = \\frac{\\text{Current Assets}}{\\text{Current Liabilities}}',
    tags: ['ratios', 'liquidity'],
    order: 40,
  },
  {
    subjectSlug: 'financial-accounting',
    name: 'Straight-Line Depreciation',
    latex: '\\text{Depreciation} = \\frac{\\text{Cost} - \\text{Salvage}}{\\text{Useful Life}}',
    tags: ['depreciation'],
    order: 50,
  },

  // ─── Computer Science ────────────────────────────────────────────────────
  {
    subjectSlug: 'computer-science',
    name: 'Big-O Definition',
    description: 'f(n) = O(g(n)) iff there exist c, n₀ > 0 such that f(n) ≤ c·g(n) for all n ≥ n₀',
    latex: 'f(n) = O(g(n))',
    tags: ['complexity', 'asymptotic'],
    order: 10,
  },
  {
    subjectSlug: 'computer-science',
    name: 'Logarithm Bases (Big-O)',
    description: 'Logarithm base is irrelevant in big-O notation',
    latex: 'O(\\log_{a} n) = O(\\log_{b} n)',
    tags: ['complexity'],
    order: 20,
  },
  {
    subjectSlug: 'computer-science',
    name: 'Master Theorem (Case 2)',
    description: 'For T(n) = aT(n/b) + Θ(n^d) with a = b^d',
    latex: 'T(n) = \\Theta(n^{d} \\log n)',
    tags: ['complexity', 'recurrence'],
    order: 30,
  },
];

export async function seedEquationLibrary(prisma: PrismaClient): Promise<SeedRunResult> {
  const startedAt = Date.now();

  const subjects = await prisma.canonicalSubject.findMany({
    where: { slug: { in: Array.from(new Set(EQUATIONS.map((e) => e.subjectSlug))) } },
    select: { id: true, slug: true },
  });
  const subjectIdBySlug = new Map(subjects.map((s) => [s.slug, s.id]));

  let upserted = 0;
  let skipped = 0;
  const missingSubjectSlugs = new Set<string>();
  for (const eq of EQUATIONS) {
    const subjectId = subjectIdBySlug.get(eq.subjectSlug);
    if (!subjectId) {
      missingSubjectSlugs.add(eq.subjectSlug);
      skipped += 1;
      continue;
    }
    await prisma.equationLibraryItem.upsert({
      where: {
        canonicalSubjectId_name: {
          canonicalSubjectId: subjectId,
          name: eq.name,
        },
      },
      update: {
        description: eq.description ?? null,
        latex: eq.latex,
        tags: eq.tags,
        order: eq.order,
        isActive: true,
      },
      create: {
        canonicalSubjectId: subjectId,
        name: eq.name,
        description: eq.description,
        latex: eq.latex,
        tags: eq.tags,
        order: eq.order,
      },
    });
    upserted += 1;
  }

  return {
    upserted,
    skipped,
    durationMs: Date.now() - startedAt,
    notes:
      missingSubjectSlugs.size > 0
        ? `Skipped equations for missing canonical subject(s): ${Array.from(missingSubjectSlugs).join(', ')}. Run canonical-subjects first.`
        : undefined,
  };
}
