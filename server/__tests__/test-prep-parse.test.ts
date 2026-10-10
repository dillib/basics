import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateJSON = vi.fn();
vi.mock('../llm', () => ({ generateJSON: (...a: unknown[]) => generateJSON(...a) }));

import { normalizeParsed, parseQuestions } from '../test-prep/parse';

const q = (over: Record<string, unknown> = {}) => ({ stem: 'What is 2 + 2?', type: 'mc', options: ['3', '4'], image: -1, unreadable: false, ...over });

describe('normalizeParsed', () => {
  it('strips Google Docs option letters in every style', () => {
    const r = normalizeParsed({ grade: 8, subject: 'math', questions: [
      q({ options: ['a) 8 cm', 'b) 12 cm'] }),
      q({ options: ['A. 8 cm', 'B. 12 cm'] }),
      q({ options: ['(a) 8 cm', '(b) 12 cm'] }),
    ] }, 0);
    for (const x of r!.questions) expect(x.options).toEqual(['8 cm', '12 cm']);
  });

  it('caps at 30 questions and numbers them in order', () => {
    const r = normalizeParsed({ questions: Array.from({ length: 35 }, (_, i) => q({ stem: `Q${i}` })) }, 0);
    expect(r!.questions).toHaveLength(30);
    expect(r!.questions.map((x) => x.id).slice(0, 3)).toEqual(['q1', 'q2', 'q3']);
    expect(r!.questions[29].n).toBe(30);
  });

  it('fills True/False options for tf questions', () => {
    const r = normalizeParsed({ questions: [q({ type: 'tf', options: [] })] }, 0);
    expect(r!.questions[0].options).toEqual(['True', 'False']);
  });

  it('drops an out-of-range image index and keeps a valid one', () => {
    const r = normalizeParsed({ questions: [q({ image: 5 }), q({ image: 1 })] }, 2);
    expect(r!.questions[0].image).toBeUndefined();
    expect(r!.questions[1].image).toBe(1);
  });

  it('drops empty stems unless marked unreadable', () => {
    const r = normalizeParsed({ questions: [q({ stem: '  ' }), q({ stem: '', unreadable: true }), q()] }, 0);
    expect(r!.questions).toHaveLength(2);
    expect(r!.questions[0].unreadable).toBe(true);
  });

  it('keeps options only for mc', () => {
    const r = normalizeParsed({ questions: [q({ type: 'numeric', options: ['1', '2'] })] }, 0);
    expect(r!.questions[0].options).toEqual([]);
  });

  it('returns null for output with no question array', () => {
    expect(normalizeParsed({ nope: 1 }, 0)).toBeNull();
  });
});

describe('parseQuestions', () => {
  beforeEach(() => { generateJSON.mockReset(); });

  it('reads questions from an images-only paste', async () => {
    generateJSON.mockImplementation(async (_task: unknown, _req: unknown, parse: (v: unknown) => unknown) => ({ data: parse({ grade: 7, subject: 'science', questions: [q({ image: 0 }), q({ image: 1 })] }), provider: "gemini", ms: 1 }));
    const r = await parseQuestions({ text: '', images: ['data:image/png;base64,AAAA', 'data:image/jpeg;base64,BBBB'] });
    const [task, req] = generateJSON.mock.calls[0];
    expect(task).toBe('test_prep_parse');
    expect(req.images).toEqual([{ mimeType: 'image/png', data: 'AAAA' }, { mimeType: 'image/jpeg', data: 'BBBB' }]);
    expect(req.strictSafety).toBe(true);
    expect(r!.questions).toHaveLength(2);
    expect(r!.grade).toBe(7);
  });

  it('returns null when no model answers', async () => {
    generateJSON.mockResolvedValue(null);
    expect(await parseQuestions({ text: '1. What is 2+2?', images: [] })).toBeNull();
  });
});
