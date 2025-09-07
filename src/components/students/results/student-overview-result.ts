import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData, ResultOptions } from '../../../common/results';

export class StudentStatistics {
  @ApiProperty()
  count: number;

  @ApiProperty()
  description: string;
}

export class StudentOverviewData {
  @ApiProperty()
  statistics: {
    totalStudents: StudentStatistics;
    activeStudents: StudentStatistics;
    inactive: StudentStatistics;
    suspended: StudentStatistics;
  };
}

export class StudentOverviewResult extends BaseResultWithData<StudentOverviewData> {
  @ApiProperty({ type: () => StudentOverviewData })
  public data: StudentOverviewData;

  public static from(data: StudentOverviewData, options: ResultOptions): StudentOverviewResult {
    return new StudentOverviewResult(options.status, options.message, data);
  }
}
