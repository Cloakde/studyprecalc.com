import {
  createLocalVideoReference,
  getLocalVideoId,
  isLocalVideoReference,
} from '../../src/data/localVideoStore';

describe('local video store references', () => {
  it('creates and parses local video references', () => {
    const reference = createLocalVideoReference('video-123_abc');

    expect(reference).toBe('local-video:video-123_abc');
    expect(isLocalVideoReference(reference)).toBe(true);
    expect(getLocalVideoId(reference)).toBe('video-123_abc');
  });

  it('rejects malformed local video references', () => {
    expect(getLocalVideoId('local-video:../secret')).toBeNull();
    expect(getLocalVideoId('https://example.com/video.mp4')).toBeNull();
  });
});
