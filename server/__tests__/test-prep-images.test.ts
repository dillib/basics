import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAllowedImageUrl, fetchImageAsDataUrl } from '../test-prep/images';

describe('fetchImageAsDataUrl', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  const stub = (bytes: number, type = 'image/png') => vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(bytes), { headers: { 'content-type': type } })));

  it('skips images over 1.5 MB (they would be re-sent and exceed model limits)', async () => {
    stub(1_600_000);
    expect(await fetchImageAsDataUrl('https://lh3.googleusercontent.com/x')).toBeNull();
  });

  it('keeps a normal-sized image', async () => {
    stub(200_000);
    expect(await fetchImageAsDataUrl('https://lh3.googleusercontent.com/x')).toMatch(/^data:image\/png;base64,/);
  });
});

describe('isAllowedImageUrl', () => {
  it.each([
    'https://lh7-rt.googleusercontent.com/docsz/AD_4nXabc?key=xyz',
    'https://lh3.googleusercontent.com/abc',
  ])('allows Google Docs image hosts: %s', (u) => expect(isAllowedImageUrl(u)).toBe(true));

  it.each([
    'http://lh3.googleusercontent.com/abc',            // not https
    'https://googleusercontent.com.evil.example/x',    // look-alike host
    'https://evil.example/googleusercontent.com/x',
    'https://169.254.169.254/latest/meta-data',        // cloud metadata
    'https://localhost/x',
    'file:///etc/passwd',
    'not a url',
  ])('blocks %s', (u) => expect(isAllowedImageUrl(u)).toBe(false));
});
