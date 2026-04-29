import { ApiProperty } from '@nestjs/swagger';

export class TopicResult {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: "Newton's Laws of Motion" })
  name: string;

  @ApiProperty({ example: 'physics-ss2-newtons-laws' })
  slug: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true, example: null })
  parentTopicId: string | null;

  @ApiProperty({ example: 0 })
  order: number;

  @ApiProperty({ example: 'Physics' })
  canonicalSubjectName: string;

  @ApiProperty({ example: 'SS2' })
  canonicalLevelCode: string;

  @ApiProperty({ example: '2026-04-25T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-25T00:00:00.000Z' })
  updatedAt: Date;

  constructor(topic: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentTopicId: string | null;
    order: number;
    canonicalSubjectName: string;
    canonicalLevelCode: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = topic.id;
    this.name = topic.name;
    this.slug = topic.slug;
    this.description = topic.description;
    this.parentTopicId = topic.parentTopicId;
    this.order = topic.order;
    this.canonicalSubjectName = topic.canonicalSubjectName;
    this.canonicalLevelCode = topic.canonicalLevelCode;
    this.createdAt = topic.createdAt;
    this.updatedAt = topic.updatedAt;
  }
}

export class TopicsListResult {
  @ApiProperty({ type: [TopicResult] })
  topics: TopicResult[];

  constructor(topics: TopicResult[]) {
    this.topics = topics;
  }
}

export class CreateTopicResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Topic created successfully' })
  message: string;

  @ApiProperty({ type: TopicResult })
  topic: TopicResult;

  constructor(topic: TopicResult) {
    this.success = true;
    this.message = 'Topic created successfully';
    this.topic = topic;
  }
}

export class UpdateTopicResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Topic updated successfully' })
  message: string;

  @ApiProperty({ type: TopicResult })
  topic: TopicResult;

  constructor(topic: TopicResult) {
    this.success = true;
    this.message = 'Topic updated successfully';
    this.topic = topic;
  }
}

export class DeleteTopicResult {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Topic deleted successfully' })
  message: string;

  constructor() {
    this.success = true;
    this.message = 'Topic deleted successfully';
  }
}
