import type { QuestionAsset } from '../../domain/questions/types';
import { supabase } from './client';

export const supabaseImageBucket = 'question-images';
export const supabaseImageReferencePrefix = 'supabase-image:';
export const supabaseImageMaxBytes = 1024 * 1024;
export const supabaseImageMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type SupabaseImageMimeType = (typeof supabaseImageMimeTypes)[number];

type SupabaseErrorLike = {
  message: string;
};

type SupabaseStorageBucketClient = {
  upload: (
    path: string,
    file: Blob,
    options?: {
      contentType?: string;
      upsert?: boolean;
    },
  ) => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
  createSignedUrl: (
    path: string,
    expiresIn: number,
  ) => Promise<{ data: { signedUrl: string } | null; error: SupabaseErrorLike | null }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
};

export type SupabaseMediaClient = {
  storage: {
    from: (bucket: string) => SupabaseStorageBucketClient;
  };
  from: (table: string) => {
    insert: (row: SupabaseMediaRecordInsert) => {
      select: (columns?: string) => {
        single: () => Promise<{
          data: SupabaseMediaRecordRow | null;
          error: SupabaseErrorLike | null;
        }>;
      };
    };
  };
};

export type SupabaseMediaRecordInsert = {
  kind: 'image';
  source_kind: 'storage';
  storage_bucket: typeof supabaseImageBucket;
  storage_path: string;
  external_url: null;
  mime_type: SupabaseImageMimeType;
  byte_size: number;
  alt: string;
  caption: string | null;
  created_by: string | null;
};

export type SupabaseMediaRecordRow = SupabaseMediaRecordInsert & {
  id: string;
};

export type UploadSupabaseImageInput = {
  file: File;
  alt: string;
  caption?: string;
  createdBy?: string;
  assetId?: string;
  assetType?: QuestionAsset['type'];
  now?: () => Date;
  randomId?: () => string;
};

export type UploadSupabaseImageOptions = {
  client?: SupabaseMediaClient | null;
};

export type CreateSupabaseSignedImageUrlInput = {
  reference: string;
  expiresInSeconds?: number;
};

const defaultSignedUrlExpirationSeconds = 60 * 5;
const storagePathPattern = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*[a-zA-Z0-9]$/;

function isAllowedSupabaseImageMimeType(mimeType: string): mimeType is SupabaseImageMimeType {
  return supabaseImageMimeTypes.includes(mimeType as SupabaseImageMimeType);
}

function inferSupabaseImageMimeType(fileName: string): SupabaseImageMimeType | null {
  if (/\.(jpe?g)$/i.test(fileName)) {
    return 'image/jpeg';
  }

  if (/\.png$/i.test(fileName)) {
    return 'image/png';
  }

  if (/\.webp$/i.test(fileName)) {
    return 'image/webp';
  }

  if (/\.gif$/i.test(fileName)) {
    return 'image/gif';
  }

  return null;
}

function assertSupabaseMediaClient(
  client: SupabaseMediaClient | null | undefined,
): SupabaseMediaClient {
  if (!client) {
    throw new Error('Supabase media store is not configured.');
  }

  return client;
}

function sanitizePathSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'image'
  );
}

function extensionForMimeType(mimeType: SupabaseImageMimeType): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
  }
}

function createDefaultRandomId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)).replace(
    /[^a-zA-Z0-9_-]/g,
    '-',
  );
}

export function isValidSupabaseImageStoragePath(storagePath: string): boolean {
  if (!storagePath || storagePath.length > 512) {
    return false;
  }

  if (
    storagePath.startsWith('/') ||
    storagePath.endsWith('/') ||
    storagePath.includes('\\') ||
    storagePath.includes('//')
  ) {
    return false;
  }

  return storagePath
    .split('/')
    .every((segment) => segment !== '.' && segment !== '..' && storagePathPattern.test(segment));
}

export function createSupabaseImageReference(storagePath: string): string {
  if (!isValidSupabaseImageStoragePath(storagePath)) {
    throw new Error('Invalid Supabase image storage path.');
  }

  return `${supabaseImageReferencePrefix}${storagePath}`;
}

