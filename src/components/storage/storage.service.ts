import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const FOLDER_CONFIG = {
  avatars: { maxSize: 50 * 1024 },
  logos: { maxSize: 500 * 1024 },
} as const;

export type StorageFolder = keyof typeof FOLDER_CONFIG;

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly envFolder: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('aws.s3Bucket');
    this.endpoint = this.configService.get<string>('aws.s3Endpoint');
    this.envFolder = this.configService.get<string>('aws.s3Folder');

    this.s3 = new S3Client({
      region: this.configService.get<string>('aws.region'),
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId'),
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey'),
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async generatePresignedUploadUrl(
    folder: StorageFolder,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }

    const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
    const key = `${this.envFolder}/${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const publicUrl = `${this.endpoint}/${this.bucket}/${key}`;

    return { uploadUrl, publicUrl, key };
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      console.error(`Failed to delete S3 object ${key}:`, error);
    }
  }

  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    const prefix = `${this.endpoint}/${this.bucket}/`;
    if (url.startsWith(prefix)) {
      return url.slice(prefix.length);
    }
    return null;
  }
}
