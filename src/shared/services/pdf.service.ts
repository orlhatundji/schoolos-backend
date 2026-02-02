import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface AssessmentColumn {
  name: string;
  maxScore: number;
  isExam: boolean;
  order: number;
}

export interface StudentResultData {
  school: {
    name: string;
    motto?: string;
    logoUrl?: string;
    address?: string;
  };
  student: {
    fullName: string;
    studentNo: string;
    classArm: {
      level: { name: string };
      name: string;
    };
  };
  academicSession: {
    academicYear: string;
  };
  term: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  assessmentStructures: AssessmentColumn[];
  subjects: Array<{
    name: string;
    totalScore: number;
    grade?: string;
    assessments: Array<{
      name: string;
      score: number;
      maxScore?: number;
    }>;
  }>;
  overallStats: {
    totalSubjects: number;
    totalScore: number;
    averageScore: number;
    grade?: string;
    position?: number;
    totalStudents: number;
  };
}

@Injectable()
export class PdfService {
  async generateStudentResultPDF(resultsData: StudentResultData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'letter',
          margins: {
            top: 40,
            bottom: 10,
            left: 40,
            right: 40,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Modern vibrant header
        this.addModernHeader(doc, resultsData);

        // Card-style student and academic info
        this.addModernStudentAcademicInfo(doc, resultsData);

        // Results table with icons and vibrant colors
        this.addModernResultsTable(doc, resultsData);

        // Ensure summary and remarks are always together
        // Estimate required space: summary (30), remarks (40), footer (120)
        const requiredSpace = 30 + 40 + 120;
        // A4 page height is 842, minus top (40) and bottom (10) margins = 792
        // But PDFKit y starts at top margin, so max y is 842 - 10 = 832
        if (doc.y + requiredSpace > 832) {
          doc.addPage();
          doc.y = 40;
        }
        // Summary box for overall stats
        this.addSummaryBox(doc, resultsData);

        // Vibrant remarks section
        this.addVibrantRemarks(doc);

        // Modern footer
        this.addModernFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Elegant modern header with gradient-like design
  private addModernHeader(doc: any, resultsData: StudentResultData) {
    const school = resultsData.school;
    const schoolName = school.name.toUpperCase();
    const subtitle = [school.motto, school.address].filter(Boolean).join(' • ');
    // Generate initials from school name (first letter of each word, max 2)
    const initials = school.name
      .split(/\s+/)
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Main header background with gradient effect
    doc.rect(0, 0, 612, 80).fill('#2c3e50');
    doc.rect(0, 0, 612, 40).fill('#34495e');

    // School name with elegant typography
    doc.fillColor('#ecf0f1').fontSize(20).font('Helvetica-Bold');
    doc.text(schoolName, 0, 12, { align: 'center', width: 612 });
    if (subtitle) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#bdc3c7')
        .text(subtitle, 0, 35, { align: 'center', width: 612 });
    }

    // Elegant logo placeholder
    doc.circle(50, 40, 18).fill('#ecf0f1').stroke('#3498db', 2);
    doc
      .fillColor('#3498db')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(initials, 42, 34, { width: 16, align: 'center' });

    // Report title with modern styling
    doc.rect(206, 52, 200, 26).fill('#ecf0f1').stroke('#bdc3c7', 1);
    doc.fillColor('#2c3e50').fontSize(14).font('Helvetica-Bold');
    doc.text('ACADEMIC REPORT CARD', 206, 60, { align: 'center', width: 200 });

    // Decorative line
    doc.rect(0, 78, 612, 2).fill('#3498db');
    doc.y = 95;
  }

  // Elegant student and academic info with clean design
  private addModernStudentAcademicInfo(doc: any, resultsData: StudentResultData) {
    const startY = doc.y;

    // Subtle background section
    doc
      .rect(30, startY - 5, 552, 50)
      .fill('#f8f9fa')
      .stroke('#e9ecef', 0.5);

    // Student info with better column alignment
    // Student info with form-like layout in 2x3 grid
    // Column positions for perfect alignment
    const col1X = 40; // Left column (NAME, SESSION)
    const col2X = 220; // Center column (STUDENT NO, TERM)
    const col3X = 400; // Right column (CLASS, PERIOD)

    const lineHeight = 20;
    const firstRowY = startY + 8;
    const secondRowY = firstRowY + lineHeight;

    // First Row - NAME, STUDENT NO, CLASS
    // NAME
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('NAME: ', col1X, firstRowY);
    const nameX = col1X + doc.widthOfString('NAME: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text(resultsData.student.fullName, nameX, firstRowY);

    // STUDENT NO
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('STUDENT NO: ', col2X, firstRowY);
    const studentNoX = col2X + doc.widthOfString('STUDENT NO: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text(resultsData.student.studentNo, studentNoX, firstRowY);

    // CLASS
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('CLASS: ', col3X, firstRowY);
    const classX = col3X + doc.widthOfString('CLASS: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text(
      `${resultsData.student.classArm.level.name} ${resultsData.student.classArm.name}`,
      classX,
      firstRowY,
    );

    // Second Row - SESSION, TERM, PERIOD (aligned under first row)
    // SESSION
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('SESSION: ', col1X, secondRowY);
    const sessionX = col1X + doc.widthOfString('SESSION: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text(resultsData.academicSession.academicYear, sessionX, secondRowY);

    // TERM (perfectly under STUDENT NO)
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('TERM: ', col2X, secondRowY);
    const termX = col2X + doc.widthOfString('TERM: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text(resultsData.term.name, termX, secondRowY);

    // PERIOD (perfectly under CLASS)
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('PERIOD: ', col3X, secondRowY);
    const periodX = col3X + doc.widthOfString('PERIOD: ');
    doc.font('Helvetica-Bold').fillColor('#2c3e50');
    const periodText = `${this.formatDate(resultsData.term.startDate)} - ${this.formatDate(resultsData.term.endDate)}`;
    doc.text(periodText, periodX, secondRowY);
    doc.y = startY + 50;
  }

  // Elegant results table with professional design — dynamic assessment columns
  private addModernResultsTable(doc: any, resultsData: StudentResultData) {
    const tableTop = doc.y;
    const tableWidth = 552; // Full width minus margins
    const assessments = resultsData.assessmentStructures;
    const assessmentCount = assessments.length;

    // Build dynamic column layout:
    // Fixed columns: S/N (30), Subject (variable), Total (45), Grade (45), Remarks (70)
    const snWidth = 30;
    const totalWidth = 45;
    const gradeWidth = 45;
    const remarksWidth = 70;
    const fixedWidth = snWidth + totalWidth + gradeWidth + remarksWidth;

    // Distribute remaining space between Subject and assessment columns
    const remainingWidth = tableWidth - fixedWidth;
    // Each assessment column gets equal share, subject gets the rest
    const assessmentColWidth = Math.min(50, Math.floor(remainingWidth / (assessmentCount + 3)));
    const subjectWidth = remainingWidth - (assessmentColWidth * assessmentCount);

    // Build column widths and positions
    const colWidths: number[] = [snWidth, subjectWidth];
    assessments.forEach(() => colWidths.push(assessmentColWidth));
    colWidths.push(totalWidth, gradeWidth, remarksWidth);

    const colPositions: number[] = [30];
    for (let i = 1; i < colWidths.length; i++) {
      colPositions.push(colPositions[i - 1] + colWidths[i - 1]);
    }

    // Build header labels
    const headers: string[] = ['S/N', 'Subject'];
    assessments.forEach((a) => headers.push(a.name));
    headers.push('Total', 'Grade', 'Remarks');

    // Professional header with gradient
    doc.rect(30, tableTop, tableWidth, 35).fill('#34495e');
    doc.rect(30, tableTop, tableWidth, 3).fill('#3498db');
    doc.fontSize(assessmentCount > 4 ? 9 : assessmentCount > 3 ? 10 : 12).font('Helvetica-Bold').fillColor('#ecf0f1');
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], tableTop + 12, {
        width: colWidths[index],
        align: 'center',
      });
    });

    // Build assessment lookup by name for each structure
    const getScoreColor = (score: number, maxScore: number) => {
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      if (percentage >= 80) return '#27ae60';
      if (percentage >= 60) return '#f39c12';
      if (percentage >= 40) return '#e67e22';
      return '#e74c3c';
    };

    const totalMaxScore = assessments.reduce((sum, a) => sum + a.maxScore, 0);

    const getPerformanceRemark = (grade: string, totalScore: number) => {
      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      if (grade === 'A' || percentage >= 80) return 'Excellent';
      if (grade === 'B' || percentage >= 70) return 'Good';
      if (grade === 'C' || percentage >= 60) return 'Fair';
      if (grade === 'D' || percentage >= 50) return 'Poor';
      return 'Weak';
    };

    // Data rows with elegant styling
    let currentY = tableTop + 35;
    resultsData.subjects.slice(0, 12).forEach((subject, index) => {
      // Alternating row colors
      doc.rect(30, currentY, tableWidth, 30).fill(index % 2 === 0 ? '#f8f9fa' : '#ffffff');
      doc.rect(30, currentY, tableWidth, 30).stroke('#e9ecef', 0.5);

      doc.fontSize(10).font('Helvetica').fillColor('#495057');

      // S/N
      doc.text((index + 1).toString(), colPositions[0], currentY + 10, {
        width: colWidths[0],
        align: 'center',
      });

      // Subject name
      doc.font('Helvetica-Bold').text(subject.name, colPositions[1] + 3, currentY + 10, {
        width: colWidths[1] - 6,
      });
      doc.font('Helvetica');

      // Dynamic assessment score columns
      const assessmentMap = new Map(subject.assessments.map((a) => [a.name, a]));
      assessments.forEach((structure, colIdx) => {
        const assessment = assessmentMap.get(structure.name);
        const score = assessment ? assessment.score : 0;
        const maxScore = assessment?.maxScore || structure.maxScore;
        const posIdx = colIdx + 2; // offset past S/N and Subject

        doc.fillColor(getScoreColor(score, maxScore)).font('Helvetica-Bold');
        doc.text(assessment ? assessment.score.toString() : '-', colPositions[posIdx], currentY + 10, {
          width: colWidths[posIdx],
          align: 'center',
        });
      });

      // Total
      const totalColIdx = assessmentCount + 2;
      doc.fillColor('#2c3e50').fontSize(11).font('Helvetica-Bold');
      doc.text(subject.totalScore.toString(), colPositions[totalColIdx], currentY + 10, {
        width: colWidths[totalColIdx],
        align: 'center',
      });

      // Grade
      const gradeColIdx = totalColIdx + 1;
      const gradeColor =
        subject.grade === 'A' ? '#27ae60'
          : subject.grade === 'B' ? '#3498db'
            : subject.grade === 'C' ? '#f39c12'
              : subject.grade === 'D' ? '#e67e22'
                : '#e74c3c';
      doc.fillColor(gradeColor).fontSize(11).font('Helvetica-Bold');
      doc.text(`${subject.grade || '-'}`, colPositions[gradeColIdx], currentY + 10, {
        width: colWidths[gradeColIdx],
        align: 'center',
      });

      // Remarks
      const remarksColIdx = gradeColIdx + 1;
      const remark = getPerformanceRemark(subject.grade || '', subject.totalScore);
      const remarkColor =
        remark === 'Excellent' ? '#27ae60'
          : remark === 'Good' ? '#3498db'
            : remark === 'Fair' ? '#f39c12'
              : remark === 'Poor' ? '#e67e22'
                : '#e74c3c';
      doc.fillColor(remarkColor).fontSize(10).font('Helvetica-Bold');
      doc.text(remark, colPositions[remarksColIdx], currentY + 10, {
        width: colWidths[remarksColIdx],
        align: 'center',
      });

      currentY += 30;
    });

    // Professional table border
    doc.strokeColor('#34495e').lineWidth(2);
    doc.rect(30, tableTop, tableWidth, currentY - tableTop).stroke();
    doc.y = currentY + 20;
  }

  // Elegant remarks section
  private addVibrantRemarks(doc: any) {
    const startY = doc.y;
    const remarksText =
      'This student has shown excellent academic performance this term. Continue to maintain this high standard of excellence and strive for even greater achievements.';

    // Professional remarks box (full width)
    doc.rect(30, startY, 552, 50).fill('#f8f9fa').stroke('#e9ecef', 1);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text("Teacher's Remarks", 40, startY + 8);

    doc.fontSize(10).font('Helvetica').fillColor('#495057');
    doc.text(remarksText, 40, startY + 25, { width: 532, lineGap: 2 });
    doc.y = startY + 60;
  }

  // Professional footer design
  private addModernFooter(doc: any) {
    const footerY = doc.y + 15;

    // Signature section with elegant styling (full width)
    doc.rect(30, footerY, 552, 70).fill('#f8f9fa').stroke('#e9ecef', 1);

    // Class Teacher section
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text("Class Teacher's Remark:", 50, footerY + 12, { lineBreak: false });
    doc
      .moveTo(200, footerY + 24)
      .lineTo(562, footerY + 24)
      .strokeColor('#bdc3c7')
      .lineWidth(1)
      .stroke();

    // Principal section (on separate line)
    doc.text("Principal's Remark:", 50, footerY + 40, { lineBreak: false });
    doc
      .moveTo(180, footerY + 52)
      .lineTo(562, footerY + 52)
      .strokeColor('#bdc3c7')
      .lineWidth(1)
      .stroke();

    // Footer bar pinned to the absolute bottom of the page
    // Letter size = 792pt height, bar height = 25pt
    const pageHeight = 792;
    const barHeight = 25;
    const barY = pageHeight - barHeight;
    doc.rect(0, barY, 612, barHeight).fill('#2c3e50');
    doc.fontSize(9).fillColor('#ecf0f1');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, barY + 8, { lineBreak: false });
    doc.text('Powered by Schos', 450, barY + 8, { lineBreak: false });
  }
  // Elegant summary section
  private addSummaryBox(doc: any, resultsData: StudentResultData) {
    const startY = doc.y;

    // Professional summary box (full width)
    doc.rect(30, startY, 552, 35).fill('#ecf0f1').stroke('#bdc3c7', 1);
    doc.rect(30, startY, 552, 3).fill('#3498db');

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2c3e50');
    doc.text('Academic Summary', 40, startY + 8);

    const stats = resultsData.overallStats;
    const summaryText = `Total Subjects: ${stats.totalSubjects}  •  Total Score: ${stats.totalScore}  •  Average: ${stats.averageScore.toFixed(1)}%  •  Grade: ${stats.grade || 'N/A'}  •  Position: ${stats.position || 'N/A'} of ${stats.totalStudents}`;

    doc.fontSize(10).font('Helvetica').fillColor('#495057');
    doc.text(summaryText, 40, startY + 22, { width: 532 });
    doc.y = startY + 45;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