export function parseSupabaseImageReference(reference: string | undefined): string | null {
  if (!reference?.startsWith(supabaseImageReferencePrefix)) {
    return null;
  }

  const storagePath = reference.slice(supabaseImageReferencePrefix.length).trim();

  return isValidSupabaseImageStoragePath(storagePath) ? storagePath : null;
}

export function isSupabaseImageReference(reference: string | undefined): boolean {
  return parseSupabaseImageReference(reference) !== null;
}

export function validateSupabaseImageFile(file: File): SupabaseImageMimeType {
  if (file.size > supabaseImageMaxBytes) {
    throw new Error('Images uploaded to cloud storage must be 1 MB or smaller.');
  }

  const mimeType = file.type
    ? isAllowedSupabaseImageMimeType(file.type)
      ? file.type
      : null
    : inferSupabaseImageMimeType(file.name);

  if (!mimeType) {
    throw new Error('Cloud image uploads must be PNG, JPEG, WebP, or GIF files.');
  }

  return mimeType;
}

export function createSupabaseImageStoragePath(input: UploadSupabaseImageInput): string {
  const mimeType = validateSupabaseImageFile(input.file);
  const now = input.now?.() ?? new Date();
  const dateSegment = now.toISOString().slice(0, 10).replace(/-/g, '/');
  const ownerSegment = input.createdBy ? sanitizePathSegment(input.createdBy) : 'anonymous';
  const assetSegment = sanitizePathSegment(input.assetId ?? input.file.name);
  const randomSegment = sanitizePathSegment(input.randomId?.() ?? createDefaultRandomId());
  const extension = extensionForMimeType(mimeType);

  return `uploads/${ownerSegment}/${dateSegment}/${assetSegment}-${randomSegment}.${extension}`;
}

export async function uploadSupabaseImage(
  input: UploadSupabaseImageInput,
  options: UploadSupabaseImageOptions = {},
): Promise<QuestionAsset> {
  const client = assertSupabaseMediaClient(
    options.client ?? (supabase as SupabaseMediaClient | null),
  );
  const mimeType = validateSupabaseImageFile(input.file);
  const storagePath = createSupabaseImageStoragePath(input);
  const bucket = client.storage.from(supabaseImageBucket);
  const uploadResult = await bucket.upload(storagePath, input.file, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const mediaRecord: SupabaseMediaRecordInsert = {
    kind: 'image',
    source_kind: 'storage',
    storage_bucket: supabaseImageBucket,
    storage_path: storagePath,
    external_url: null,
    mime_type: mimeType,
    byte_size: input.file.size,
    alt: input.alt.trim(),
    caption: input.caption?.trim() || null,
    created_by: input.createdBy ?? null,
  };
  const insertResult = await client.from('media_records').insert(mediaRecord).select('*').single();

  if (insertResult.error) {
    await bucket.remove([storagePath]).catch(() => undefined);
    throw new Error(insertResult.error.message);
  }

  return {
    id: input.assetId?.trim() || insertResult.data?.id || storagePath,
    type: input.assetType ?? 'image',
    path: createSupabaseImageReference(storagePath),
    alt: input.alt.trim(),
    ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
  };
}

export async function createSupabaseSignedImageUrl(
  input: CreateSupabaseSignedImageUrlInput,
  options: UploadSupabaseImageOptions = {},
): Promise<string> {
  const client = assertSupabaseMediaClient(
    options.client ?? (supabase as SupabaseMediaClient | null),
  );
  const storagePath = parseSupabaseImageReference(input.reference);

  if (!storagePath) {
    throw new Error('Invalid Supabase image reference.');
  }

  const { data, error } = await client.storage
    .from(supabaseImageBucket)
    .createSignedUrl(storagePath, input.expiresInSeconds ?? defaultSignedUrlExpirationSeconds);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.signedUrl) {
    throw new Error('Supabase did not return a signed image URL.');
  }

  return data.signedUrl;
}
