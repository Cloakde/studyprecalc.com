import {
  createLocalImageReference,
  getLocalImageId,
  isLocalImageReference,
} from '../../src/data/localImageStore';

describe('local image store references', () => {
  it('creates and parses local image references', () => {
    const reference = createLocalImageReference('image-123_abc');

    expect(reference).toBe('local-image:image-123_abc');
    expect(isLocalImageReference(reference)).toBe(true);
    expect(getLocalImageId(reference)).toBe('image-123_abc');
  });

  it('rejects malformed local image references', () => {
    expect(getLocalImageId('local-image:../secret')).toBeNull();
    expect(getLocalImageId('https://example.com/plot.png')).toBeNull();
  });
});
