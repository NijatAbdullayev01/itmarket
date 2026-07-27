import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';
import {
  assertProductMediaConstraints,
  extensionForProductMediaMime,
  type ProductMediaPutObjectRequest,
  type ProductMediaStorage,
  type ProductMediaUploadIntent,
  type ProductMediaUploadRequest,
} from './media-storage.port';

const UPLOAD_TTL_SECONDS = 15 * 60;

@Injectable()
export class S3ProductMediaStorage implements ProductMediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly forcePathStyle: boolean;
  private readonly endpoint: string;

  constructor(config: ConfigService<Environment, true>) {
    const endpoint = config.get('S3_ENDPOINT', { infer: true });
    const region = config.get('S3_REGION', { infer: true });
    const accessKeyId = config.get('S3_ACCESS_KEY', { infer: true });
    const secretAccessKey = config.get('S3_SECRET_KEY', { infer: true });
    const bucket = config.get('S3_BUCKET', { infer: true });
    const forcePathStyle = config.get('S3_FORCE_PATH_STYLE', { infer: true });

    this.endpoint = endpoint.replace(/\/$/, '');
    this.bucket = bucket;
    this.forcePathStyle = forcePathStyle;
    this.client = new S3Client({
      endpoint: this.endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createUploadIntent(
    request: ProductMediaUploadRequest,
  ): Promise<ProductMediaUploadIntent> {
    assertProductMediaConstraints(request);
    const objectKey = buildS3ObjectKey(request.productId, request.mimeType);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: request.mimeType,
      ContentLength: request.byteSize,
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_TTL_SECONDS,
    });
    return {
      // Persist opaque storage keys only; signed read URLs are minted at response time.
      objectKey,
      method: 'PUT',
      signedUrl,
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000),
      requiredHeaders: {
        'Content-Type': request.mimeType,
        'x-amz-checksum-sha256': request.checksumSha256,
      },
    };
  }

  async putObject(request: ProductMediaPutObjectRequest): Promise<void> {
    assertProductMediaConstraints(request);
    if (request.body.byteLength !== request.byteSize) {
      throw new Error('Media byte size mismatch');
    }
    const digest = createHash('sha256').update(request.body).digest('hex');
    if (digest !== request.checksumSha256) {
      throw new Error('Media checksum mismatch');
    }

    const key = this.toStorageKey(request.objectKey);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: request.body,
        ContentType: request.mimeType,
        ContentLength: request.byteSize,
      }),
    );
  }

  async createReadUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const key = this.toStorageKey(objectKey);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: Math.max(1, Math.min(expiresInSeconds, 60 * 60 * 24 * 7)),
    });
  }

  async deleteObject(objectKey: string): Promise<void> {
    const key = this.toStorageKey(objectKey);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  toPublicObjectKey(storageKey: string): string {
    if (this.forcePathStyle) {
      return `${this.endpoint}/${this.bucket}/${storageKey}`;
    }
    const endpointUrl = new URL(this.endpoint);
    return `${endpointUrl.protocol}//${this.bucket}.${endpointUrl.host}/${storageKey}`;
  }

  toStorageKey(objectKey: string): string {
    if (!objectKey.startsWith('http://') && !objectKey.startsWith('https://')) {
      return objectKey.replace(/^\/+/, '');
    }

    const url = new URL(objectKey);
    const path = url.pathname.replace(/^\/+/, '');
    if (this.forcePathStyle) {
      const prefix = `${this.bucket}/`;
      if (path.startsWith(prefix)) {
        return path.slice(prefix.length);
      }
    }
    return path;
  }
}

export function buildS3ObjectKey(
  productId: string,
  mimeType: ProductMediaUploadRequest['mimeType'],
): string {
  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '') || 'shared';
  return `catalog/products/${safeProductId}/${randomUUID()}.${extensionForProductMediaMime(mimeType)}`;
}
