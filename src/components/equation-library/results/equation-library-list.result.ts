import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EquationLibraryItemResult {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  canonicalSubjectId!: string;

  @ApiProperty()
  canonicalSubjectSlug!: string;

  @ApiProperty()
  canonicalSubjectName!: string;

  @ApiProperty({ example: 'Quadratic Formula' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' })
  latex!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class EquationLibrarySubjectFacetResult {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Number of active equations in this subject (after search filter)' })
  count!: number;
}

export class EquationLibraryListResult {
  @ApiProperty({ type: [EquationLibraryItemResult] })
  items!: EquationLibraryItemResult[];

  @ApiProperty({
    type: [EquationLibrarySubjectFacetResult],
    description: 'All canonical subjects with active equations, with counts. Use to build the subject filter dropdown.',
  })
  subjects!: EquationLibrarySubjectFacetResult[];
}
