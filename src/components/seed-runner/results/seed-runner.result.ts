import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeedRunStatus } from '@prisma/client';

export class SeedLastRunResult {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SeedRunStatus })
  status!: SeedRunStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty()
  upserted!: number;

  @ApiProperty()
  skipped!: number;

  @ApiPropertyOptional({ nullable: true })
  durationMs!: number | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorMessage!: string | null;

  @ApiPropertyOptional({ nullable: true })
  triggeredByName!: string | null;
}

export class SeedDescriptorResult {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [String] })
  dependsOn!: string[];

  @ApiProperty({ description: 'True iff a run is currently in flight on this server instance.' })
  isRunning!: boolean;

  @ApiPropertyOptional({ type: () => SeedLastRunResult, nullable: true })
  lastRun!: SeedLastRunResult | null;
}

export class ListSeedsResult {
  @ApiProperty({ type: [SeedDescriptorResult] })
  seeds!: SeedDescriptorResult[];
}

export class RunSeedResult {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SeedRunStatus })
  status!: SeedRunStatus;

  @ApiProperty()
  upserted!: number;

  @ApiProperty()
  skipped!: number;

  @ApiPropertyOptional({ nullable: true })
  durationMs!: number | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}
