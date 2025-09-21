import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface StudentResultData {
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
  subjects: Array<{
    name: string;
    totalScore: number;
    grade?: string;
    assessments: Array<{
      name: string;
      score: number;
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
        this.addModernHeader(doc);

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
  private addModernHeader(doc: any) {
    // Main header background with gradient effect
    doc.rect(0, 0, 612, 80).fill('#2c3e50');
    doc.rect(0, 0, 612, 40).fill('#34495e');

    // School name with elegant typography
    doc.fillColor('#ecf0f1').fontSize(20).font('Helvetica-Bold');
    doc.text('BRIGHT FUTURE HIGH SCHOOL', 0, 12, { align: 'center', width: 612 });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#bdc3c7')
      .text('Excellence in Education • Lagos, Nigeria', 0, 35, { align: 'center', width: 612 });

    // Elegant logo placeholder
    doc.circle(50, 40, 18).fill('#ecf0f1').stroke('#3498db', 2);
    doc
      .fillColor('#3498db')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('BF', 42, 34, { width: 16, align: 'center' });

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

  // Elegant results table with professional design
  private addModernResultsTable(doc: any, resultsData: StudentResultData) {
    const tableTop = doc.y;
    const tableWidth = 552; // Full width minus margins
    const colWidths = [35, 160, 50, 50, 50, 50, 50, 97];
    const colPositions = [30, 65, 225, 275, 325, 375, 425, 475];

    // Professional header with gradient
    doc.rect(30, tableTop, tableWidth, 35).fill('#34495e');
    doc.rect(30, tableTop, tableWidth, 3).fill('#3498db');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ecf0f1');
    const headers = ['S/N', 'Subject', 'Test 1', 'Test 2', 'Exam', 'Total', 'Grade', 'Remarks'];
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], tableTop + 12, {
        width: colWidths[index],
        align: 'center',
      });
    });

    // Data rows with elegant styling
    let currentY = tableTop + 35;
    resultsData.subjects.slice(0, 12).forEach((subject, index) => {
      // Alternating row colors with subtle styling
      if (index % 2 === 0) {
        doc.rect(30, currentY, tableWidth, 30).fill('#f8f9fa');
      } else {
        doc.rect(30, currentY, tableWidth, 30).fill('#ffffff');
      }

      // Add subtle row border
      doc.rect(30, currentY, tableWidth, 30).stroke('#e9ecef', 0.5);

      doc.fontSize(10).font('Helvetica').fillColor('#495057');

      // Serial number
      doc.text((index + 1).toString(), colPositions[0], currentY + 10, {
        width: colWidths[0],
        align: 'center',
      });

      // Subject name with better styling
      doc.font('Helvetica-Bold').text(subject.name, colPositions[1] + 5, currentY + 10, {
        width: colWidths[1] - 10,
      });
      doc.font('Helvetica');

      // Assessment scores with enhanced color coding
      const test1 = subject.assessments.find((a) => a.name === 'Test 1');
      const test2 = subject.assessments.find((a) => a.name === 'Test 2');
      const exam = subject.assessments.find((a) => a.name === 'Exam');

      const getScoreColor = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return '#27ae60';
        if (percentage >= 60) return '#f39c12';
        if (percentage >= 40) return '#e67e22';
        return '#e74c3c';
      };

      const test1Score = test1 ? test1.score : 0;
      const test2Score = test2 ? test2.score : 0;
      const examScore = exam ? exam.score : 0;

      // Test scores with better presentation
      doc.fillColor(getScoreColor(test1Score, 20)).font('Helvetica-Bold');
      doc.text(test1 ? test1.score.toString() : '-', colPositions[2], currentY + 10, {
        width: colWidths[2],
        align: 'center',
      });

      doc.fillColor(getScoreColor(test2Score, 20));
      doc.text(test2 ? test2.score.toString() : '-', colPositions[3], currentY + 10, {
        width: colWidths[3],
        align: 'center',
      });

      doc.fillColor(getScoreColor(examScore, 60));
      doc.text(exam ? exam.score.toString() : '-', colPositions[4], currentY + 10, {
        width: colWidths[4],
        align: 'center',
      });

      // Total score with emphasis
      doc.fillColor('#2c3e50').fontSize(11).font('Helvetica-Bold');
      doc.text(subject.totalScore.toString(), colPositions[5], currentY + 10, {
        width: colWidths[5],
        align: 'center',
      });

      // Grade with sophisticated color scheme
      const gradeColor =
        subject.grade === 'A'
          ? '#27ae60'
          : subject.grade === 'B'
            ? '#3498db'
            : subject.grade === 'C'
              ? '#f39c12'
              : subject.grade === 'D'
                ? '#e67e22'
                : '#e74c3c';

      doc.fillColor(gradeColor).fontSize(11).font('Helvetica-Bold');
      doc.text(`${subject.grade || '-'}`, colPositions[6], currentY + 10, {
        width: colWidths[6],
        align: 'center',
      });

      // Remarks based on performance
      const getPerformanceRemark = (grade: string, totalScore: number) => {
        const percentage = (totalScore / 100) * 100; // Assuming max total is 100

        if (grade === 'A' || percentage >= 80) return 'Excellent';
        if (grade === 'B' || percentage >= 70) return 'Good';
        if (grade === 'C' || percentage >= 60) return 'Fair';
        if (grade === 'D' || percentage >= 50) return 'Poor';
        return 'Weak';
      };

      const remark = getPerformanceRemark(subject.grade || '', subject.totalScore);
      const remarkColor =
        remark === 'Excellent'
          ? '#27ae60'
          : remark === 'Good'
            ? '#3498db'
            : remark === 'Fair'
              ? '#f39c12'
              : remark === 'Poor'
                ? '#e67e22'
                : '#e74c3c';

      doc.fillColor(remarkColor).fontSize(10).font('Helvetica-Bold');
      doc.text(remark, colPositions[7], currentY + 10, {
        width: colWidths[7],
        align: 'center',
      });

      currentY += 30;
    });

    // Professional table border
    doc.strokeColor('#34495e').lineWidth(2);
    doc.rect(30, tableTop, 552, currentY - tableTop).stroke();
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
    doc.text("Class Teacher's Remark:", 50, footerY + 12);
    doc
      .moveTo(200, footerY + 24)
      .lineTo(562, footerY + 24)
      .strokeColor('#bdc3c7')
      .lineWidth(1)
      .stroke();

    // Principal section (on separate line)
    doc.text("Principal's Remark:", 50, footerY + 40);
    doc
      .moveTo(180, footerY + 52)
      .lineTo(562, footerY + 52)
      .strokeColor('#bdc3c7')
      .lineWidth(1)
      .stroke();

    // Footer bar with branding (adjusted position)
    doc.rect(0, footerY + 80, 612, 25).fill('#2c3e50');
    doc.fontSize(9).fillColor('#ecf0f1');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, footerY + 88);
    doc.text('Powered by Schos', 450, footerY + 88);
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
