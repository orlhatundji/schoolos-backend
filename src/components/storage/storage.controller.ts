import { Controller, Post, Body } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { StorageService, StorageFolder } from './storage.service';

class PresignedUrlDto {
  @IsIn(['avatars', 'logos'])
  folder: StorageFolder;

  @IsString()
  contentType: string;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presigned-url')
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return this.storageService.generatePresignedUploadUrl(
      dto.folder,
      dto.contentType,
    );
  }
}
