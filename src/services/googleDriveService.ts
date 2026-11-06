/**
 * Google Drive API Client & Media Integration Service
 * 
 * Provides:
 * - Direct listing of files and folders from Google Drive
 * - Folder navigation (Root, Specific Folders, Search)
 * - Filtering for video assets (.mp4, .webm, .mov, etc.)
 * - Generating streamable/downloadable playback URLs using Drive OAuth Bearer token
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  hasThumbnail?: boolean;
  isVideo?: boolean;
  isFolder?: boolean;
  iconLink?: string;
}

export interface DriveFolderBreadcrumb {
  id: string;
  name: string;
}

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
  'video/avi',
  'video/ogg',
  'application/x-mpegURL', // .m3u8
  'application/vnd.apple.mpegurl',
];

/**
 * List files and folders inside a specific parent folder in Google Drive
 */
export async function listDriveFiles(
  accessToken: string,
  folderId: string = 'root',
  searchQuery?: string
): Promise<{ files: GoogleDriveFile[]; folders: GoogleDriveFile[] }> {
  if (!accessToken) {
    throw new Error('Access token is required to access Google Drive API.');
  }

  // Construct Drive query: not trashed, within parent folder, matching video types or folders
  let q = `'${folderId}' in parents and trashed = false`;

  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    q = `trashed = false and name contains '${escaped}'`;
  }

  const fields = 'files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, iconLink)';
  const pageSize = 50;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=folder,name`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `Failed to fetch Google Drive files (HTTP ${response.status})`
    );
  }

  const data = await response.json();
  const rawFiles: any[] = data.files || [];

  const folders: GoogleDriveFile[] = [];
  const files: GoogleDriveFile[] = [];

  rawFiles.forEach((item) => {
    const isFolder = item.mimeType === 'application/vnd.google.apps.folder';
    const isVideo =
      VIDEO_MIME_TYPES.includes(item.mimeType) ||
      /\.(mp4|webm|mov|mkv|avi|m3u8|ts)$/i.test(item.name);

    const formatted: GoogleDriveFile = {
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size ? formatBytes(parseInt(item.size, 10)) : undefined,
      modifiedTime: item.modifiedTime,
      thumbnailLink: item.thumbnailLink,
      webViewLink: item.webViewLink,
      webContentLink: item.webContentLink,
      isVideo,
      isFolder,
      iconLink: item.iconLink,
    };

    if (isFolder) {
      folders.push(formatted);
    } else {
      files.push(formatted);
    }
  });

  return { files, folders };
}

/**
 * Fetch information about a specific file or folder
 */
export async function getDriveFileInfo(
  accessToken: string,
  fileId: string
): Promise<GoogleDriveFile> {
  const fields = 'id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink';
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(
    fields
  )}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to fetch file metadata');
  }

  const item = await response.json();
  const isFolder = item.mimeType === 'application/vnd.google.apps.folder';
  const isVideo =
    VIDEO_MIME_TYPES.includes(item.mimeType) ||
    /\.(mp4|webm|mov|mkv|avi|m3u8|ts)$/i.test(item.name);

  return {
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    size: item.size ? formatBytes(parseInt(item.size, 10)) : undefined,
    modifiedTime: item.modifiedTime,
    thumbnailLink: item.thumbnailLink,
    webViewLink: item.webViewLink,
    webContentLink: item.webContentLink,
    isVideo,
    isFolder,
  };
}

/**
 * Extract Google Drive file ID from arbitrary URL or return raw ID
 */
export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already a clean ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  // /file/d/{id} pattern
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) return fileDMatch[1];

  // id={id} query parameter
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  // /folders/{id} pattern
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  return null;
}

/**
 * Return iframe embeddable URL for Google Drive preview player
 */
export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Download a file as a blob or stream object URL for HTML5 / VOD playback
 */
export async function getDriveMediaPlaybackUrl(
  accessToken: string,
  fileId: string
): Promise<string> {
  // Google Drive provides direct media download via alt=media
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  // Fetch file with authorization header to create an in-memory blob URL
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to stream media from Google Drive (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  // Google Drive returns HTML for files larger than virus-scan limit (~100MB) or when prompt is needed
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error(`Google Drive returned non-media payload (${contentType}). Falling back to Google Drive embed player.`);
  }

  const blob = await response.blob();
  if (!blob || blob.size < 1024) {
    throw new Error(`Google Drive returned empty or corrupted media blob (${blob?.size || 0} bytes). Falling back to Google Drive embed player.`);
  }
  return URL.createObjectURL(blob);
}

/**
 * Upload a live broadcast recording or media file directly to Google Drive
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  mimeType: string = 'video/webm',
  folderId?: string
): Promise<GoogleDriveFile> {
  if (!accessToken) {
    throw new Error('Google Drive access token required for upload.');
  }

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: mimeType,
    description: 'Uploaded from Apex Digital TV Network Playout Studio',
  };

  if (folderId && folderId !== 'root') {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const blobArrayBuffer = await fileBlob.arrayBuffer();

  const multipartBlob = new Blob(
    [
      metadataPart,
      new Uint8Array(blobArrayBuffer),
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,thumbnailLink';

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBlob,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error?.message || `Google Drive upload failed with HTTP ${response.status}`
    );
  }

  const createdFile = await response.json();
  return {
    id: createdFile.id,
    name: createdFile.name,
    mimeType: createdFile.mimeType,
    size: createdFile.size ? formatBytes(parseInt(createdFile.size, 10)) : undefined,
    webViewLink: createdFile.webViewLink,
    thumbnailLink: createdFile.thumbnailLink,
    isVideo: true,
  };
}

function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

