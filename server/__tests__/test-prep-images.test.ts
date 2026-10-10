import { describe, it, expect } from 'vitest';
import { isAllowedImageUrl } from '../test-prep/images';

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
