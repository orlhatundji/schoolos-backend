import { ApiProperty } from '@nestjs/swagger';

export class SymbolLibraryItemResult {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'GREEK_LOWER' })
  category!: string;

  @ApiProperty({ example: 'theta' })
  name!: string;

  @ApiProperty({ example: '\\theta' })
  latex!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class SymbolCategoryFacetResult {
  @ApiProperty({ example: 'GREEK_LOWER' })
  category!: string;

  @ApiProperty()
  count!: number;
}

export class SymbolLibraryListResult {
  @ApiProperty({ type: [SymbolLibraryItemResult] })
  items!: SymbolLibraryItemResult[];

  @ApiProperty({
    type: [SymbolCategoryFacetResult],
    description: 'Active symbol categories with counts (after the search filter is applied).',
  })
  categories!: SymbolCategoryFacetResult[];
}
