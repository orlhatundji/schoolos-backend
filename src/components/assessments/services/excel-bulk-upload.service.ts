import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssessmentStructureTemplateService } from '../../assessment-structures/assessment-structure-template.service';
import * as ExcelJS from 'exceljs';

export interface StudentAssessmentTemplate {
  studentId: string;
  studentName: string;
  studentNo: string;
  [assessmentName: string]: string | number;
}

export interface BulkUploadResult {
  success: Array<{
    studentId: string;
    studentName: string;
    assessmentName: string;
    score: number;
    isExam: boolean;
  }>;
  failed: Array<{
    studentId: string;
    studentName: string;
    assessmentName: string;
    score: number;
    error: string;
  }>;
}

@Injectable()
export class ExcelBulkUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateService: AssessmentStructureTemplateService,
  ) {}

  /**
   * Generate Excel template for bulk assessment score upload
   */
  async generateTemplate(
    schoolId: string,
    subjectName: string,
    termName: string,
    sessionName: string,
    levelName: string,
    classArmName: string,
    teacherId: string,
  ): Promise<Buffer> {
    // Get academic session first (needed to find the template)
    const academicSession = await this.prisma.academicSession.findFirst({
      where: {
        academicYear: sessionName,
        schoolId,
        deletedAt: null,
      },
    });

    if (!academicSession) {
      // Check if any academic sessions exist for this school
      const availableSessions = await this.prisma.academicSession.findMany({
        where: { schoolId, deletedAt: null },
        select: { academicYear: true },
      });
      const sessionNames = availableSessions.map(s => s.academicYear).join(', ');
      throw new NotFoundException(`Academic session '${sessionName}' not found. Available sessions: ${sessionNames}`);
    }

    // Get assessment structures from the active template for this school/session
    const template = await this.templateService.findActiveTemplateForSchoolSession(
      schoolId,
      academicSession.id,
    );
    const assessmentStructures = (template.assessments as any[]).sort(
      (a: any, b: any) => a.order - b.order,
    );

    if (assessmentStructures.length === 0) {
      throw new BadRequestException('No assessment structures found for this school');
    }

    // Check if subject exists (case-insensitive)
    const subject = await this.prisma.subject.findFirst({
      where: {
        name: {
          equals: subjectName,
          mode: 'insensitive',
        },
        schoolId,
        deletedAt: null,
      },
    });

    if (!subject) {
      // Check if any subjects exist for this school
      const availableSubjects = await this.prisma.subject.findMany({
        where: { schoolId, deletedAt: null },
        select: { name: true },
      });
      const subjectNames = availableSubjects.map(s => s.name).join(', ');
      throw new NotFoundException(`Subject '${subjectName}' not found. Available subjects: ${subjectNames}`);
    }

    // Check if term exists (case-insensitive)
    const term = await this.prisma.term.findFirst({
      where: {
        name: {
          equals: termName,
          mode: 'insensitive',
        },
        academicSessionId: academicSession.id,
        deletedAt: null,
      },
    });

    if (!term) {
      // Check if any terms exist for this academic session
      const availableTerms = await this.prisma.term.findMany({
        where: { academicSessionId: academicSession.id, deletedAt: null },
        select: { name: true },
      });
      const termNames = availableTerms.map(t => t.name).join(', ');
      throw new NotFoundException(`Term '${termName}' not found for session '${sessionName}'. Available terms: ${termNames}`);
    }

    // Check if level exists (case-insensitive)
    const level = await this.prisma.level.findFirst({
      where: {
        name: {
          equals: levelName,
          mode: 'insensitive',
        },
        schoolId,
        deletedAt: null,
      },
    });

    if (!level) {
      // Check if any levels exist for this school
      const availableLevels = await this.prisma.level.findMany({
        where: { schoolId, deletedAt: null },
        select: { name: true },
      });
      const levelNames = availableLevels.map(l => l.name).join(', ');
      throw new NotFoundException(`Level '${levelName}' not found. Available levels: ${levelNames}`);
    }

    // Get the specific class arm (case-insensitive)
    const classArm = await this.prisma.classArm.findFirst({
      where: {
        name: {
          equals: classArmName,
          mode: 'insensitive',
        },
        levelId: level.id,
        schoolId,
        deletedAt: null,
      },
      include: {
        level: true,
      },
    });

    if (!classArm) {
      // Check if any class arms exist for this level
      const availableClassArms = await this.prisma.classArm.findMany({
        where: { levelId: level.id, schoolId, deletedAt: null },
        select: { name: true },
      });
      const classArmNames = availableClassArms.map(ca => ca.name).join(', ');
      throw new NotFoundException(`Class arm '${classArmName}' not found for level '${levelName}'. Available class arms: ${classArmNames}`);
    }

    // Get school information for context
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get teacher
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId: teacherId,
        user: {
          schoolId,
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Find or create ClassArmSubject for this class arm and subject
    const classArmSubject = await this.prisma.classArmSubject.upsert({
      where: { classArmId_subjectId: { classArmId: classArm.id, subjectId: subject.id } },
      create: { classArmId: classArm.id, subjectId: subject.id },
      update: {},
    });

    // Verify teacher has access to this class and subject
    // First check if there's a specific ClassArmSubjectTeacher record
    let teacherAccess = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        teacherId: teacher.id,
        classArmSubjectId: classArmSubject.id,
        deletedAt: null,
      },
    });

    // If no specific record, check if teacher has general access to the subject in the school
    if (!teacherAccess) {
      const generalTeacherAccess = await this.prisma.teacher.findFirst({
        where: {
          id: teacher.id,
          user: {
            schoolId: schoolId,
          },
          deletedAt: null,
        },
      });

      if (!generalTeacherAccess) {
        throw new BadRequestException(`Teacher not found in school`);
      }

      // If teacher exists in school, allow access (they can teach any subject in their school)
      // This is more flexible and allows teachers to work with subjects they're assigned to
    }

    // Get all students in the class first using ClassArmStudent relationship
    const classArmStudents = await this.prisma.classArmStudent.findMany({
      where: {
        classArmId: classArm.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        classArm: {
          include: {
            level: true,
          },
        },
      },
      orderBy: {
        student: {
          studentNo: 'asc',
        },
      },
    });
    
    if (classArmStudents.length === 0) {
      throw new NotFoundException(`No students found in ${levelName}${classArmName}`);
    }

    // Get existing assessments for students in this class arm subject and term
    const existingAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        classArmSubjectId: classArmSubject.id,
        termId: term.id,
        student: {
          classArmStudents: {
            some: {
              classArmId: classArm.id,
              isActive: true,
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
    });

    // Create a map of existing assessments by student ID
    const assessmentsByStudentId = new Map();
    existingAssessments.forEach((assessment) => {
      const existing = assessmentsByStudentId.get(assessment.studentId) || [];
      existing.push(assessment);
      assessmentsByStudentId.set(assessment.studentId, existing);
    });

    // Create the students array with all class students
    const students = classArmStudents.map((classArmStudent) => ({
      student: classArmStudent.student,
      assessments: assessmentsByStudentId.get(classArmStudent.student.id) || [],
    }));


    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${levelName} ${classArmName}`);

    // Store metadata in multiple hidden locations for redundancy and security
    const metadata = {
      subject: subjectName,
      term: termName,
      session: sessionName,
      level: levelName,
      classArm: classArmName,
      generatedAt: new Date().toISOString(),
      generatedBy: teacherId,
      schoolId: schoolId,
      classArmSubjectId: classArmSubject.id,
      classArmId: classArm.id,
      assessmentStructures: assessmentStructures.map((structure: any) => ({
        id: structure.id,
        name: structure.name,
        maxScore: structure.maxScore,
        isExam: structure.isExam,
      }))
    };

    // Store metadata after student data is added to avoid worksheet expansion
    const metadataJson = JSON.stringify(metadata);

    // Add context information at the top in the preferred format
    // Row 1: School name only
    worksheet.addRow([school.name]);
    
    // Row 2: Term, Session, Level, Class, Subject combined
    const contextLine = `${termName} ${sessionName} ${levelName} ${classArmName} ${subjectName}`;
    worksheet.addRow([contextLine]);
    
    // Style the context rows to make them more visible (no background color at row level)
    const schoolRow = worksheet.getRow(1);
    schoolRow.height = 25; // Increased row height
    schoolRow.font = { bold: true, size: 16, color: { argb: 'FF2C3E50' } };
    schoolRow.alignment = { horizontal: 'center', vertical: 'middle' };
    // Unlock the context cells so they're visible
    schoolRow.eachCell((cell) => {
      cell.protection = { locked: false };
    });
    
    const contextRow = worksheet.getRow(2);
    contextRow.height = 22; // Increased row height
    contextRow.font = { bold: true, size: 14, color: { argb: 'FF34495E' } };
    contextRow.alignment = { horizontal: 'center', vertical: 'middle' };
    // Unlock the context cells so they're visible
    contextRow.eachCell((cell) => {
      cell.protection = { locked: false };
    });
    
    // Empty row for spacing
    worksheet.addRow([]);

    // Create headers
    const headers = ['S/N', 'Student Name', 'Student Number'];
    assessmentStructures.forEach((structure) => {
      headers.push(`${structure.name} (Max: ${structure.maxScore})`);
    });

    // Add headers to worksheet
    worksheet.addRow(headers);

    // Calculate total columns for content area
    const totalColumns = 3 + assessmentStructures.length; // S/N + Student Name + Student Number + Assessment columns

    // Style headers (now on row 4 due to context information)
    const headerRow = worksheet.getRow(4);
    headerRow.height = 28; // Increased row height
    headerRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Apply background color and borders only to content area (columns 1 to totalColumns)
    for (let col = 1; col <= totalColumns; col++) {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3498DB' },
      };
      // Add borders to header cells
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    // Merge context cells to center them across all used columns
    worksheet.mergeCells(1, 1, 1, totalColumns); // Merge school name row
    worksheet.mergeCells(2, 1, 2, totalColumns); // Merge context line row
    
    // Apply background colors to the merged cells only
    const schoolMergedCell = worksheet.getCell(1, 1);
    schoolMergedCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F4FD' },
    };
    
    const contextMergedCell = worksheet.getCell(2, 1);
    contextMergedCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' },
    };

    // Add student data
    students.forEach((studentData, index) => {
      const row = [
        index + 1, // S/N column
        `${studentData.student.user.firstName} ${studentData.student.user.lastName}`,
        studentData.student.studentNo,
      ];

      // Add existing scores or empty cells
      assessmentStructures.forEach((structure) => {
        const existingAssessment = studentData.assessments.find(
          (assessment) => assessment.name === structure.name,
        );
        // Add as number, not string, for proper Google Sheets compatibility
        row.push(existingAssessment ? existingAssessment.score : null);
      });

      worksheet.addRow(row);
    });

    // Style student data rows with alternating backgrounds, borders, and consistent formatting
    students.forEach((_, index) => {
      const rowNumber = 5 + index; // Start from row 5 (after context + headers)
      const row = worksheet.getRow(rowNumber);
      
      // Set row height
      row.height = 22;
      
      // Alternating row backgrounds (consistent across content area A to last column)
      const isEvenRow = index % 2 === 0;
      const backgroundColor = isEvenRow ? 'FFFFFFFF' : 'FFF8F9FA'; // White and very light gray
      
      // Apply styling to each cell in content area only (columns 1 to totalColumns)
      for (let col = 1; col <= totalColumns; col++) {
        const cell = row.getCell(col);
        
        // Set background color
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor },
        };
        
        // Set font size to 14pt for all cells
        cell.font = { size: 14 };
        
        // Set alignment based on column type
        if (col === 1) { // S/N column
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col === 2 || col === 3) { // Student Name and Student Number columns
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else { // Score columns (columns 4 onwards)
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        // Add borders to all content cells
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      }
    });

    // Add data validation and number formatting for score columns
    assessmentStructures.forEach((structure, index) => {
      const columnIndex = index + 4; // After S/N, Student Name, Student Number
      const column = worksheet.getColumn(columnIndex);
      
      // Set number format for the entire column
      column.numFmt = '0'; // Integer format
      
      // Add validation for score range
      column.eachCell((cell, rowNumber) => {
        if (rowNumber > 4) { // Skip context rows and header row (rows 1-4)
          cell.dataValidation = {
            type: 'whole',
            operator: 'between',
            formulae: [0, structure.maxScore],
            showErrorMessage: true,
            errorTitle: 'Invalid Score',
            error: `Score must be between 0 and ${structure.maxScore}`,
          };
        }
      });
    });

    // Set column widths for better appearance
    worksheet.getColumn(1).width = 8; // S/N column
    worksheet.getColumn(2).width = 25; // Student Name
    worksheet.getColumn(3).width = 20; // Student Number (increased for full display)
    assessmentStructures.forEach((_, index) => {
      const columnIndex = index + 4;
      worksheet.getColumn(columnIndex).width = 18; // Score columns
    });

    // Protect the main worksheet to prevent structural changes
    worksheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertRows: false,
      insertColumns: false,
      insertHyperlinks: false,
      deleteRows: false,
      deleteColumns: false,
      sort: false,
      autoFilter: false,
      pivotTables: false,
      objects: false,
      scenarios: false,
    });

    // Store metadata after student data is added to avoid worksheet expansion
    // Context rows (2) + empty row (1) + header row (1) + student data
    const lastRow = 2 + 1 + 1 + students.length;
    
    // Store metadata in cells that are far from user data but after the actual data
    const primaryCell = worksheet.getCell(lastRow + 100, 100);
    primaryCell.value = metadataJson;
    primaryCell.font = { color: { argb: 'FFFFFFFF' } }; // White text (invisible)
    
    const secondaryCell = worksheet.getCell(lastRow + 200, 100);
    secondaryCell.value = metadataJson;
    secondaryCell.font = { color: { argb: 'FFFFFFFF' } }; // White text (invisible)
    
    const tertiaryCell = worksheet.getCell(lastRow + 300, 100);
    tertiaryCell.value = metadataJson;
    tertiaryCell.font = { color: { argb: 'FFFFFFFF' } }; // White text (invisible)

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  /**
   * Process uploaded Excel file and validate data
   */
  async processUpload(
    fileBuffer: Buffer,
    schoolId: string,
    teacherId: string,
    termId?: string,
  ): Promise<BulkUploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    // Get metadata from hidden cell or document properties
    const metadata = this.extractMetadataFromHiddenSources(workbook);
    if (!metadata) {
      throw new BadRequestException('Invalid template: Metadata not found in hidden sources');
    }

    // Validate metadata
    await this.validateMetadata(metadata, schoolId, teacherId);

    // If termId is provided, resolve the term by ID and override the metadata term name
    if (termId) {
      const termRecord = await this.prisma.term.findFirst({
        where: { id: termId, academicSession: { schoolId }, deletedAt: null },
      });
      if (!termRecord) {
        throw new NotFoundException(`Term with ID "${termId}" not found`);
      }
      if (termRecord.isLocked) {
        throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
      }
      metadata.termName = termRecord.name;
    } else {
      // Check lock on the term resolved from metadata
      const academicSession = await this.prisma.academicSession.findFirst({
        where: { academicYear: metadata.sessionName, schoolId, deletedAt: null },
      });
      if (academicSession) {
        const termRecord = await this.prisma.term.findFirst({
          where: { name: { equals: metadata.termName, mode: 'insensitive' }, academicSessionId: academicSession.id, deletedAt: null },
        });
        if (termRecord?.isLocked) {
          throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
        }
      }
    }

    // Get main data sheet (should be named after the class)
    const worksheet = workbook.worksheets[0]; // Get the first (and only) worksheet
    if (!worksheet) {
      throw new BadRequestException('Invalid template: No worksheet found');
    }

    // Process rows (start from row 5 due to context information and headers)
    const result: BulkUploadResult = { success: [], failed: [] };
    const rows = worksheet.getRows(5, worksheet.rowCount - 4) || [];

    for (const row of rows) {
      if (!row.getCell(1).value) continue; // Skip empty rows

        try {
          const studentName = row.getCell(2).value?.toString(); // Column 2 (after S/N)
          const studentNo = row.getCell(3).value?.toString(); // Column 3 (after S/N and Name)

        if (!studentName || !studentNo) {
          result.failed.push({
            studentId: 'Unknown',
            studentName: studentName || 'Unknown',
            assessmentName: 'Multiple',
            score: 0,
            error: 'Missing student name or student number',
          });
          continue;
        }

        // Find student by student number
        const student = await this.prisma.student.findFirst({
          where: {
            studentNo: studentNo,
            deletedAt: null,
          },
        });

        if (!student) {
          result.failed.push({
            studentId: 'Unknown',
            studentName: studentName,
            assessmentName: 'Multiple',
            score: 0,
            error: `Student with number ${studentNo} not found`,
          });
          continue;
        }

        // Process each assessment column (start from column 4 after S/N, Name, Number)
        for (let i = 4; i <= row.cellCount; i++) {
          const cell = row.getCell(i);
          const score = cell.value;

          if (score === null || score === undefined || score === '') {
            continue; // Skip empty cells
          }

          const numericScore = Number(score);
          if (isNaN(numericScore)) {
            result.failed.push({
              studentId: student.id,
              studentName,
              assessmentName: 'Unknown',
              score: 0,
              error: `Invalid score: ${score}`,
            });
            continue;
          }

          // Get assessment name from header (row 4)
          const headerCell = worksheet.getRow(4).getCell(i);
          const assessmentName = this.extractAssessmentName(headerCell.value?.toString() || '');

          try {
            await this.upsertAssessmentScore(
              student.id,
              metadata.subjectName,
              metadata.termName,
              metadata.sessionName,
              assessmentName,
              numericScore,
              schoolId,
              metadata.assessmentStructures,
            );

            result.success.push({
              studentId: student.id,
              studentName,
              assessmentName,
              score: numericScore,
              isExam: false, // Will be determined by assessment structure
            });
          } catch (error) {
            result.failed.push({
              studentId: student.id,
              studentName,
              assessmentName,
              score: numericScore,
              error: error.message,
            });
          }
        }
      } catch (error) {
        result.failed.push({
          studentId: 'Unknown',
          studentName: 'Unknown',
          assessmentName: 'Unknown',
          score: 0,
          error: error.message,
        });
      }
    }

    return result;
  }

  private extractMetadataFromHiddenSources(workbook: ExcelJS.Workbook) {
    // Try to get metadata from multiple hidden cell locations
    const worksheet = workbook.worksheets[0]; // Get the first (and only) worksheet
    if (!worksheet) {
      return null;
    }

    // Find the last row with data by checking multiple columns
    let lastDataRow = 1;
    for (let row = 1; row <= 1000; row++) {
      // Check if any of the first few columns have data
      let hasData = false;
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(row, col);
        if (cell.value && cell.value.toString().trim() !== '') {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        lastDataRow = row;
      } else if (row > 10) { // Stop after checking a reasonable number of rows
        break;
      }
    }

    // Check multiple hidden cell locations based on the last data row
    const hiddenLocations = [
      { row: lastDataRow + 100, col: 100 }, // Primary location
      { row: lastDataRow + 200, col: 100 }, // Secondary location
      { row: lastDataRow + 300, col: 100 }, // Tertiary location
      // Fallback locations in case lastDataRow calculation is off
      { row: 500, col: 100 },
      { row: 600, col: 100 },
      { row: 700, col: 100 },
      { row: 800, col: 100 },
      { row: 900, col: 100 },
      { row: 1000, col: 100 }
    ];

    for (const location of hiddenLocations) {
      try {
        const hiddenCell = worksheet.getCell(location.row, location.col);
        const metadataJson = hiddenCell.value?.toString();
        
        if (metadataJson && metadataJson.trim() !== '') {
          const metadata = JSON.parse(metadataJson);
          return {
            subjectName: metadata.subject,
            termName: metadata.term,
            sessionName: metadata.session,
            levelName: metadata.level,
            classArmName: metadata.classArm,
            schoolId: metadata.schoolId,
            classArmSubjectId: metadata.classArmSubjectId,
            classArmId: metadata.classArmId,
            teacherId: metadata.generatedBy,
            assessmentStructures: metadata.assessmentStructures
          };
        }
      } catch (error) {
        // Continue to next location
        continue;
      }
    }

    return null;
  }

  private extractMetadata(metadataSheet: ExcelJS.Worksheet) {
    const metadata: any = {};
    const rows = metadataSheet.getRows(1, 12) || [];

    rows.forEach((row) => {
      const key = row.getCell(1).value?.toString();
      const value = row.getCell(2).value?.toString();
      if (key && value) {
        switch (key) {
          case 'Subject':
            metadata.subjectName = value;
            break;
          case 'Term':
            metadata.termName = value;
            break;
          case 'Session':
            metadata.sessionName = value;
            break;
          case 'Level':
            metadata.levelName = value;
            break;
          case 'Class Arm':
            metadata.classArmName = value;
            break;
          case 'Generated By':
            metadata.teacherId = value;
            break;
          case 'School ID':
            metadata.schoolId = value;
            break;
          case 'Class Arm Subject ID':
            metadata.classArmSubjectId = value;
            break;
          case 'Class Arm ID':
            metadata.classArmId = value;
            break;
        }
      }
    });

    return metadata;
  }

  private async validateMetadata(metadata: any, schoolId: string, teacherId: string) {
    // Validate school ID matches
    if (metadata.schoolId !== schoolId) {
      throw new BadRequestException('Template is for a different school');
    }

    // Get teacher
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId: teacherId,
        user: {
          schoolId,
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validate teacher has access to this specific class and subject
    // First check if there's a specific ClassArmSubjectTeacher record
    let teacherAccess = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        teacherId: teacher.id,
        classArmSubjectId: metadata.classArmSubjectId,
        deletedAt: null,
      },
    });

    // If no specific record, allow access if teacher is in the same school
    // This is more flexible and allows teachers to work with subjects they're assigned to
    if (!teacherAccess) {
    }
  }

  private extractAssessmentName(headerText: string): string {
    // Extract assessment name from header like "Test 1 (Max: 20)"
    const match = headerText.match(/^([^(]+)/);
    return match ? match[1].trim() : headerText;
  }

  private generateSecurePassword(): string {
    // Generate a secure random password for metadata sheet protection
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }


  private async upsertAssessmentScore(
    studentId: string,
    subjectName: string,
    termName: string,
    sessionName: string,
    assessmentName: string,
    score: number,
    schoolId: string,
    metadataAssessments?: Array<{ id: string; name: string; maxScore: number; isExam: boolean }>,
  ) {
    // Get academic session first
    const academicSession = await this.prisma.academicSession.findFirst({
      where: {
        academicYear: sessionName,
        schoolId,
        deletedAt: null,
      },
    });

    if (!academicSession) {
      throw new NotFoundException('Academic session not found');
    }

    // Get subject (case-insensitive)
    const subject = await this.prisma.subject.findFirst({
      where: {
        name: {
          equals: subjectName,
          mode: 'insensitive',
        },
        schoolId,
        deletedAt: null,
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject '${subjectName}' not found`);
    }

    // Get term (case-insensitive)
    const term = await this.prisma.term.findFirst({
      where: {
        name: {
          equals: termName,
          mode: 'insensitive',
        },
        academicSessionId: academicSession.id,
        deletedAt: null,
      },
    });

    if (!term) {
      throw new NotFoundException(`Term '${termName}' not found for session '${sessionName}'`);
    }

    // Find the ClassArmSubject - we need to find which class arm the student belongs to
    const classArmStudent = await this.prisma.classArmStudent.findFirst({
      where: {
        studentId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!classArmStudent) {
      throw new NotFoundException('Student is not assigned to any class arm');
    }

    // Get or create ClassArmSubject
    const classArmSubject = await this.prisma.classArmSubject.upsert({
      where: { classArmId_subjectId: { classArmId: classArmStudent.classArmId, subjectId: subject.id } },
      create: { classArmId: classArmStudent.classArmId, subjectId: subject.id },
      update: {},
    });

    // Look up assessment type from metadata (embedded in Excel) or from the active template
    let assessmentEntry: { id: string; name: string; maxScore: number; isExam: boolean } | undefined;

    if (metadataAssessments) {
      assessmentEntry = metadataAssessments.find(
        (a) => a.name.toLowerCase() === assessmentName.toLowerCase(),
      );
    }

    if (!assessmentEntry) {
      // Fallback: look up from the active template
      const template = await this.templateService.findActiveTemplateForSchoolSession(
        schoolId,
        academicSession.id,
      );
      const entry = this.templateService.getAssessmentEntryByName(template, assessmentName);
      if (entry) {
        assessmentEntry = { id: entry.id, name: entry.name, maxScore: entry.maxScore, isExam: entry.isExam };
      }
    }

    // Upsert the assessment score using the unique constraint
    await this.prisma.classArmStudentAssessment.upsert({
      where: {
        classArmSubjectId_studentId_termId_name: {
          classArmSubjectId: classArmSubject.id,
          studentId,
          termId: term.id,
          name: assessmentName,
        },
      },
      create: {
        classArmSubjectId: classArmSubject.id,
        studentId,
        termId: term.id,
        name: assessmentName,
        score,
        isExam: assessmentEntry?.isExam || false,
        assessmentTypeId: assessmentEntry?.id,
        maxScore: assessmentEntry?.maxScore,
      },
      update: {
        score,
        isExam: assessmentEntry?.isExam || false,
        assessmentTypeId: assessmentEntry?.id,
        maxScore: assessmentEntry?.maxScore,
        deletedAt: null,
      },
    });
  }
}
