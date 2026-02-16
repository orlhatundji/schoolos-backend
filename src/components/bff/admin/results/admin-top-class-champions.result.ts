import { ApiProperty } from '@nestjs/swagger';

import { TopClassChampionsData } from '../types';

class ClassChampionResult {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 92 })
  score: number;

  @ApiProperty({ example: 'Alpha' })
  className: string;

  @ApiProperty({ example: 'JSS 1' })
  classLevel: string;

  @ApiProperty({ example: 'Mr. Johnson' })
  teacherName: string;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl: string | null;
}

export class AdminTopClassChampionsResult {
  @ApiProperty({ type: [ClassChampionResult] })
  champions: ClassChampionResult[];

  @ApiProperty({ example: '2024/2025' })
  academicSession: string;

  @ApiProperty({ example: 'First Term' })
  term: string;

  constructor(data: TopClassChampionsData) {
    this.champions = data.champions;
    this.academicSession = data.academicSession;
    this.term = data.term;
  }
}
