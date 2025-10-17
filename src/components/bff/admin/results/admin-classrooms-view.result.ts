import { ApiProperty } from '@nestjs/swagger';

import { AdminClassroomsViewData, ClassroomInfo, ViewStats } from '../types';

class ViewStatsResult implements ViewStats {
  @ApiProperty()
  totalClassrooms: number;
  @ApiProperty()
  totalStudents: number;
  @ApiProperty()
  gradeLevels: number;
  @ApiProperty()
  capacityUsage: number;
}

class ClassroomInfoResult implements ClassroomInfo {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  slug: string;
  @ApiProperty()
  level: string;
  @ApiProperty({ nullable: true })
  location: string | null;
  @ApiProperty({ nullable: true })
  classTeacher: {
    teacherNo: string;
    name: string;
  } | null;
  @ApiProperty({ nullable: true })
  classCaptain: {
    id: string;
    name: string;
    studentNo: string;
  } | null;
  @ApiProperty()
  studentsCount: number;
}

export class AdminClassroomsViewResult {
  @ApiProperty({ type: ViewStatsResult })
  stats: ViewStatsResult;

  @ApiProperty({ type: [ClassroomInfoResult] })
  classrooms: ClassroomInfoResult[];

  constructor(data: AdminClassroomsViewData) {
    this.stats = data.stats;
    this.classrooms = data.classrooms;
  }
}
