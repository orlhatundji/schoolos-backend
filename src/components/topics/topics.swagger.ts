import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { CreateTopicDto, UpdateTopicDto } from './dto';
import {
  CreateTopicResult,
  DeleteTopicResult,
  TopicResult,
  TopicsListResult,
  UpdateTopicResult,
} from './results/topic.result';

export function ListTopicsSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'List topics. Filter by subject, level, parent, search.',
      description: 'Pass parentTopicId="root" to fetch top-level topics only.',
    }),
    ApiResponse({ status: 200, type: TopicsListResult }),
  );
}

export function GetTopicSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a single topic by id' }),
    ApiParam({ name: 'id', description: 'Topic id' }),
    ApiResponse({ status: 200, type: TopicResult }),
    ApiResponse({ status: 404, description: 'Not found' }),
  );
}

export function CreateTopicSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a topic (system admin only)' }),
    ApiBody({ type: CreateTopicDto }),
    ApiResponse({ status: 201, type: CreateTopicResult }),
    ApiResponse({ status: 409, description: 'Slug already in use' }),
    ApiResponse({ status: 400, description: 'Subtopic subject/level mismatch with parent' }),
  );
}

export function UpdateTopicSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a topic (system admin only)' }),
    ApiParam({ name: 'id', description: 'Topic id' }),
    ApiBody({ type: UpdateTopicDto }),
    ApiResponse({ status: 200, type: UpdateTopicResult }),
    ApiResponse({ status: 400, description: 'Cycle detected or subject/level mismatch with new parent' }),
    ApiResponse({ status: 404, description: 'Not found' }),
  );
}

export function DeleteTopicSwagger() {
  return applyDecorators(
    ApiOperation({
      summary: 'Soft-delete a topic (system admin only). Rejects if it has subtopics or referencing questions/quizzes.',
    }),
    ApiParam({ name: 'id', description: 'Topic id' }),
    ApiResponse({ status: 200, type: DeleteTopicResult }),
    ApiResponse({ status: 404, description: 'Not found' }),
    ApiResponse({ status: 409, description: 'Topic has subtopics or is referenced' }),
  );
}
