import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeacherResult {
  @ApiProperty({ description: 'Teacher ID' })
  id: string;

  @ApiProperty({ description: 'Teacher number' })
  teacherId: string;

  @ApiProperty({ description: 'Full name of the teacher' })
  fullName: string;

  @ApiPropertyOptional({ description: 'State of origin' })
  stateOfOrigin?: string;

  @ApiProperty({ description: 'Email address' })
  emailAddress: string;

  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Gender' })
  gender: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  profilePictureUrl?: string;

  @ApiPropertyOptional({ description: 'Department name' })
  department?: string;

  @ApiProperty({ description: 'Employment type' })
  employmentType: string;

  @ApiProperty({ description: 'Teacher status' })
  status: string;

  @ApiPropertyOptional({ description: 'Qualification' })
  qualification?: string;

  @ApiProperty({ description: 'Join date' })
  joinDate: string;

  @ApiPropertyOptional({ description: 'Experience in years' })
  experience?: number;

  @ApiProperty({ description: 'Assigned classes' })
  assignedClasses: string[];

  @ApiProperty({ description: 'Subjects taught' })
  subjects: string[];

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;
}

export class TeacherListResult {
  @ApiProperty({ type: [TeacherResult], description: 'List of teachers' })
  teachers: TeacherResult[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
  };
}

export class TeacherDetailsResult {
  @ApiProperty({ description: 'Teacher details' })
  teacher: TeacherResult;

  @ApiPropertyOptional({ description: 'Address information' })
  address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Date of birth' })
  dateOfBirth?: string;

  @ApiProperty({ description: 'Is Head of Department' })
  isHOD: boolean;

  @ApiPropertyOptional({ description: 'HOD department' })
  hodDepartment?: string;

  @ApiProperty({ description: 'Total students taught' })
  totalStudents: number;

  @ApiProperty({ description: 'Average class size' })
  averageClassSize: number;

  @ApiPropertyOptional({ description: 'Last login date' })
  lastLogin?: string;
}

export class TeacherStatsResult {
  @ApiProperty({ description: 'Total number of teachers' })
  totalTeachers: number;

  @ApiProperty({ description: 'Active teachers count' })
  activeTeachers: number;

  @ApiProperty({ description: 'Inactive teachers count' })
  inactiveTeachers: number;

  @ApiProperty({ description: 'Teachers on leave count' })
  onLeaveTeachers: number;

  @ApiProperty({ description: 'Full-time teachers count' })
  fullTimeTeachers: number;

  @ApiProperty({ description: 'Part-time teachers count' })
  partTimeTeachers: number;

  @ApiProperty({ description: 'Contract teachers count' })
  contractTeachers: number;
}
