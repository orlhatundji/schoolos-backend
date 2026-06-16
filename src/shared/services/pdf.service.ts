import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { StudentResultsData } from '../../components/bff/student/types';
import { ReceiptTemplateData } from '../../components/payments/receipts/receipt-template-data';
import {
  hexWithAlpha,
  resolveResultPhotoBorderRadius,
  resolveResultThemeColor,
  resolveResultThemeTextColor,
} from '../utils/result-theme.util';
import {
  RESULT_TEMPLATE_DESCRIPTIONS,
  RESULT_TEMPLATE_DISPLAY_NAMES,
} from '../utils/result-template-meta';
import {
  PDF_MARGIN_MM,
  getResultPaperLayout,
  resolveResultPaperSize,
} from '../utils/result-paper-size.util';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  static readonly VALID_TEMPLATES = ['classic', 'traditional', 'professional', 'report-sheet'] as const;

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
    'data:image/svg+xml;base64,' + Buffer.from(PdfService.DEFAULT_LOGO_SVG).toString('base64');

  static readonly TEMPLATE_INFO = [
    {
      id: 'classic',
      name: RESULT_TEMPLATE_DISPLAY_NAMES.classic,
      description: RESULT_TEMPLATE_DESCRIPTIONS.classic,
    },
    {
      id: 'traditional',
      name: RESULT_TEMPLATE_DISPLAY_NAMES.traditional,
      description: RESULT_TEMPLATE_DESCRIPTIONS.traditional,
    },
    {
      id: 'professional',
      name: RESULT_TEMPLATE_DISPLAY_NAMES.professional,
      description: RESULT_TEMPLATE_DESCRIPTIONS.professional,
    },
    {
      id: 'report-sheet',
      name: RESULT_TEMPLATE_DISPLAY_NAMES['report-sheet'],
      description: RESULT_TEMPLATE_DESCRIPTIONS['report-sheet'],
    },
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

  private async ensureBrowser(): Promise<puppeteer.Browser> {
    // Check if the existing browser is still usable.
    // If it crashed or the connection dropped, relaunch it.
    if (this.browser) {
      try {
        // A quick connectivity check — throws if the connection is dead
        await this.browser.version();
        return this.browser;
      } catch {
        this.logger.warn('Browser connection lost, relaunching...');
        this.browser = null;
      }
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this.logger.log('Puppeteer browser relaunched successfully');
    return this.browser;
  }

  async generateStudentResultPDF(
    resultsData: StudentResultsData,
    templateId: string = 'professional',
  ): Promise<Buffer> {
    const template = this.getTemplate(templateId);

    const totalMaxScore = resultsData.assessmentStructures.reduce((sum, a) => sum + a.maxScore, 0);

    const logoSrc = resultsData.school.logoUrl || PdfService.DEFAULT_LOGO_DATA_URI;

    const previousTerms = resultsData.previousTerms ?? [];
    const hasPreviousTerms = previousTerms.length > 0;

    const gradesSummary = this.buildGradesSummary(resultsData.subjects);
    const themeColor = resolveResultThemeColor(
      templateId,
      resultsData.school.resultThemeColor,
    );
    const themeTextColor = resolveResultThemeTextColor(
      themeColor,
      resultsData.school.resultThemeTextColor,
    );
    const photoBorderRadius = resolveResultPhotoBorderRadius(
      resultsData.school.resultPhotoStyle,
    );
    const paperSize = resolveResultPaperSize(resultsData.school.resultPaperSize);
    const paperLayout = getResultPaperLayout(paperSize, PDF_MARGIN_MM);

    const html = template({
      ...resultsData,
      logoSrc,
      avatarSrc: resultsData.student.avatarUrl,
      themeColor,
      themeTextColor,
      themeRowBg: hexWithAlpha(themeColor, 0.06),
      photoBorderRadius,
      paperContentMinHeight: paperLayout.paperContentMinHeight,
      termStartDate: this.formatDate(resultsData.term.startDate),
      termEndDate: this.formatDate(resultsData.term.endDate),
      generatedDate: this.formatDate(new Date()),
      totalMaxScore,
      hasPreviousTerms,
      previousTerms,
      gradesSummary,
      subjects: resultsData.subjects.map((s, i) => ({
        ...s,
        serialNumber: i + 1,
        previousTermTotals: previousTerms.map(
          (pt) => pt.subjects.find((ps) => ps.subjectId === s.id)?.totalScore ?? null,
        ),
        // The Grade column on the printed report should reflect cumulative
        // performance (avg across terms shown), matching the on-screen UI.
        grade: s.cumulativeGrade ?? s.grade,
        remark: this.getPerformanceRemark(
          s.cumulativeGrade ?? s.grade,
          s.cumulativeTotal,
          totalMaxScore * (previousTerms.length + 1),
        ),
        remarkColor: this.getRemarkColor(
          this.getPerformanceRemark(
            s.cumulativeGrade ?? s.grade,
            s.cumulativeTotal,
            totalMaxScore * (previousTerms.length + 1),
          ),
        ),
        scoreColor: this.getScoreColorClass(s.totalScore, totalMaxScore),
        gradeColor: this.getGradeColor(s.cumulativeGrade ?? s.grade),
      })),
    });

    const browser = await this.ensureBrowser();
    const page = await browser.newPage();
    try {
      return await this.generateFixedPaperPdf(page, html, paperSize);
    } finally {
      await page.close();
    }
  }

  /**
   * Renders a report card on a fixed paper size. Templates use flex layout so
   * summary, remarks, and signatures anchor to the bottom of the printable area.
   */
  private async generateFixedPaperPdf(
    page: puppeteer.Page,
    html: string,
    paperSize: ReturnType<typeof resolveResultPaperSize>,
  ): Promise<Buffer> {
    const layout = getResultPaperLayout(paperSize, PDF_MARGIN_MM);

    await page.setViewport({
      width: layout.contentWidthPx,
      height: layout.contentHeightPx,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType('screen');
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: layout.spec.puppeteerFormat,
      printBackground: true,
      margin: {
        top: `${PDF_MARGIN_MM}mm`,
        bottom: `${PDF_MARGIN_MM}mm`,
        left: `${PDF_MARGIN_MM}mm`,
        right: `${PDF_MARGIN_MM}mm`,
      },
    });
    return Buffer.from(pdf);
  }

  async generateReceiptPDF(data: ReceiptTemplateData): Promise<Buffer> {
    await this.ensureBrowser();
    const template = this.getReceiptTemplate();
    const html = template(data);

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

  /**
   * Render the receipt HTML without producing a PDF. Used to inline the same
   * content in the email body so the recipient sees it without opening the
   * attachment.
   */
  renderReceiptHtml(data: ReceiptTemplateData): string {
    return this.getReceiptTemplate()(data);
  }

  async generateInvoicePDF(data: unknown): Promise<Buffer> {
    return this.generateFromHbs(this.getInvoiceTemplate(), data);
  }

  renderInvoiceHtml(data: unknown): string {
    return this.getInvoiceTemplate()(data);
  }

  async generateInvoicePaymentReceiptPDF(data: unknown): Promise<Buffer> {
    return this.generateFromHbs(this.getInvoicePaymentReceiptTemplate(), data);
  }

  renderInvoicePaymentReceiptHtml(data: unknown): string {
    return this.getInvoicePaymentReceiptTemplate()(data);
  }

  async generateInvoiceCorrectedHtml(data: unknown): Promise<string> {
    return this.getInvoiceCorrectedTemplate()(data);
  }

  private async generateFromHbs(
    template: HandlebarsTemplateDelegate,
    data: unknown,
  ): Promise<Buffer> {
    await this.ensureBrowser();
    const html = template(data);
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

  private getInvoiceTemplate(): HandlebarsTemplateDelegate {
    return this.loadHbsTemplate('invoices', 'invoice');
  }

  private getInvoicePaymentReceiptTemplate(): HandlebarsTemplateDelegate {
    return this.loadHbsTemplate('receipts', 'invoice-payment');
  }

  private getInvoiceCorrectedTemplate(): HandlebarsTemplateDelegate {
    return this.loadHbsTemplate('invoices', 'invoice-corrected');
  }

  private loadHbsTemplate(folder: string, name: string): HandlebarsTemplateDelegate {
    const cacheKey = `${folder}:${name}`;
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }
    const candidates = [
      join(__dirname, '..', 'templates', folder, `${name}.hbs`),
      join(__dirname, '..', '..', '..', 'shared', 'templates', folder, `${name}.hbs`),
      join(process.cwd(), 'dist', 'shared', 'templates', folder, `${name}.hbs`),
      join(process.cwd(), 'dist', 'src', 'shared', 'templates', folder, `${name}.hbs`),
      join(process.cwd(), 'src', 'shared', 'templates', folder, `${name}.hbs`),
    ];
    const templatePath = candidates.find((p) => existsSync(p));
    if (!templatePath) {
      throw new Error(`Template ${folder}/${name} not found. Searched: ${candidates.join(', ')}`);
    }
    const source = readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(cacheKey, compiled);
    return compiled;
  }

  private getReceiptTemplate(): HandlebarsTemplateDelegate {
    const cacheKey = 'receipt:standard';
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }
    const candidates = [
      join(__dirname, '..', 'templates', 'receipts', 'standard.hbs'),
      join(__dirname, '..', '..', '..', 'shared', 'templates', 'receipts', 'standard.hbs'),
      join(process.cwd(), 'dist', 'shared', 'templates', 'receipts', 'standard.hbs'),
      join(process.cwd(), 'dist', 'src', 'shared', 'templates', 'receipts', 'standard.hbs'),
      join(process.cwd(), 'src', 'shared', 'templates', 'receipts', 'standard.hbs'),
    ];
    const templatePath = candidates.find((p) => existsSync(p));
    if (!templatePath) {
      throw new Error(`Receipt template not found. Searched: ${candidates.join(', ')}`);
    }
    const source = readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(source);
    this.templateCache.set(cacheKey, compiled);
    return compiled;
  }

  private getTemplate(templateId: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    // Try multiple paths: ts-node/dev (__dirname relative), production dist paths,
    // then a final fallback that reads directly from the checked-out src/ folder.
    // The src/ fallback covers the case where `nest build` didn't copy assets
    // (intermittent on the Lightsail deploy) — the repo is still on disk.
    const candidates = [
      join(__dirname, '..', 'templates', 'results', `${templateId}.hbs`),
      join(__dirname, '..', '..', '..', 'shared', 'templates', 'results', `${templateId}.hbs`),
      join(process.cwd(), 'dist', 'shared', 'templates', 'results', `${templateId}.hbs`),
      join(process.cwd(), 'dist', 'src', 'shared', 'templates', 'results', `${templateId}.hbs`),
      join(process.cwd(), 'src', 'shared', 'templates', 'results', `${templateId}.hbs`),
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

    Handlebars.registerHelper(
      'performanceRemark',
      (grade: string, score: number, maxScore: number) =>
        this.getPerformanceRemark(grade, score, maxScore),
    );

    Handlebars.registerHelper('fixed', (num: number, decimals: number) =>
      typeof num === 'number' ? num.toFixed(decimals) : '0',
    );

    Handlebars.registerHelper('or', (a: any, b: any) => a || b);

    Handlebars.registerHelper('json', (context: any) => JSON.stringify(context));

    Handlebars.registerHelper('formatNaira', (amount: number) => {
      if (typeof amount !== 'number' || Number.isNaN(amount)) return '0.00';
      return amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    Handlebars.registerHelper('statusLabel', (status: string) => {
      switch (status) {
        case 'PAID':
          return 'PAID IN FULL';
        case 'PARTIAL':
          return 'PARTIAL PAYMENT';
        default:
          return status;
      }
    });
  }

  private buildGradesSummary(
    subjects: StudentResultsData['subjects'],
  ): string {
    const gradeCounts = new Map<string, number>();
    for (const subject of subjects) {
      const grade = subject.cumulativeGrade ?? subject.grade;
      if (!grade) continue;
      gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
    }
    return Array.from(gradeCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grade, count]) => `${count}(${grade})`)
      .join(', ');
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
      case 'Excellent':
        return '#27ae60';
      case 'Very Good':
        return '#2ecc71';
      case 'Good':
        return '#3498db';
      case 'Fair':
        return '#f39c12';
      case 'Poor':
        return '#e67e22';
      default:
        return '#e74c3c';
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
      case 'A':
        return '#27ae60';
      case 'B':
        return '#2ecc71';
      case 'C':
        return '#3498db';
      case 'D':
        return '#f39c12';
      case 'E':
        return '#e67e22';
      default:
        return '#e74c3c';
    }
  }
}
