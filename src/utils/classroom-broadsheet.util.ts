import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { PrismaService } from '../prisma';
import { AssessmentStructureTemplateService } from '../components/assessment-structures/assessment-structure-template.service';
import {
  ClassroomBroadsheetData,
  ClassroomBroadsheetStudent,
  ClassroomBroadsheetStudentSubject,
} from '../components/bff/admin/types';

@Injectable()
export class ClassroomBroadsheetBuilder {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: AssessmentStructureTemplateService,
  ) {}

  async buildBroadsheetData(schoolId: string, classArmId: string): Promise<ClassroomBroadsheetData> {
    // 0. Get school name
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    // 1. Get current academic session with all terms
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
      include: {
        terms: { orderBy: { startDate: 'asc' } },
      },
    });

    if (!currentSession) {
      throw new NotFoundException('No active academic session found');
    }

    const terms = currentSession.terms;
    if (terms.length === 0) {
      throw new NotFoundException('No terms found for current session');
    }

    // 2. Get ClassArm with level
    const classArm = await this.prisma.classArm.findFirst({
      where: { id: classArmId, academicSessionId: currentSession.id, deletedAt: null },
      include: { level: true },
    });

    if (!classArm) {
      throw new NotFoundException('Class not found in current session');
    }

    // 3. Get all ClassArmSubjects for this class
    const classArmSubjects = await this.prisma.classArmSubject.findMany({
      where: { classArmId, deletedAt: null },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    // 4. Get all active students
    const classArmStudents = await this.prisma.classArmStudent.findMany({
      where: { classArmId, isActive: true },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true, gender: true } } },
        },
      },
      orderBy: { student: { user: { firstName: 'asc' } } },
    });

    // 5. Get assessment structure template
    const template = await this.templateService.findActiveTemplateForSchoolSession(
      schoolId,
      currentSession.id,
    );
    const assessmentTypes = ((template?.assessments as any[]) || [])
      .filter((a: any) => a.isActive !== false)
      .sort((a: any, b: any) => a.order - b.order);

    // 6. Get grading model
    const gradingModel = await this.prisma.gradingModel.findFirst({
      where: { schoolId, deletedAt: null },
    });

    // 7. Batch-fetch ALL assessments in one query
    const classArmSubjectIds = classArmSubjects.map((cas) => cas.id);
    const studentIds = classArmStudents.map((cas) => cas.studentId);
    const termIds = terms.map((t) => t.id);

    const allAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        classArmSubjectId: { in: classArmSubjectIds },
        studentId: { in: studentIds },
        termId: { in: termIds },
        deletedAt: null,
      },
    });

    // 8. Build nested Map: studentId -> classArmSubjectId -> termId -> assessment[]
    const assessmentMap = new Map<string, Map<string, Map<string, typeof allAssessments>>>();
    for (const assessment of allAssessments) {
      if (!assessmentMap.has(assessment.studentId)) {
        assessmentMap.set(assessment.studentId, new Map());
      }
      const studentMap = assessmentMap.get(assessment.studentId)!;

      if (!studentMap.has(assessment.classArmSubjectId)) {
        studentMap.set(assessment.classArmSubjectId, new Map());
      }
      const subjectMap = studentMap.get(assessment.classArmSubjectId)!;

      if (!subjectMap.has(assessment.termId)) {
        subjectMap.set(assessment.termId, []);
      }
      subjectMap.get(assessment.termId)!.push(assessment);
    }

    // Calculate total max score for percentage
    const totalMaxScore = assessmentTypes.reduce(
      (sum: number, a: any) => sum + (a.maxScore || 0),
      0,
    );

    // 9. Build student rows
    const students: ClassroomBroadsheetStudent[] = classArmStudents.map((cas) => {
      const student = cas.student;
      const studentAssessments = assessmentMap.get(student.id);

      const subjects: ClassroomBroadsheetStudentSubject[] = classArmSubjects.map((casub) => {
        const subjectAssessments = studentAssessments?.get(casub.id);

        const termScores = terms.map((term) => {
          const termAssessments = subjectAssessments?.get(term.id) || [];
          const total = termAssessments.reduce((sum, a) => sum + a.score, 0);
          const percentage = totalMaxScore > 0 ? Math.round((total / totalMaxScore) * 100 * 100) / 100 : 0;
          const grade = this.calculateGradeFromModel(percentage, gradingModel?.model);

          return {
            termId: term.id,
            total,
            percentage,
            grade,
          };
        });

        // Average across terms that have scores
        const termsWithScores = termScores.filter((ts) => ts.total > 0);
        const average =
          termsWithScores.length > 0
            ? Math.round(
                (termsWithScores.reduce((sum, ts) => sum + ts.percentage, 0) /
                  termsWithScores.length) *
                  100,
              ) / 100
            : 0;

        return {
          subjectId: casub.subjectId,
          subjectName: casub.subject.name,
          classArmSubjectId: casub.id,
          termScores,
          average,
        };
      });

      // 10. Overall average = average of all subject averages
      const subjectsWithScores = subjects.filter((s) => s.average > 0);
      const overallAverage =
        subjectsWithScores.length > 0
          ? Math.round(
              (subjectsWithScores.reduce((sum, s) => sum + s.average, 0) /
                subjectsWithScores.length) *
                100,
            ) / 100
          : 0;

      // Grand total = sum of all term totals across all subjects
      const grandTotal = subjects.reduce(
        (sum, s) => sum + s.termScores.reduce((tSum, ts) => tSum + ts.total, 0),
        0,
      );

      return {
        id: student.id,
        studentNo: student.studentNo,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        gender: student.user.gender || '',
        subjects,
        grandTotal,
        overallAverage,
        rank: 0,
        remarks: '',
      };
    });

    // 11. Dense rank by overallAverage descending
    const sorted = [...students].sort((a, b) => b.overallAverage - a.overallAverage);
    let rank = 0;
    let prevAvg = -1;
    for (const student of sorted) {
      if (student.overallAverage !== prevAvg) {
        rank++;
        prevAvg = student.overallAverage;
      }
      // Find the student in the original array and set rank
      const original = students.find((s) => s.id === student.id)!;
      original.rank = rank;
    }

    // 12. Remarks from grading model
    for (const student of students) {
      student.remarks = this.calculateGradeFromModel(student.overallAverage, gradingModel?.model);
    }

    return {
      schoolName: school?.name || '',
      classroom: {
        id: classArm.id,
        name: classArm.name,
        levelName: classArm.level?.name || '',
      },
      academicSession: {
        id: currentSession.id,
        name: currentSession.academicYear,
      },
      terms: terms.map((t) => ({
        id: t.id,
        name: t.name,
        isCurrent: t.isCurrent,
      })),
      subjects: classArmSubjects.map((cas) => ({
        id: cas.subjectId,
        name: cas.subject.name,
        classArmSubjectId: cas.id,
      })),
      assessmentStructure: assessmentTypes.map((a: any) => ({
        name: a.name,
        maxScore: a.maxScore,
        isExam: a.isExam,
        order: a.order,
      })),
      students,
      gradingModel: (gradingModel?.model as Record<string, [number, number]>) || null,
    };
  }

  async generateBroadsheetExcel(
    data: ClassroomBroadsheetData,
    termId?: string,
    isCumulative?: boolean,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Broadsheet');

    // Determine the effective term
    const effectiveTermId = termId || data.terms.find((t) => t.isCurrent)?.id || data.terms[0]?.id;
    const effectiveTermName = data.terms.find((t) => t.id === effectiveTermId)?.name || '';

    // For term-only mode, recalculate overallAverage, rank, remarks per selected term
    let students = data.students;
    if (!isCumulative && effectiveTermId) {
      const recalculated = students.map((student) => {
        const subjectPercentages: number[] = [];
        for (const subj of student.subjects) {
          const termScore = subj.termScores.find((ts) => ts.termId === effectiveTermId);
          if (termScore && termScore.total > 0) {
            subjectPercentages.push(termScore.percentage);
          }
        }
        const overallAverage =
          subjectPercentages.length > 0
            ? Math.round(
                (subjectPercentages.reduce((sum, p) => sum + p, 0) / subjectPercentages.length) * 100,
              ) / 100
            : 0;
        return { ...student, overallAverage, rank: 0, remarks: '' };
      });

      // Dense ranking
      const sorted = [...recalculated].sort((a, b) => b.overallAverage - a.overallAverage);
      let rank = 0;
      let prevAvg = -1;
      for (const s of sorted) {
        if (s.overallAverage !== prevAvg) {
          rank++;
          prevAvg = s.overallAverage;
        }
        s.rank = rank;
      }
      for (const s of recalculated) {
        s.remarks = this.calculateGradeFromModel(s.overallAverage, data.gradingModel);
      }
      students = recalculated;
    }

    // Build header row: S/N | Name | Student No | Gender | [Subject1] | [Subject2] | ... | Total | Rank | Remarks
    const headers: string[] = ['S/N', 'Name', 'Student No', 'Gender'];
    for (const subject of data.subjects) {
      headers.push(subject.name);
    }
    headers.push('Total', 'Rank', 'Remarks');

    // Title row
    const modeLabel = isCumulative ? 'Cumulative' : effectiveTermName;
    // School name row
    const schoolRow = sheet.addRow([data.schoolName]);
    sheet.mergeCells(1, 1, 1, headers.length);
    schoolRow.font = { bold: true, size: 16 };
    schoolRow.alignment = { horizontal: 'center' };

    // Broadsheet title row
    const titleRow = sheet.addRow([
      `Broadsheet - ${data.classroom.levelName} ${data.classroom.name} - ${data.academicSession.name} (${modeLabel})`,
    ]);
    sheet.mergeCells(2, 1, 2, headers.length);
    titleRow.font = { bold: true, size: 12 };
    titleRow.alignment = { horizontal: 'center' };

    // Empty row
    sheet.addRow([]);

    // Header row with rotated subject names
    const headerRow = sheet.addRow(headers);
    headerRow.height = 80;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      // Rotate all headers except S/N (col 1), Name (col 2), Student No (col 3)
      const shouldRotate = colNumber > 3;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'bottom',
        wrapText: !shouldRotate,
        textRotation: shouldRotate ? 90 : 0,
      };
    });

    // Data rows
    students.forEach((student, index) => {
      const rowData: (string | number)[] = [
        index + 1,
        student.fullName,
        student.studentNo,
        student.gender,
      ];

      for (const subject of student.subjects) {
        if (isCumulative) {
          // Cumulative: average percentage across terms
          rowData.push(Math.round(subject.average) || 0);
        } else {
          // Term-only: score for the selected term
          const termScore = subject.termScores.find((ts) => ts.termId === effectiveTermId);
          rowData.push(termScore?.total || 0);
        }
      }

      // Total: sum of all displayed subject scores
      let total = 0;
      for (const subject of student.subjects) {
        if (isCumulative) {
          total += Math.round(subject.average) || 0;
        } else {
          const termScore = subject.termScores.find((ts) => ts.termId === effectiveTermId);
          total += termScore?.total || 0;
        }
      }

      rowData.push(total, student.rank, student.remarks);

      const dataRow = sheet.addRow(rowData);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { horizontal: 'center' };
      });
      // Left-align name
      dataRow.getCell(2).alignment = { horizontal: 'left' };
    });

    // Auto-fit S/N, Name, Student No; narrow rotated columns sized to content
    sheet.columns.forEach((col, idx) => {
      if (idx <= 2) {
        // S/N, Name, Student No: auto-fit
        let maxWidth = 10;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > maxWidth) maxWidth = len;
        });
        col.width = Math.min(maxWidth + 2, 30);
      } else {
        // Rotated columns: fit to data content width (scores, rank, grades)
        let maxWidth = 4;
        let rowIdx = 0;
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          rowIdx++;
          // Skip school name (row 1), title (row 2), empty (row 3), header (row 4) since header is rotated
          if (rowIdx <= 4) return;
          const len = cell.value ? cell.value.toString().length : 0;
          if (len > maxWidth) maxWidth = len;
        });
        col.width = maxWidth + 2;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private calculateGradeFromModel(score: number, gradingModel: any): string {
    if (!gradingModel || typeof gradingModel !== 'object') {
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    }

    // Sort by min descending so the first match is the correct grade
    const sortedEntries = Object.entries(gradingModel)
      .filter(([, range]) => Array.isArray(range) && (range as number[]).length === 2)
      .sort((a, b) => (b[1] as [number, number])[0] - (a[1] as [number, number])[0]);

    for (const [grade, range] of sortedEntries) {
      const [min] = range as [number, number];
      if (score >= min) {
        return grade;
      }
    }

    return 'F';
  }
}
