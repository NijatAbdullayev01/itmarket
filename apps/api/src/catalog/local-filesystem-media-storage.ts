import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

import {
  assertProductMediaConstraints,
  extensionForProductMediaMime,
  type ProductMediaPutObjectRequest,
  type ProductMediaStorage,
  type ProductMediaUploadIntent,
  type ProductMediaUploadRequest,
} from './media-storage.port';
import { scheduleReloadAppsForNewPublicAssets } from './reload-apps-public-assets';
import { resolveDualAppPublicDirectories } from './resolve-dual-app-public-dirs';

const LOCAL_UPLOAD_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class LocalFilesystemMediaStorage implements ProductMediaStorage {
  constructor(
    private readonly directories = resolveLocalCatalogImageDirectories(),
  ) {}

  createUploadIntent(
    request: ProductMediaUploadRequest,
  ): Promise<ProductMediaUploadIntent> {
    assertProductMediaConstraints(request);
    const objectKey = buildLocalObjectKey(request.mimeType);
    const expiresAt = new Date(Date.now() + LOCAL_UPLOAD_TTL_MS);
    return Promise.resolve({
      objectKey,
      method: 'PUT',
      signedUrl: `local-media://${objectKey}`,
      expiresAt,
      requiredHeaders: {
        'Content-Type': request.mimeType,
        'x-amz-checksum-sha256': request.checksumSha256,
      },
    });
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

    const fileName = path.basename(request.objectKey);
    if (!fileName || fileName === '.' || fileName === '..') {
      throw new Error('Invalid media object key');
    }

    await Promise.all(
      this.directories.map(async (directory) => {
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, fileName), request.body);
      }),
    );

    // Standalone Next soft-404s files written after boot until PM2 reload.
    scheduleReloadAppsForNewPublicAssets();
  }

  createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string> {
    void expiresInSeconds;
    return Promise.resolve(
      objectKey.startsWith('/') ? objectKey : `/${objectKey}`,
    );
  }

  async deleteObject(objectKey: string): Promise<void> {
    const fileName = path.basename(objectKey);
    if (!fileName || fileName === '.' || fileName === '..') {
      return;
    }
    await Promise.all(
      this.directories.map(async (directory) => {
        try {
          await unlink(path.join(directory, fileName));
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            return;
          }
          throw error;
        }
      }),
    );
  }
}

export function buildLocalObjectKey(
  mimeType: ProductMediaUploadRequest['mimeType'],
): string {
  return `/images/catalog/${randomUUID()}.${extensionForProductMediaMime(mimeType)}`;
}

export function resolveLocalCatalogImageDirectories(
  cwd = process.cwd(),
): string[] {
  return resolveDualAppPublicDirectories('images/catalog', cwd);
}
