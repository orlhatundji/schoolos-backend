import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData, ResultOptions } from '../../../common/results';

export class StudentListUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  avatar?: string;

  @ApiProperty()
  dateOfBirth: Date;

  @ApiProperty()
  gender: string;
}

export class StudentListLevel {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class StudentListClassArm {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fullName: string;
}

export class StudentListGuardian {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  relationship: string;
}

export class StudentListStatus {
  @ApiProperty()
  current: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  badge: {
    text: string;
    color: string;
    backgroundColor: string;
  };
}

export class StudentListItem {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serialNumber: number;

  @ApiProperty()
  user: StudentListUser;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentNo: string;

  @ApiProperty()
  admissionNo?: string;

  @ApiProperty()
  admissionDate: Date;

  @ApiProperty()
  level: StudentListLevel;

  @ApiProperty()
  classArm: StudentListClassArm;

  @ApiProperty()
  age: number;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  status: StudentListStatus;

  @ApiProperty()
  guardian?: StudentListGuardian;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginationInfo {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;
}

export class StudentListSummary {
  @ApiProperty()
  totalStudents: number;

  @ApiProperty()
  displayedRange: string;

  @ApiProperty()
  statusBreakdown: Record<string, number>;

  @ApiProperty()
  genderBreakdown: Record<string, number>;

  @ApiProperty()
  levelBreakdown: Record<string, number>;

  @ApiProperty()
  ageDistribution: Record<string, number>;
}

export class StudentListData {
  @ApiProperty({ type: [StudentListItem] })
  students: StudentListItem[];

  @ApiProperty()
  pagination: PaginationInfo;

  @ApiProperty()
  summary: StudentListSummary;
}

export class StudentListResult extends BaseResultWithData<StudentListData> {
  @ApiProperty({ type: () => StudentListData })
  public data: StudentListData;

  public static from(data: StudentListData, options: ResultOptions): StudentListResult {
    return new StudentListResult(options.status, options.message, data);
  }
}
