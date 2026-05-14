import type {
  SupabaseMediaClient,
  SupabaseMediaRecordInsert,
} from '../../src/data/supabase/mediaStore';
import {
  createSupabaseImageReference,
  createSupabaseImageStoragePath,
  createSupabaseSignedImageUrl,
  isSupabaseImageReference,
  parseSupabaseImageReference,
  supabaseImageBucket,
  uploadSupabaseImage,
  validateSupabaseImageFile,
} from '../../src/data/supabase/mediaStore';

function createImageFile(options: { name?: string; type?: string; size?: number } = {}): File {
  const size = options.size ?? 128;
  const bytes = new Uint8Array(size);

  return new File([bytes], options.name ?? 'unit-circle.png', {
    type: options.type ?? 'image/png',
  });
}

function createMockClient() {
  const uploaded: Array<{
    bucket: string;
    path: string;
    file: Blob;
    options: { contentType?: string; upsert?: boolean } | undefined;
  }> = [];
  const insertedRows: SupabaseMediaRecordInsert[] = [];
  const signedUrlCalls: Array<{ bucket: string; path: string; expiresIn: number }> = [];

  const client: SupabaseMediaClient = {
    storage: {
      from(bucket) {
        return {
          async upload(path, file, options) {
            uploaded.push({ bucket, path, file, options });
            return { data: { path }, error: null };
          },
          async createSignedUrl(path, expiresIn) {
            signedUrlCalls.push({ bucket, path, expiresIn });
            return {
              data: {
                signedUrl: `https://example.supabase.co/storage/${bucket}/${path}?token=abc`,
              },
              error: null,
            };
          },
        };
      },
    },
    from(table) {
      if (table !== 'media_records') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        insert(row) {
          insertedRows.push(row);
          return {
            select() {
              return {
                async single() {
                  return {
                    data: {
                      ...row,
                      id: 'media-record-1',
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return { client, insertedRows, signedUrlCalls, uploaded };
}

describe('supabase image references', () => {
  it('creates, parses, and identifies stable storage references', () => {
    const reference = createSupabaseImageReference('uploads/admin/2026/05/14/graph-abc123.png');

    expect(reference).toBe('supabase-image:uploads/admin/2026/05/14/graph-abc123.png');
    expect(isSupabaseImageReference(reference)).toBe(true);
    expect(parseSupabaseImageReference(reference)).toBe(
      'uploads/admin/2026/05/14/graph-abc123.png',
    );
  });

  it('rejects malformed stable references', () => {
    expect(parseSupabaseImageReference('supabase-image:../secret.png')).toBeNull();
    expect(parseSupabaseImageReference('supabase-image:/secret.png')).toBeNull();
    expect(parseSupabaseImageReference('local-image:image-123')).toBeNull();
    expect(() => createSupabaseImageReference('../secret.png')).toThrow();
  });
});

describe('supabase image validation and paths', () => {
  it('accepts schema-supported cloud image MIME types', () => {
    expect(validateSupabaseImageFile(createImageFile({ type: 'image/png' }))).toBe('image/png');
    expect(validateSupabaseImageFile(createImageFile({ type: 'image/jpeg' }))).toBe('image/jpeg');
    expect(validateSupabaseImageFile(createImageFile({ type: 'image/webp' }))).toBe('image/webp');
    expect(validateSupabaseImageFile(createImageFile({ type: 'image/gif' }))).toBe('image/gif');
  });

  it('infers supported MIME types from file extensions when the browser omits file.type', () => {
    expect(validateSupabaseImageFile(createImageFile({ name: 'plot.JPG', type: '' }))).toBe(
      'image/jpeg',
    );
    expect(validateSupabaseImageFile(createImageFile({ name: 'plot.webp', type: '' }))).toBe(
      'image/webp',
    );
  });

  it('rejects oversize images and SVG cloud uploads', () => {
    expect(() => validateSupabaseImageFile(createImageFile({ size: 1024 * 1024 + 1 }))).toThrow(
      /1 MB/,
    );
    expect(() => validateSupabaseImageFile(createImageFile({ type: 'image/svg+xml' }))).toThrow(
      /PNG, JPEG, WebP, or GIF/,
    );
  });

  it('generates stable storage paths with owner, date, safe asset slug, random id, and extension', () => {
    const path = createSupabaseImageStoragePath({
      file: createImageFile({ name: 'Trig Graph.PNG', type: 'image/png' }),
      alt: 'Graph of a trigonometric function.',
      assetId: 'Prompt Graph #1',
      createdBy: 'Admin User@example.com',
      now: () => new Date('2026-05-14T12:00:00.000Z'),
      randomId: () => 'fixed id!',
    });

    expect(path).toBe('uploads/admin-user-example-com/2026/05/14/prompt-graph-1-fixed-id.png');
  });
});

describe('supabase image uploads', () => {
  it('uploads to storage, inserts media metadata, and returns an app-ready asset reference', async () => {
    const { client, insertedRows, uploaded } = createMockClient();
    const file = createImageFile({ name: 'solution.webp', type: 'image/webp', size: 512 });
    const asset = await uploadSupabaseImage(
      {
        file,
        alt: 'Annotated solution graph.',
        caption: 'Solution graph',
        createdBy: 'admin-1',
        assetId: 'solution-graph',
        assetType: 'graph',
        now: () => new Date('2026-05-14T12:00:00.000Z'),
        randomId: () => 'abc123',
      },
      { client },
    );

    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toMatchObject({
      bucket: supabaseImageBucket,
      path: 'uploads/admin-1/2026/05/14/solution-graph-abc123.webp',
      options: {
        contentType: 'image/webp',
        upsert: false,
      },
    });
    expect(insertedRows).toEqual([
      {
        kind: 'image',
        source_kind: 'storage',
        storage_bucket: supabaseImageBucket,
        storage_path: 'uploads/admin-1/2026/05/14/solution-graph-abc123.webp',
        external_url: null,
        mime_type: 'image/webp',
        byte_size: 512,
        alt: 'Annotated solution graph.',
        caption: 'Solution graph',
        created_by: 'admin-1',
      },
    ]);
    expect(asset).toEqual({
      id: 'solution-graph',
      type: 'graph',
      path: 'supabase-image:uploads/admin-1/2026/05/14/solution-graph-abc123.webp',
      alt: 'Annotated solution graph.',
      caption: 'Solution graph',
    });
  });
});

describe('supabase signed image URLs', () => {
  it('creates short-lived signed URLs from stable app references', async () => {
    const { client, signedUrlCalls } = createMockClient();
    const url = await createSupabaseSignedImageUrl(
      {
        reference: 'supabase-image:uploads/admin-1/2026/05/14/graph-abc123.png',
        expiresInSeconds: 120,
      },
      { client },
    );

    expect(signedUrlCalls).toEqual([
      {
        bucket: supabaseImageBucket,
        path: 'uploads/admin-1/2026/05/14/graph-abc123.png',
        expiresIn: 120,
      },
    ]);
    expect(url).toBe(
      'https://example.supabase.co/storage/question-images/uploads/admin-1/2026/05/14/graph-abc123.png?token=abc',
    );
  });
});
