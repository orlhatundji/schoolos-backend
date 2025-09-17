import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');

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
          size: 'A4',
          margins: {
            top: 40,
            bottom: 40,
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

        // Header with school details
        this.addHeader(doc);

        // Student and Academic information in 2-column layout
        this.addStudentAndAcademicInfo(doc, resultsData);

        // Results table with numbering
        this.addResultsTable(doc, resultsData);

        // Remarks section only
        this.addRemarks(doc);

        // Footer with signatures
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: any) {
    // School name (centered, large, bold)
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('black')
      .text('BRIGHT FUTURE HIGH SCHOOL', { align: 'center' });

    // School motto or address
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Excellence in Education', { align: 'center' })
      .text('Lagos, Nigeria', { align: 'center' })
      .moveDown(1);

    // Report title
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('ACADEMIC REPORT CARD', { align: 'center' })
      .moveDown(1);

    // Line separator
    doc.strokeColor('black').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);
  }

  private addStudentAndAcademicInfo(doc: any, resultsData: StudentResultData) {
    const startY = doc.y;
    const leftColumnX = 40;
    const rightColumnX = 300;
    const labelWidth = 120;
    const valueWidth = 180;

    // Student Information (Left Column)

    doc
      .fillColor('black')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Student Information', leftColumnX, startY, { underline: true });

    const studentInfo = [
      ['Student Name:', `${resultsData.student.fullName}`],
      ['Student Number:', `${resultsData.student.studentNo}`],
      ['Class:', `${resultsData.student.classArm.level.name} ${resultsData.student.classArm.name}`],
    ];

    doc.fillColor('black').fontSize(11).font('Helvetica');

    let currentY = startY + 20;
    studentInfo.forEach(([label, value]) => {
      // Label
      doc.text(label, leftColumnX, currentY, { width: labelWidth });
      // Value
      doc
        .font('Helvetica-Bold')
        .fillColor('black')
        .text(value, leftColumnX + labelWidth + 5, currentY, { width: valueWidth });
      doc.font('Helvetica').fillColor('black'); // Reset to normal font and color
      currentY += 18;
    });

    // Academic Information (Right Column)

    doc
      .fillColor('black')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Academic Information', rightColumnX, startY, { underline: true });

    const academicInfo = [
      ['Academic Session:', `${resultsData.academicSession.academicYear}`],
      ['Term:', `${resultsData.term.name}`],
      [
        'Term Period:',
        `${this.formatDate(resultsData.term.startDate)} - ${this.formatDate(resultsData.term.endDate)}`,
      ],
    ];

    doc.fillColor('black').fontSize(11).font('Helvetica');

    currentY = startY + 20;
    academicInfo.forEach(([label, value]) => {
      // Label
      doc.text(label, rightColumnX, currentY, { width: labelWidth });
      // Value
      doc
        .font('Helvetica-Bold')
        .fillColor('black')
        .text(value, rightColumnX + labelWidth + 5, currentY, { width: valueWidth });
      doc.font('Helvetica').fillColor('black'); // Reset to normal font and color
      currentY += 18;
    });

    // Set document position to continue after both columns with proper spacing
    const maxY = Math.max(
      startY + 20 + studentInfo.length * 18,
      startY + 20 + academicInfo.length * 18,
    );
    doc.y = maxY + 20;
  }

  private addResultsTable(doc: any, resultsData: StudentResultData) {
    // Table headers - expanded to full width
    const tableTop = doc.y;
    const colWidths = [40, 200, 60, 60, 60, 60, 50];
    const colPositions = [40, 80, 280, 340, 400, 460, 520];

    // Header row with gradient-like background
    doc.fillColor('#2e7d32').rect(40, tableTop, 530, 30).fill();

    doc.fontSize(12).font('Helvetica-Bold').fillColor('white');

    const headers = ['S/N', 'Subject', 'Test 1', 'Test 2', 'Exam', 'Total', 'Grade'];
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], tableTop + 8, {
        width: colWidths[index],
        align: 'center',
      });
    });

    // Data rows
    let currentY = tableTop + 30;
    doc.fillColor('black');

    resultsData.subjects.forEach((subject, index) => {
      // Alternate row colors with better contrast
      if (index % 2 === 0) {
        doc.fillColor('#f1f8e9').rect(40, currentY, 530, 28).fill();
      } else {
        doc.fillColor('#e8f5e8').rect(40, currentY, 530, 28).fill();
      }

      doc.fillColor('black').fontSize(11).font('Helvetica');

      // Serial number
      doc.text((index + 1).toString(), colPositions[0], currentY + 8, {
        width: colWidths[0],
        align: 'center',
      });

      // Subject name
      doc.text(subject.name, colPositions[1], currentY + 8, { width: colWidths[1] });

      // Assessment scores with color coding
      const test1 = subject.assessments.find((a) => a.name === 'Test 1');
      const test2 = subject.assessments.find((a) => a.name === 'Test 2');
      const exam = subject.assessments.find((a) => a.name === 'Exam');

      // Color code scores based on performance
      const getScoreColor = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 80) return '#2e7d32'; // Green for excellent
        if (percentage >= 60) return '#f57c00'; // Orange for good
        return '#d32f2f'; // Red for poor
      };

      const test1Score = test1 ? test1.score : 0;
      const test2Score = test2 ? test2.score : 0;
      const examScore = exam ? exam.score : 0;

      doc
        .fillColor(getScoreColor(test1Score, 20))
        .text(test1 ? test1.score.toString() : '-', colPositions[2], currentY + 8, {
          width: colWidths[2],
          align: 'center',
        });

      doc
        .fillColor(getScoreColor(test2Score, 20))
        .text(test2 ? test2.score.toString() : '-', colPositions[3], currentY + 8, {
          width: colWidths[3],
          align: 'center',
        });

      doc
        .fillColor(getScoreColor(examScore, 60))
        .text(exam ? exam.score.toString() : '-', colPositions[4], currentY + 8, {
          width: colWidths[4],
          align: 'center',
        });

      doc.fillColor('black').text(subject.totalScore.toString(), colPositions[5], currentY + 8, {
        width: colWidths[5],
        align: 'center',
      });

      // Grade with color coding
      const gradeColor =
        subject.grade === 'A'
          ? '#2e7d32'
          : subject.grade === 'B'
            ? '#1976d2'
            : subject.grade === 'C'
              ? '#f57c00'
              : subject.grade === 'D'
                ? '#ff9800'
                : '#d32f2f';

      doc
        .font('Helvetica-Bold')
        .fillColor(gradeColor)
        .text(subject.grade || '-', colPositions[6], currentY + 8, {
          width: colWidths[6],
          align: 'center',
        });

      currentY += 28;
    });

    // Table border with color
    doc
      .strokeColor('#2e7d32')
      .lineWidth(2)
      .rect(40, tableTop, 530, currentY - tableTop)
      .stroke();

    doc.y = currentY + 15;
  }

  private addRemarks(doc: any) {
    const startY = doc.y;

    // Remarks section

    doc
      .fillColor('black')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Remarks:', 40, startY)
      .moveDown(0.3)
      .fillColor('black')
      .fontSize(11)
      .font('Helvetica')
      .text(
        'This student has shown excellent academic performance this term. Continue to maintain this high standard of excellence.',
        40,
        doc.y,
        { width: 500 },
      );

    doc.y = startY + 45;
  }

  private addFooter(doc: any) {
    const footerY = doc.y + 10;

    // Signature section

    // Signature lines
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#424242');

    // Class Teacher
    doc
      .text('Class Teacher:', 40, footerY)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('black')
      .text('_________________________', 40, footerY + 15)
      .text('Signature & Date', 40, footerY + 30, { width: 150, align: 'center' });

    // HOD
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#424242')
      .text('Head of Department:', 300, footerY)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('black')
      .text('_________________________', 300, footerY + 15)
      .text('Signature & Date', 200, footerY + 30, { width: 150, align: 'center' });

    // Principal
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#424242')
      .text('Principal:', 360, footerY)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('black')
      .text('_________________________', 360, footerY + 15)
      .text('Signature & Date', 360, footerY + 30, { width: 150, align: 'center' });

    // Footer line with color
    doc
      .strokeColor('#424242')
      .lineWidth(2)
      .moveTo(40, footerY + 45)
      .lineTo(530, footerY + 45)
      .stroke();

    // Generated date
    doc
      .fontSize(9)
      .fillColor('#666666')
      .text(`Generated on: ${new Date().toLocaleDateString()}`, 40, footerY + 55);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
