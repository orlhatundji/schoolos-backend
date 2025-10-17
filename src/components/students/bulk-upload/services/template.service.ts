import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

import { BaseService } from '../../../../common/base-service';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class TemplateService extends BaseService {
  constructor(private readonly prisma: PrismaService) {
    super(TemplateService.name);
  }

  async generateCsvTemplate(schoolId: string, res: Response): Promise<void> {
    try {
      // Get sample class arms for the school
      const classArms = await this.prisma.classArm.findMany({
        where: { schoolId, deletedAt: null },
        include: { level: true },
        take: 5, // Limit to 5 for template
      });

      // Create CSV headers
      const headers = [
        'firstName',
        'lastName',
        'gender',
        'dateOfBirth',
        'email',
        'phone',
        'classArmId',
        'admissionNo',
        'admissionDate',
        'guardianFirstName',
        'guardianLastName',
        'guardianEmail',
        'guardianPhone',
        'guardianRelationship',
      ];

      // Create sample data
      const sampleData = [
        [
          'John',
          'Doe',
          'MALE',
          '2012-05-15',
          'john.doe@school.com',
          '+234-XXX-XXX-XXXX',
          classArms[0]?.id || 'class-arm-id-1',
          'ADM001',
          '2025-09-01',
          'Jane',
          'Doe',
          'jane.doe@email.com',
          '+234-XXX-XXX-XXXX',
          'Mother',
        ],
        [
          'Alice',
          'Smith',
          'FEMALE',
          '2011-08-22',
          'alice.smith@school.com',
          '+234-XXX-XXX-XXXX',
          classArms[1]?.id || 'class-arm-id-2',
          'ADM002',
          '2025-09-01',
          'Robert',
          'Smith',
          'robert.smith@email.com',
          '+234-XXX-XXX-XXXX',
          'Father',
        ],
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      sampleData.forEach((row) => {
        csvContent += row.join(',') + '\n';
      });

      // Add instructions
      csvContent += '\n# Instructions:\n';
      csvContent += '# 1. Replace sample data with actual student information\n';
      csvContent +=
        '# 2. Ensure all required fields (firstName, lastName, gender, classArmId) are filled\n';
      csvContent += '# 3. Gender must be either MALE or FEMALE\n';
      csvContent += '# 4. Date format should be YYYY-MM-DD\n';
      csvContent += '# 5. Email addresses should be valid\n';
      csvContent += '# 6. classArmId must be a valid UUID from your school\n';
      csvContent += '# 7. Remove this instruction section before uploading\n';

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="student-upload-template.csv"');
      res.setHeader('Content-Length', Buffer.byteLength(csvContent));

      // Send CSV content
      res.send(csvContent);
    } catch (error) {
      this.logger.error('Error generating CSV template:', error);
      throw error;
    }
  }

  async getClassArmsForTemplate(schoolId: string): Promise<any[]> {
    try {
      // Get current academic session
      const currentSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
      });

      if (!currentSession) {
        // Return empty array if no current session
        return [];
      }

      const classArms = await this.prisma.classArm.findMany({
        where: { 
          schoolId, 
          academicSessionId: currentSession.id,
          deletedAt: null 
        },
        include: { level: true },
        orderBy: [{ level: { order: 'asc' } }, { name: 'asc' }],
      });

      return classArms.map((classArm) => ({
        id: classArm.id,
        name: `${classArm.level.name} ${classArm.name}`,
        levelName: classArm.level.name,
        className: classArm.name,
      }));
    } catch (error) {
      this.logger.error('Error fetching class arms for template:', error);
      throw error;
    }
  }

  async getTemplateInstructions(): Promise<any> {
    return {
      instructions: [
        {
          step: 1,
          title: 'Download Template',
          description: 'Download the CSV template with sample data and column headers',
        },
        {
          step: 2,
          title: 'Prepare Data',
          description:
            'Replace sample data with actual student information. Ensure all required fields are filled.',
        },
        {
          step: 3,
          title: 'Validate Data',
          description:
            'Check that gender is MALE or FEMALE, dates are in YYYY-MM-DD format, and emails are valid.',
        },
        {
          step: 4,
          title: 'Upload File',
          description: 'Upload the completed CSV file through the bulk import interface.',
        },
        {
          step: 5,
          title: 'Monitor Progress',
          description: 'Track the import progress and review any errors that occur.',
        },
      ],
      requiredFields: [
        { field: 'firstName', description: 'Student first name', example: 'John' },
        { field: 'lastName', description: 'Student last name', example: 'Doe' },
        { field: 'gender', description: 'Student gender', example: 'MALE or FEMALE' },
        {
          field: 'classArmId',
          description: 'Class arm UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      ],
      optionalFields: [
        { field: 'dateOfBirth', description: 'Student date of birth', example: '2012-05-15' },
        { field: 'email', description: 'Student email address', example: 'john.doe@school.com' },
        { field: 'phone', description: 'Student phone number', example: '+234-XXX-XXX-XXXX' },
        { field: 'admissionNo', description: 'Custom admission number', example: 'ADM001' },
        { field: 'admissionDate', description: 'Admission date', example: '2025-09-01' },
        { field: 'guardianFirstName', description: 'Guardian first name', example: 'Jane' },
        { field: 'guardianLastName', description: 'Guardian last name', example: 'Doe' },
        {
          field: 'guardianEmail',
          description: 'Guardian email address',
          example: 'jane.doe@email.com',
        },
        {
          field: 'guardianPhone',
          description: 'Guardian phone number',
          example: '+234-XXX-XXX-XXXX',
        },
        {
          field: 'guardianRelationship',
          description: 'Relationship to student',
          example: 'Mother',
        },
      ],
      fileLimits: {
        maxSize: '10MB',
        maxRecords: 5000,
        supportedFormats: ['CSV', 'XLSX', 'XLS'],
      },
    };
  }

  async generateExcelTemplate(schoolId: string, res: Response): Promise<void> {
    try {
      // Get class arms for the school with level information
      const classArms = await this.prisma.classArm.findMany({
        where: { schoolId, deletedAt: null },
        include: { level: true },
        orderBy: [{ level: { name: 'asc' } }, { name: 'asc' }],
      });

      // Create class options for dropdown (using human-readable names)
      const classOptions = classArms.map((classArm) => `${classArm.level.name} ${classArm.name}`);
      const genderOptions = ['MALE', 'FEMALE'];

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Define headers
      const headers = [
        'firstName',
        'lastName',
        'gender',
        'className',
        'dateOfBirth',
        'email',
        'phone',
        'admissionNo',
        'admissionDate',
        'guardianFirstName',
        'guardianLastName',
        'guardianEmail',
        'guardianPhone',
        'guardianRelationship',
      ];

      // Create sample data
      const sampleData = [
        [
          'John',
          'Doe',
          'MALE',
          classOptions[0] || 'Grade 1 A',
          '2012-05-15',
          'john.doe@school.com',
          '+234-XXX-XXX-XXXX',
          'ADM001',
          '2025-09-01',
          'Jane',
          'Doe',
          'jane.doe@email.com',
          '+234-XXX-XXX-XXXX',
          'Mother',
        ],
        [
          'Alice',
          'Smith',
          'FEMALE',
          classOptions[1] || 'Grade 1 B',
          '2011-08-22',
          'alice.smith@school.com',
          '+234-XXX-XXX-XXXX',
          'ADM002',
          '2025-09-01',
          'Robert',
          'Smith',
          'robert.smith@email.com',
          '+234-XXX-XXX-XXXX',
          'Father',
        ],
      ];

      // Combine headers and data
      const worksheetData = [headers, ...sampleData];

      // Create the main worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // firstName
        { wch: 15 }, // lastName
        { wch: 10 }, // gender
        { wch: 20 }, // className
        { wch: 12 }, // dateOfBirth
        { wch: 25 }, // email
        { wch: 18 }, // phone
        { wch: 12 }, // admissionNo
        { wch: 12 }, // admissionDate
        { wch: 18 }, // guardianFirstName
        { wch: 18 }, // guardianLastName
        { wch: 25 }, // guardianEmail
        { wch: 18 }, // guardianPhone
        { wch: 15 }, // guardianRelationship
      ];
      worksheet['!cols'] = colWidths;

      // Add data validation using direct comma-separated lists with XLSX workaround
      if (classOptions.length > 0) {
        // Use a direct list for data validation (most reliable approach)
        const genderValidation = {
          type: 'list',
          allowBlank: false,
          formula1: genderOptions.join(','),
          showDropDown: true,
        };

        const classValidation = {
          type: 'list',
          allowBlank: false,
          formula1: classOptions.join(','),
          showDropDown: true,
        };

        // Apply validation to a reasonable range (rows 2-1000)
        worksheet['!dataValidation'] = [
          {
            ref: 'C2:C1000', // Gender column
            ...genderValidation,
          },
          {
            ref: 'D2:D1000', // Class column
            ...classValidation,
          },
        ];
      }

      // Add the main worksheet
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      // Create class options worksheet for reference
      const classOptionsData = [
        ['Available Classes'],
        [''],
        ['Class Name', 'Description'],
        ...classOptions.map((className) => [className, 'Select this class for your students']),
      ];

      const classOptionsSheet = XLSX.utils.aoa_to_sheet(classOptionsData);
      classOptionsSheet['!cols'] = [
        { wch: 25 }, // Class Name column
        { wch: 35 }, // Description column
      ];
      XLSX.utils.book_append_sheet(workbook, classOptionsSheet, 'Class Options');

      // Create instructions worksheet
      const instructionsData = [
        ['BULK STUDENT UPLOAD INSTRUCTIONS'],
        [''],
        ['Required Fields:'],
        ["• firstName - Student's first name"],
        ["• lastName - Student's last name"],
        ['• gender - Select from dropdown (MALE/FEMALE)'],
        ['• className - Select from dropdown (available classes)'],
        [''],
        ['Optional Fields:'],
        ['• dateOfBirth - Format: YYYY-MM-DD (e.g., 2012-05-15)'],
        ["• email - Student's email address"],
        ["• phone - Student's phone number"],
        ['• admissionNo - Custom admission number'],
        ['• admissionDate - Format: YYYY-MM-DD (e.g., 2025-09-01)'],
        [''],
        ['Guardian Information (Optional):'],
        ["• guardianFirstName - Guardian's first name"],
        ["• guardianLastName - Guardian's last name"],
        ["• guardianEmail - Guardian's email address"],
        ["• guardianPhone - Guardian's phone number"],
        ['• guardianRelationship - Relationship to student (e.g., Mother, Father)'],
        [''],
        ['Available Classes:'],
        ...classOptions.map((className) => [`• ${className}`]),
        [''],
        ['Tips:'],
        ['• For Excel users: Use the dropdowns in the Students sheet for Gender and Class'],
        ['• For Google Sheets users: Copy class names from the "Class Options" sheet'],
        ['• All dates should be in YYYY-MM-DD format'],
        ['• Phone numbers can include country codes'],
        ['• Remove sample data before uploading your actual student data'],
        ['• Maximum file size: 10MB'],
        ['• Maximum records: 5000 students'],
        [''],
      ];

      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
      instructionsSheet['!cols'] = [{ wch: 60 }]; // Wide column for instructions
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

      // **--- XLSX WORKAROUND TO FIX FILE CORRUPTION ISSUES ---**
      (workbook as any).bookVBA = {}; // This forces xlsx to write more complete XML structure

      // Generate buffer with proper Excel format
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true,
        Props: {
          Title: 'Student Upload Template',
          Subject: 'Bulk Student Upload Template',
          Author: 'Schos',
          CreatedDate: new Date(),
        },
      });

      // Set response headers for Excel file
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="student-upload-template.xlsx"');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the file
      res.end(buffer);
    } catch (error) {
      this.logger.error('Error generating Excel template:', error);
      throw error;
    }
  }

  async generateGoogleSheetsTemplate(schoolId: string, res: Response): Promise<void> {
    try {
      // Get class arms for the school with level information
      const classArms = await this.prisma.classArm.findMany({
        where: { schoolId, deletedAt: null },
        include: { level: true },
        orderBy: [{ level: { name: 'asc' } }, { name: 'asc' }],
      });

      // Create class options for reference
      const classOptions = classArms.map((classArm) => `${classArm.level.name} ${classArm.name}`);

      // Create CSV content with headers and sample data
      const headers = [
        'firstName',
        'lastName',
        'gender',
        'className',
        'dateOfBirth',
        'email',
        'phone',
        'admissionNo',
        'admissionDate',
        'guardianFirstName',
        'guardianLastName',
        'guardianEmail',
        'guardianPhone',
        'guardianRelationship',
      ];

      // Create sample data with actual class names
      const sampleData = [
        [
          'John',
          'Doe',
          'MALE',
          classOptions[0] || 'Grade 1 A',
          '2012-05-15',
          'john.doe@school.com',
          '+234-XXX-XXX-XXXX',
          'ADM001',
          '2025-09-01',
          'Jane',
          'Doe',
          'jane.doe@email.com',
          '+234-XXX-XXX-XXXX',
          'Mother',
        ],
        [
          'Alice',
          'Smith',
          'FEMALE',
          classOptions[1] || 'Grade 1 B',
          '2011-08-22',
          'alice.smith@school.com',
          '+234-XXX-XXX-XXXX',
          'ADM002',
          '2025-09-01',
          'Robert',
          'Smith',
          'robert.smith@email.com',
          '+234-XXX-XXX-XXXX',
          'Father',
        ],
      ];

      // Create CSV content
      const csvRows = [headers, ...sampleData];
      const csvContent = csvRows
        .map((row) => row.map((field) => `"${field || ''}"`).join(','))
        .join('\n');

      // Add instructions as comments at the top
      const instructions = [
        '# BULK STUDENT UPLOAD TEMPLATE FOR GOOGLE SHEETS',
        '# ',
        '# INSTRUCTIONS:',
        '# 1. Fill in the student data below',
        '# 2. For className column, use one of these exact values:',
        ...classOptions.map((className) => `#    - ${className}`),
        '# 3. For gender column, use: MALE or FEMALE',
        '# 4. Date format: YYYY-MM-DD (e.g., 2012-05-15)',
        '# 5. Remove these instruction lines before uploading',
        '# ',
        '# REQUIRED FIELDS: firstName, lastName, gender, className',
        '# OPTIONAL FIELDS: All others',
        '# ',
        '',
        csvContent,
      ].join('\n');

      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=student-upload-template-google-sheets.csv',
      );
      res.setHeader('Content-Length', Buffer.byteLength(instructions, 'utf8'));

      // Send the file
      res.end(instructions);
    } catch (error) {
      this.logger.error('Error generating Google Sheets template:', error);
      throw error;
    }
  }

  async generateExcelJSTemplate(schoolId: string, res: Response): Promise<void> {
    try {
      // Get class arms for the school with level information
      const classArms = await this.prisma.classArm.findMany({
        where: { schoolId, deletedAt: null },
        include: { level: true },
        orderBy: [{ level: { name: 'asc' } }, { name: 'asc' }],
      });

      // Create class options for dropdown (using human-readable names)
      const classOptions = classArms.map((classArm) => `${classArm.level.name} ${classArm.name}`);
      const genderOptions = ['MALE', 'FEMALE'];

      // Create a new workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Schos';
      workbook.lastModifiedBy = 'Schos';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Create the main worksheet
      const worksheet = workbook.addWorksheet('Students');

      // Define headers
      const headers = [
        'firstName',
        'lastName',
        'gender',
        'className',
        'dateOfBirth',
        'email',
        'phone',
        'admissionDate',
        'guardianFirstName',
        'guardianLastName',
        'guardianEmail',
        'guardianPhone',
        'guardianRelationship',
      ];

      // Add headers to the worksheet
      worksheet.addRow(headers);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Set column widths
      worksheet.columns = [
        { width: 15 }, // firstName
        { width: 15 }, // lastName
        { width: 10 }, // gender
        { width: 20 }, // className
        { width: 12 }, // dateOfBirth
        { width: 25 }, // email
        { width: 18 }, // phone
        { width: 12 }, // admissionDate
        { width: 18 }, // guardianFirstName
        { width: 18 }, // guardianLastName
        { width: 25 }, // guardianEmail
        { width: 18 }, // guardianPhone
        { width: 15 }, // guardianRelationship
      ];

      // Add sample data
      const sampleData = [
        [
          'John',
          'Doe',
          'MALE',
          classOptions[0] || 'JSS1 A',
          '2012-05-15',
          'john.doe@school.com',
          '+234-XXX-XXX-XXXX',
          '2025-09-01',
          'Jane',
          'Doe',
          'jane.doe@email.com',
          '+234-XXX-XXX-XXXX',
          'Mother',
        ],
        [
          'Alice',
          'Smith',
          'FEMALE',
          classOptions[1] || 'JSS1 B',
          '2011-08-22',
          'alice.smith@school.com',
          '+234-XXX-XXX-XXXX',
          '2025-09-01',
          'Robert',
          'Smith',
          'robert.smith@email.com',
          '+234-XXX-XXX-XXXX',
          'Father',
        ],
      ];

      // Add sample data rows
      sampleData.forEach((row) => {
        worksheet.addRow(row);
      });

      // Add empty rows to ensure the column range exists for validation
      for (let i = 0; i < 50; i++) {
        worksheet.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '']);
      }

      // Add data validation for dropdowns using ExcelJS
      if (classOptions.length > 0) {
        // Apply gender dropdown validation to entire column C (gender) - rows 2 to 1000
        // Using the proper ExcelJS range validation approach
        worksheet.getColumn(3).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber >= 2 && rowNumber <= 1000) {
            // Apply to rows 2-1000
            cell.dataValidation = {
              type: 'list',
              allowBlank: false,
              formulae: [`"${genderOptions.join(',')}"`],
            };
          }
        });

        // Apply class dropdown validation to entire column D (className) - rows 2 to 1000
        worksheet.getColumn(4).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber >= 2 && rowNumber <= 1000) {
            // Apply to rows 2-1000
            cell.dataValidation = {
              type: 'list',
              allowBlank: false,
              formulae: [`"${classOptions.join(',')}"`],
            };
          }
        });
      }

      // Create instructions worksheet
      const instructionsSheet = workbook.addWorksheet('Instructions');
      const instructionsData = [
        ['BULK STUDENT UPLOAD INSTRUCTIONS'],
        [''],
        ['DROPDOWNS WORK AUTOMATICALLY!'],
        ['• Gender column (C) has MALE/FEMALE dropdown for ALL rows'],
        ["• Class column (D) has your school's class dropdown for ALL rows"],
        ['• Dropdowns work even when you add new rows!'],
        [''],
        ['Required Fields:'],
        ["• firstName - Student's first name"],
        ["• lastName - Student's last name"],
        ['• gender - Select from dropdown (MALE/FEMALE)'],
        ['• className - Select from dropdown (available classes)'],
        [''],
        ['Optional Fields:'],
        ['• dateOfBirth - Format: YYYY-MM-DD (e.g., 2012-05-15)'],
        ["• email - Student's email address"],
        ["• phone - Student's phone number"],
        ['• admissionDate - Format: YYYY-MM-DD (e.g., 2025-09-01)'],
        [''],
        ['Auto-Generated Fields:'],
        ['• admissionNo - Automatically generated by the system'],
        [''],
        ['Guardian Information (Optional):'],
        ["• guardianFirstName - Guardian's first name"],
        ["• guardianLastName - Guardian's last name"],
        ["• guardianEmail - Guardian's email address"],
        ["• guardianPhone - Guardian's phone number"],
        ['• guardianRelationship - Relationship to student (e.g., Mother, Father)'],
        [''],
        ['Available Classes:'],
        ...classOptions.map((className) => [`• ${className}`]),
        [''],
        ['Tips:'],
        ['• Use the dropdowns in the Students sheet for Gender and Class'],
        ['• All dates should be in YYYY-MM-DD format'],
        ['• Phone numbers can include country codes'],
        ['• Remove sample data before uploading your actual student data'],
        ['• Template includes 50+ empty rows with dropdowns ready to use'],
        ['• Empty rows are automatically skipped during upload'],
        ['• Maximum file size: 10MB'],
        ['• Maximum records: 5000 students'],
      ];

      instructionsData.forEach((row) => {
        instructionsSheet.addRow(row);
      });

      // Set column width for instructions
      instructionsSheet.getColumn(1).width = 60;

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="student-upload-template-exceljs.xlsx"',
      );

      // Write the workbook to the response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      this.logger.error('Error generating ExcelJS template:', error);
      throw error;
    }
  }
}
