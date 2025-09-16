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
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header with school details
        this.addHeader(doc, resultsData);
        
        // Student information section
        this.addStudentInfo(doc, resultsData);
        
        // Academic session and term info
        this.addAcademicInfo(doc, resultsData);
        
        // Results table
        this.addResultsTable(doc, resultsData);
        
        // Overall statistics
        this.addOverallStats(doc, resultsData);
        
        // Footer with signatures
        this.addFooter(doc, resultsData);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: any, resultsData: StudentResultData) {
    // School name (centered, large, bold)
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('BRIGHT FUTURE HIGH SCHOOL', { align: 'center' });

    // School motto or address
    doc.fontSize(10)
       .font('Helvetica')
       .text('Excellence in Education', { align: 'center' })
       .text('Lagos, Nigeria', { align: 'center' })
       .moveDown(1);

    // Report title
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('ACADEMIC REPORT CARD', { align: 'center' })
       .moveDown(1);

    // Line separator
    doc.strokeColor('black')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke()
       .moveDown(1);
  }

  private addStudentInfo(doc: any, resultsData: StudentResultData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('STUDENT INFORMATION', { underline: true })
       .moveDown(0.5);

    const studentInfo = [
      ['Student Name:', `${resultsData.student.fullName}`],
      ['Student Number:', `${resultsData.student.studentNo}`],
      ['Class:', `${resultsData.student.classArm.level.name} ${resultsData.student.classArm.name}`],
    ];

    doc.fontSize(10)
       .font('Helvetica');

    studentInfo.forEach(([label, value]) => {
      doc.text(label, 50, doc.y, { width: 150, continued: true })
         .font('Helvetica-Bold')
         .text(value, { width: 200 });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private addAcademicInfo(doc: any, resultsData: StudentResultData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('ACADEMIC INFORMATION', { underline: true })
       .moveDown(0.5);

    const academicInfo = [
      ['Academic Session:', `${resultsData.academicSession.academicYear}`],
      ['Term:', `${resultsData.term.name}`],
      ['Term Period:', `${this.formatDate(resultsData.term.startDate)} - ${this.formatDate(resultsData.term.endDate)}`],
    ];

    doc.fontSize(10)
       .font('Helvetica');

    academicInfo.forEach(([label, value]) => {
      doc.text(label, 50, doc.y, { width: 150, continued: true })
         .font('Helvetica-Bold')
         .text(value, { width: 200 });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private addResultsTable(doc: any, resultsData: StudentResultData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('ACADEMIC RESULTS', { underline: true })
       .moveDown(0.5);

    // Table headers
    const tableTop = doc.y;
    const colWidths = [200, 60, 60, 60, 60, 40];
    const colPositions = [50, 250, 310, 370, 430, 490];

    // Header row
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('white')
       .rect(50, tableTop, 500, 25)
       .fill('black')
       .fillColor('white');

    const headers = ['Subject', 'Test 1', 'Test 2', 'Exam', 'Total', 'Grade'];
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], tableTop + 8, { width: colWidths[index], align: 'center' });
    });

    // Data rows
    let currentY = tableTop + 25;
    doc.fillColor('black');

    resultsData.subjects.forEach((subject, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.fillColor('#f0f0f0')
           .rect(50, currentY, 500, 20)
           .fill();
      }

      doc.fillColor('black')
         .fontSize(9)
         .font('Helvetica');

      // Subject name
      doc.text(subject.name, colPositions[0], currentY + 6, { width: colWidths[0] });

      // Assessment scores
      const test1 = subject.assessments.find(a => a.name === 'Test 1');
      const test2 = subject.assessments.find(a => a.name === 'Test 2');
      const exam = subject.assessments.find(a => a.name === 'Exam');

      doc.text(test1 ? test1.score.toString() : '-', colPositions[1], currentY + 6, { width: colWidths[1], align: 'center' });
      doc.text(test2 ? test2.score.toString() : '-', colPositions[2], currentY + 6, { width: colWidths[2], align: 'center' });
      doc.text(exam ? exam.score.toString() : '-', colPositions[3], currentY + 6, { width: colWidths[3], align: 'center' });
      doc.text(subject.totalScore.toString(), colPositions[4], currentY + 6, { width: colWidths[4], align: 'center' });
      
      // Grade
      doc.font('Helvetica-Bold')
         .text(subject.grade || '-', colPositions[5], currentY + 6, { width: colWidths[5], align: 'center' });

      currentY += 20;
    });

    // Table border
    doc.strokeColor('black')
       .lineWidth(1)
       .rect(50, tableTop, 500, currentY - tableTop)
       .stroke();

    doc.y = currentY + 10;
  }

  private addOverallStats(doc: any, resultsData: StudentResultData) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('OVERALL PERFORMANCE', { underline: true })
       .moveDown(0.5);

    const stats = [
      ['Total Subjects:', `${resultsData.overallStats.totalSubjects}`],
      ['Total Score:', `${resultsData.overallStats.totalScore}`],
      ['Average Score:', `${resultsData.overallStats.averageScore.toFixed(1)}`],
      ['Overall Grade:', `${resultsData.overallStats.grade || 'N/A'}`],
      ['Position in Class:', `${resultsData.overallStats.position || 'N/A'} of ${resultsData.overallStats.totalStudents}`],
    ];

    doc.fontSize(10)
       .font('Helvetica');

    stats.forEach(([label, value]) => {
      doc.text(label, 50, doc.y, { width: 150, continued: true })
         .font('Helvetica-Bold')
         .text(value, { width: 200 });
      doc.moveDown(0.3);
    });

    doc.moveDown(2);
  }

  private addFooter(doc: any, resultsData: StudentResultData) {
    const footerY = 700; // Position footer near bottom of page

    // Signature lines
    doc.fontSize(10)
       .font('Helvetica');

    // Class Teacher
    doc.text('Class Teacher:', 50, footerY)
       .moveDown(2)
       .text('_________________________', 50, doc.y)
       .text('Signature & Date', 50, doc.y + 15, { width: 120, align: 'center' });

    // HOD
    doc.text('Head of Department:', 200, footerY)
       .moveDown(2)
       .text('_________________________', 200, doc.y)
       .text('Signature & Date', 200, doc.y + 15, { width: 120, align: 'center' });

    // Principal
    doc.text('Principal:', 350, footerY)
       .moveDown(2)
       .text('_________________________', 350, doc.y)
       .text('Signature & Date', 350, doc.y + 15, { width: 120, align: 'center' });

    // Remarks section
    doc.moveDown(3)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('REMARKS:', 50, doc.y)
       .moveDown(0.5)
       .font('Helvetica')
       .text('This student has shown excellent academic performance this term. ', 50, doc.y)
       .text('Continue to maintain this high standard of excellence.', 50, doc.y + 15);

    // Footer line
    doc.strokeColor('black')
       .lineWidth(1)
       .moveTo(50, 750)
       .lineTo(550, 750)
       .stroke();

    // Generated date
    doc.fontSize(8)
       .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 760);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
