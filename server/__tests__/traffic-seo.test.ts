import { describe, it, expect } from 'vitest';
import { classifyVisit } from '../traffic';
import { buildTopicMeta, renderContentSnapshot } from '../seo';
import type { Topic, Principle } from '@shared/schema';

const OWN = ['www.basicstutor.com', 'basicstutor.com'];

describe('classifyVisit', () => {
  const cases: [string, Parameters<typeof classifyVisit>[0], string, string][] = [
    ['Google search', { referrer: 'https://www.google.com/' }, 'search', 'google.com'],
    ['Google country domain', { referrer: 'https://www.google.co.uk/' }, 'search', 'google.co.uk'],
    ['Bing', { referrer: 'https://www.bing.com/search?q=x' }, 'search', 'bing.com'],
    ['Gemini is AI, not search', { referrer: 'https://gemini.google.com/' }, 'ai', 'gemini.google.com'],
    ['ChatGPT via utm tag, no referrer', { referrer: '', utmSource: 'chatgpt.com' }, 'ai', 'chatgpt.com'],
    ['Perplexity', { referrer: 'https://www.perplexity.ai/' }, 'ai', 'perplexity.ai'],
    ['Reddit', { referrer: 'https://old.reddit.com/r/science' }, 'social', 'old.reddit.com'],
    ['X short link', { referrer: 'https://t.co/abc' }, 'social', 't.co'],
    ['Google Classroom', { referrer: 'https://classroom.google.com/c/123' }, 'classroom', 'classroom.google.com'],
    ['Canvas LMS', { referrer: 'https://school.instructure.com/courses/1' }, 'classroom', 'school.instructure.com'],
    ['Gmail', { referrer: 'https://mail.google.com/' }, 'email', 'mail.google.com'],
    ['Newsletter utm', { utmSource: 'weekly', utmMedium: 'email' }, 'email', 'weekly'],
    ['Unknown site', { referrer: 'https://someblog.example.org/post' }, 'referral', 'someblog.example.org'],
    ['No referrer', { referrer: '' }, 'direct', ''],
    ['Own site reload', { referrer: 'https://www.basicstutor.com/topics' }, 'internal', ''],
    ['In-app navigation', { internal: true, referrer: 'https://www.google.com/' }, 'internal', ''],
    ['Garbage referrer', { referrer: '::::' }, 'direct', ''],
  ];
  for (const [name, signal, source, host] of cases) {
    it(name, () => expect(classifyVisit(signal, OWN)).toEqual({ source, refHost: host }));
  }

  it('keeps only the domain, never the path or query', () => {
    const v = classifyVisit({ referrer: 'https://someblog.example.org/secret?email=a@b.com' }, OWN);
    expect(v.refHost).toBe('someblog.example.org');
  });
});

const topic = {
  id: 't1', title: 'How the Meta Muse Works?', slug: 'how-the-meta-muse-works', level: 'adult',
  description: 'Meta **Muse** explained', category: 'Technology', difficulty: 'beginner', estimatedMinutes: 25,
  createdAt: new Date('2026-09-20T10:00:00Z'), updatedAt: new Date('2026-09-27T11:29:00Z'),
  practicalSteps: ['**Review permissions:** set the minimum'],
  validationData: { sources: [
    { title: 'Introducing Muse', url: 'https://about.fb.com/news/muse', date: '2026-09-08' },
    { title: 'Bad', url: 'javascript:alert(1)' },
  ] },
} as unknown as Topic;
const principles = [
  { id: 'p1', topicId: 't1', orderIndex: 0, title: 'An agent *acts*', explanation: 'It **performs** tasks.', analogy: null, visualType: null, visualData: null, keyTakeaways: ['<b>x</b>'] },
] as unknown as Principle[];

describe('buildTopicMeta structured data', () => {
  const meta = buildTopicMeta(topic, 'https://www.basicstutor.com', principles);
  const graph = (meta.jsonLd as any)['@graph'] as any[];
  const lesson = graph.find((n) => Array.isArray(n['@type']) && n['@type'].includes('Article'));

  it('describes the lesson as an Article + LearningResource with dates, level and what it teaches', () => {
    expect(lesson['@type']).toEqual(['Article', 'LearningResource']);
    expect(lesson.datePublished).toBe('2026-09-20T10:00:00.000Z');
    expect(lesson.dateModified).toBe('2026-09-27T11:29:00.000Z');
    expect(lesson.educationalLevel).toBe('Adults');
    expect(lesson.timeRequired).toBe('PT25M');
    expect(lesson.teaches).toEqual(['An agent acts']);
    expect(lesson.image).toEqual(['https://www.basicstutor.com/og/how-the-meta-muse-works']);
    expect(meta.description).toBe('Meta Muse explained');
  });

  it('cites only real http(s) sources', () => {
    expect(lesson.citation).toEqual([{ '@type': 'CreativeWork', name: 'Introducing Muse', url: 'https://about.fb.com/news/muse', datePublished: '2026-09-08' }]);
  });

  it('adds breadcrumbs and a publisher with a logo', () => {
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((i: any) => i.name)).toEqual(['Home', 'Topic Library', 'How the Meta Muse Works?']);
    const org = graph.find((n) => n['@type'] === 'Organization');
    expect(org.logo.url).toBe('https://www.basicstutor.com/logo-512.png');
    expect(lesson.publisher).toEqual({ '@id': org['@id'] });
  });
});

describe('renderContentSnapshot', () => {
  const html = renderContentSnapshot(topic, principles);
  it('renders emphasis as tags, escapes HTML, and includes practice steps + safe sources', () => {
    expect(html).toContain('It <strong>performs</strong> tasks.');
    expect(html).toContain('An agent <em>acts</em>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('<strong>Review permissions:</strong> set the minimum');
    expect(html).toContain('href="https://about.fb.com/news/muse"');
    expect(html).not.toContain('javascript:');
  });
});
