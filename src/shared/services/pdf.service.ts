import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { StudentResultsData } from '../../components/bff/student/types';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  static readonly VALID_TEMPLATES = [
    'classic',
    'modern',
    'traditional',
    'colorful',
    'professional',
  ] as const;

  // Default school crest SVG as data URI — used when school has no logo
  private static readonly DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" fill="none">
    <path d="M60 0L120 30V70C120 105 95 130 60 140C25 130 0 105 0 70V30L60 0Z" fill="#2c3e50"/>
    <path d="M60 8L112 34V70C112 101 90 124 60 133C30 124 8 101 8 70V34L60 8Z" fill="#34495e"/>
    <path d="M60 16L104 38V70C104 97 85 118 60 126C35 118 16 97 16 70V38L60 16Z" fill="#2c3e50"/>
    <circle cx="60" cy="58" r="20" fill="#3498db" opacity="0.9"/>
    <path d="M50 58L55 52H65L70 58L65 64H55L50 58Z" fill="#ecf0f1"/>
    <rect x="56" y="42" width="8" height="10" rx="1" fill="#ecf0f1"/>
    <path d="M48 80H72V82C72 85 67 88 60 88C53 88 48 85 48 82V80Z" fill="#ecf0f1" opacity="0.7"/>
    <rect x="58" y="72" width="4" height="10" fill="#ecf0f1" opacity="0.7"/>
    <path d="M42 98H78" stroke="#3498db" stroke-width="2" opacity="0.5"/>
    <path d="M46 104H74" stroke="#3498db" stroke-width="1.5" opacity="0.3"/>
  </svg>`;

  private static readonly DEFAULT_LOGO_DATA_URI =
    'data:image/svg+xml;base64,' +
    Buffer.from(PdfService.DEFAULT_LOGO_SVG).toString('base64');

  static readonly TEMPLATE_INFO = [
    { id: 'classic', name: 'Classic', description: 'Dark header with blue accents' },
    { id: 'modern', name: 'Modern', description: 'Clean minimalist design with gradient header' },
    { id: 'traditional', name: 'Traditional', description: 'Formal bordered design with serif fonts' },
    { id: 'colorful', name: 'Colorful', description: 'Bright student-friendly design with rounded elements' },
    { id: 'professional', name: 'Professional', description: 'Corporate formal style with subtle grey tones' },
  ];

  async onModuleInit() {
    this.registerHelpers();
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      this.logger.log('Puppeteer browser launched successfully');
    } catch (error) {
      this.logger.error('Failed to launch Puppeteer browser', error);
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }

  async generateStudentResultPDF(
    resultsData: StudentResultsData,
    templateId: string = 'classic',
  ): Promise<Buffer> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    const template = this.getTemplate(templateId);

    const totalMaxScore = resultsData.assessmentStructures.reduce(
      (sum, a) => sum + a.maxScore,
      0,
    );

    const logoSrc = resultsData.school.logoUrl || PdfService.DEFAULT_LOGO_DATA_URI;

    const html = template({
      ...resultsData,
      logoSrc,
      termStartDate: this.formatDate(resultsData.term.startDate),
      termEndDate: this.formatDate(resultsData.term.endDate),
      generatedDate: this.formatDate(new Date()),
      totalMaxScore,
      subjects: resultsData.subjects.map((s, i) => ({
        ...s,
        serialNumber: i + 1,
        remark: this.getPerformanceRemark(s.grade, s.totalScore, totalMaxScore),
        remarkColor: this.getRemarkColor(
          this.getPerformanceRemark(s.grade, s.totalScore, totalMaxScore),
        ),
        scoreColor: this.getScoreColorClass(s.totalScore, totalMaxScore),
        gradeColor: this.getGradeColor(s.grade),
      })),
    });

    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private getTemplate(templateId: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    // Try multiple paths: ts-node/dev (__dirname relative), then production paths
    // In dev: __dirname = src/shared/services → ../templates works
    // In prod: __dirname = dist/src/shared/services → need to go up further
    const candidates = [
      join(__dirname, '..', 'templates', 'results', `${templateId}.hbs`),
      join(__dirname, '..', '..', '..', 'shared', 'templates', 'results', `${templateId}.hbs`),
      join(process.cwd(), 'dist', 'shared', 'templates', 'results', `${templateId}.hbs`),
      join(process.cwd(), 'dist', 'src', 'shared', 'templates', 'results', `${templateId}.hbs`),
    ];
    const templatePath = candidates.find((p) => existsSync(p));
    if (!templatePath) {
      throw new Error(`Template "${templateId}" not found. Searched: ${candidates.join(', ')}`);
    }
    const source = readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(templateId, compiled);
    return compiled;
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatDate', (date: Date) => this.formatDate(date));

    Handlebars.registerHelper('add', (a: number, b: number) => a + b);

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    Handlebars.registerHelper('capitalize', (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
    );

    Handlebars.registerHelper('scoreColor', (score: number, maxScore: number) => {
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      if (percentage >= 70) return 'score-excellent';
      if (percentage >= 60) return 'score-good';
      if (percentage >= 50) return 'score-fair';
      if (percentage >= 40) return 'score-poor';
      return 'score-weak';
    });

    Handlebars.registerHelper('gradeColor', (grade: string) => this.getGradeColor(grade));

    Handlebars.registerHelper('performanceRemark', (grade: string, score: number, maxScore: number) =>
      this.getPerformanceRemark(grade, score, maxScore),
    );

    Handlebars.registerHelper('fixed', (num: number, decimals: number) =>
      typeof num === 'number' ? num.toFixed(decimals) : '0',
    );

    Handlebars.registerHelper('or', (a: any, b: any) => a || b);

    Handlebars.registerHelper('json', (context: any) => JSON.stringify(context));
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getPerformanceRemark(
    grade: string | undefined,
    totalScore: number,
    totalMaxScore: number,
  ): string {
    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    if (grade === 'A' || percentage >= 70) return 'Excellent';
    if (grade === 'B' || percentage >= 60) return 'Very Good';
    if (grade === 'C' || percentage >= 50) return 'Good';
    if (grade === 'D' || percentage >= 45) return 'Fair';
    if (grade === 'E' || percentage >= 40) return 'Poor';
    return 'Weak';
  }

  private getRemarkColor(remark: string): string {
    switch (remark) {
      case 'Excellent': return '#27ae60';
      case 'Very Good': return '#2ecc71';
      case 'Good': return '#3498db';
      case 'Fair': return '#f39c12';
      case 'Poor': return '#e67e22';
      default: return '#e74c3c';
    }
  }

  private getScoreColorClass(score: number, maxScore: number): string {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 70) return '#27ae60';
    if (percentage >= 60) return '#2ecc71';
    if (percentage >= 50) return '#3498db';
    if (percentage >= 40) return '#f39c12';
    return '#e74c3c';
  }

  private getGradeColor(grade: string | undefined): string {
    switch (grade) {
      case 'A': return '#27ae60';
      case 'B': return '#2ecc71';
      case 'C': return '#3498db';
      case 'D': return '#f39c12';
      case 'E': return '#e67e22';
      default: return '#e74c3c';
    }
  }
}
