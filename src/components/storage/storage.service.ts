import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';
import { BaseService } from '../../common/base-service';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const FOLDER_CONFIG = {
  avatars: { maxSize: 100 * 1024 },
  logos: { maxSize: 500 * 1024 },
  signatures: { maxSize: 200 * 1024 },
  receipts: { maxSize: 2 * 1024 * 1024 },
  invoices: { maxSize: 2 * 1024 * 1024 },
  questions: { maxSize: 100 * 1024 },
} as const;

export type StorageFolder = keyof typeof FOLDER_CONFIG;

@Injectable()
export class StorageService extends BaseService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly envFolder: string;

  constructor(private readonly configService: ConfigService) {
    super(StorageService.name);
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
  ): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    publicUrl: string;
    key: string;
    maxSize: number;
  }> {
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }

    const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
    const key = `${this.envFolder}/${folder}/${randomUUID()}.${ext}`;
    const maxSize = FOLDER_CONFIG[folder].maxSize;

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 0, maxSize],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: 300,
    });

    const publicUrl = `${this.endpoint}/${this.bucket}/${key}`;

    return { uploadUrl: url, fields, publicUrl, key, maxSize };
  }

  /**
   * Server-side upload for files we generate (e.g. receipt PDFs).
   * Use `key` to make the object addressable by a stable name (overwrites on re-upload);
   * omit it to get a random UUID-suffixed key.
   */
  async uploadBuffer(
    folder: StorageFolder,
    contentType: string,
    body: Buffer,
    key?: string,
  ): Promise<{ publicUrl: string; key: string }> {
    const objectKey =
      key ?? `${this.envFolder}/${folder}/${randomUUID()}`;
    const finalKey = key
      ? `${this.envFolder}/${folder}/${key}`
      : objectKey;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: finalKey,
        Body: body,
        ContentType: contentType,
      }),
    );

    const publicUrl = `${this.endpoint}/${this.bucket}/${finalKey}`;
    return { publicUrl, key: finalKey };
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
      this.logger.error(`Failed to delete S3 object ${key}:`, error);
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

  isPublicUrlInFolder(url: string, folder: StorageFolder): boolean {
    const key = this.extractKeyFromUrl(url);
    return key?.startsWith(`${this.envFolder}/${folder}/`) ?? false;
  }
}
