import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export interface StorageResult {
  filename: string;
  streamUrl: string;
  isCloudStorage: boolean;
  sizeBytes?: number;
}

export interface StorageProvider {
  name: string;
  saveBuffer(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult>;
  deleteFile(filename: string): Promise<boolean>;
  fileExists(filename: string): Promise<boolean>;
  getLocalPath(filename: string): string;
  getStreamUrl(filename: string, baseUrl?: string): string;
}

/**
 * LocalDiskStorageProvider - Default zero-billing storage provider
 * Stores media in server uploads directory with full HTTP 206 Range stream compatibility
 */
export class LocalDiskStorageProvider implements StorageProvider {
  name = 'local_disk';
  private uploadsDir: string;

  constructor(uploadsDir: string = DEFAULT_UPLOADS_DIR) {
    this.uploadsDir = uploadsDir;
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveBuffer(buffer: Buffer, filename: string, _mimeType?: string): Promise<StorageResult> {
    const cleanFilename = path.basename(filename);
    const targetPath = path.resolve(this.uploadsDir, cleanFilename);
    await fs.promises.writeFile(targetPath, buffer);
    return {
      filename: cleanFilename,
      streamUrl: `/api/stream/${cleanFilename}`,
      isCloudStorage: false,
      sizeBytes: buffer.length,
    };
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const cleanFilename = path.basename(filename);
      const targetPath = path.resolve(this.uploadsDir, cleanFilename);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('LocalStorage delete warning:', err);
      return false;
    }
  }

  async fileExists(filename: string): Promise<boolean> {
    const cleanFilename = path.basename(filename);
    const targetPath = path.resolve(this.uploadsDir, cleanFilename);
    return fs.existsSync(targetPath);
  }

  getLocalPath(filename: string): string {
    const cleanFilename = path.basename(filename);
    return path.resolve(this.uploadsDir, cleanFilename);
  }

  getStreamUrl(filename: string, baseUrl = ''): string {
    const cleanFilename = path.basename(filename);
    return `${baseUrl}/api/stream/${cleanFilename}`;
  }
}

/**
 * GcsStorageProvider - Google Cloud Storage provider for persistent multi-instance broadcast storage
 * Activated automatically when GCS_BUCKET_NAME environment variable is provided
 */
export class GcsStorageProvider implements StorageProvider {
  name = 'google_cloud_storage';
  private bucketName: string;
  private localFallback: LocalDiskStorageProvider;

  constructor(bucketName: string, uploadsDir: string = DEFAULT_UPLOADS_DIR) {
    this.bucketName = bucketName;
    this.localFallback = new LocalDiskStorageProvider(uploadsDir);
  }

  async saveBuffer(buffer: Buffer, filename: string, mimeType = 'video/mp4'): Promise<StorageResult> {
    // Write to local cache first so FFmpeg can access raw file immediately
    const localResult = await this.localFallback.saveBuffer(buffer, filename, mimeType);

    try {
      // If GCS credentials or client are available, upload to bucket
      // Dynamic import to prevent crash if @google-cloud/storage is not installed
      const { Storage } = await import('@google-cloud/storage').catch(() => ({ Storage: null }));
      if (Storage) {
        const storage = new Storage();
        const bucket = storage.bucket(this.bucketName);
        const file = bucket.file(localResult.filename);

        await file.save(buffer, {
          metadata: { contentType: mimeType },
          resumable: buffer.length > 5 * 1024 * 1024,
        });

        const cloudUrl = `https://storage.googleapis.com/${this.bucketName}/${localResult.filename}`;
        return {
          filename: localResult.filename,
          streamUrl: cloudUrl,
          isCloudStorage: true,
          sizeBytes: buffer.length,
        };
      }
    } catch (err) {
      console.warn('GCS upload error, using local disk cache:', err);
    }

    return localResult;
  }

  async deleteFile(filename: string): Promise<boolean> {
    const localDeleted = await this.localFallback.deleteFile(filename);
    try {
      const { Storage } = await import('@google-cloud/storage').catch(() => ({ Storage: null }));
      if (Storage) {
        const storage = new Storage();
        await storage.bucket(this.bucketName).file(path.basename(filename)).delete({ ignoreNotFound: true });
        return true;
      }
    } catch {}
    return localDeleted;
  }

  async fileExists(filename: string): Promise<boolean> {
    return this.localFallback.fileExists(filename);
  }

  getLocalPath(filename: string): string {
    return this.localFallback.getLocalPath(filename);
  }

  getStreamUrl(filename: string, baseUrl = ''): string {
    return this.localFallback.getStreamUrl(filename, baseUrl);
  }
}

// Global factory providing the active storage provider
let activeProvider: StorageProvider | null = null;

export function getStorageProvider(uploadsDir?: string): StorageProvider {
  if (activeProvider) return activeProvider;

  const gcsBucket = process.env.GCS_BUCKET_NAME || process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  if (gcsBucket) {
    console.log(`[StorageEngine] Initializing Google Cloud Storage Provider (Bucket: ${gcsBucket})`);
    activeProvider = new GcsStorageProvider(gcsBucket, uploadsDir);
  } else {
    console.log('[StorageEngine] Initializing Local Disk Storage Provider (Zero-Billing Default)');
    activeProvider = new LocalDiskStorageProvider(uploadsDir);
  }

  return activeProvider;
}
