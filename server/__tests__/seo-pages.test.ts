import { describe, it, expect } from 'vitest';
import {
  lessonTitleTag, clampDescription, buildPageMeta, isKnownPath, PAGE_META,
  renderLibrarySnapshot, renderHomeSnapshot, renderContentSnapshot, buildLlmsTxt, injectMeta,
} from '../seo';
import type { Topic } from '@shared/schema';

describe('lessonTitleTag', () => {
  it('keeps the full phrase when it fits in 60 chars', () => {
    expect(lessonTitleTag('Entropy')).toBe('Entropy, Explained from First Principles | BasicsTutor');
    expect(lessonTitleTag('How Tides Work')).toBe('How Tides Work, Explained Simply | BasicsTutor');
  });
  it('drops to a shorter suffix, never cutting the lesson name', () => {
    const t = lessonTitleTag('How Noise-Cancelling Headphones Work');
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.startsWith('How Noise-Cancelling Headphones Work')).toBe(true);
  });
  it('falls back to name | brand for very long names', () => {
    expect(lessonTitleTag('How Correlation and Causation Differ in Real Research')).toBe('How Correlation and Causation Differ in Real Research | BasicsTutor');
  });
});

describe('clampDescription', () => {
  it('leaves short text alone and cuts long text on a word boundary', () => {
    expect(clampDescription('Short and sweet.')).toBe('Short and sweet.');
    const long = 'word '.repeat(60).trim();
    const out = clampDescription(long);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('word…')).toBe(true);
  });
});

describe('page meta', () => {
  it('gives every public page a unique title under 60 chars and a canonical URL', () => {
    const titles = Object.values(PAGE_META).map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const t of titles) expect(t.length).toBeLessThanOrEqual(60);
    expect(buildPageMeta('/topics', 'https://www.basicstutor.com')?.url).toBe('https://www.basicstutor.com/topics');
    expect(buildPageMeta('/', 'https://www.basicstutor.com')?.image).toBe('https://www.basicstutor.com/og-default.png');
  });
  it('knows real routes and 404s the rest', () => {
    for (const p of ['/', '/topics', '/why', '/topic/how-tides-work', '/dashboard']) expect(isKnownPath(p)).toBe(true);
    for (const p of ['/wp-admin', '/topics/extra', '/random']) expect(isKnownPath(p)).toBe(false);
  });
  it('writes a robots noindex tag when asked', () => {
    const html = injectMeta('<html><head></head><body></body></html>', { title: 'x', description: 'y', url: 'u', robots: 'noindex' });
    expect(html).toContain('<meta name="robots" content="noindex" />');
  });
});

const lessons = [
  { title: 'How Tides Work', slug: 'how-tides-work', category: 'Earth Science', description: 'Why the sea rises and falls twice a day.' },
  { title: 'How DNA Works', slug: 'how-dna-works', category: 'Biology', description: null },
  { title: 'How <Bad> Works', slug: 'bad', category: null, description: null },
];

describe('crawlable snapshots', () => {
  it('library links every lesson, grouped by field, escaped', () => {
    const html = renderLibrarySnapshot(lessons);
    expect(html.match(/<a href="\/topic\//g)?.length).toBe(3);
    expect(html).toContain('Earth &amp; Environment');
    expect(html).toContain('How &lt;Bad&gt; Works');
    expect(html.match(/<h1/g)?.length).toBe(1);
  });
  it('home links into the library and featured lessons', () => {
    const html = renderHomeSnapshot(lessons.slice(0, 2));
    expect(html).toContain('href="/topics"');
    expect(html).toContain('href="/topic/how-dna-works"');
  });
  it('lesson snapshot carries breadcrumbs and related links', () => {
    const topic = { id: 't', title: 'How Tides Work', slug: 'how-tides-work', category: 'Earth Science', description: 'd', validationData: null, practicalSteps: null } as unknown as Topic;
    const html = renderContentSnapshot(topic, [], lessons.slice(1, 2));
    expect(html).toContain('<a href="/topics">Topic Library</a>');
    expect(html).toContain('href="/topic/how-dna-works"');
  });
  it('llms.txt lists lessons as markdown links', () => {
    const txt = buildLlmsTxt('https://www.basicstutor.com', lessons);
    expect(txt.startsWith('# BasicsTutor')).toBe(true);
    expect(txt).toContain('- [How Tides Work](https://www.basicstutor.com/topic/how-tides-work): Why the sea rises');
  });
});
