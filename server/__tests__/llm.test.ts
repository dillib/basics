import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

/**
 * The task router (server/llm.ts) against a local mock of Inception's
 * OpenAI-compatible Mercury API: real HTTP, zero spend.
 */

let server: http.Server;
let requests: { body: any; auth?: string }[] = [];
let reply: { status: number; content: string } = { status: 200, content: '{}' };
let llm: typeof import('../llm');

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ body: JSON.parse(body), auth: req.headers.authorization });
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: reply.content } }],
        usage: { prompt_tokens: 120, completion_tokens: 40 },
      }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  process.env.INCEPTION_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  process.env.INCEPTION_API_KEY = 'test-key';
  llm = await import('../llm');
});

afterAll(() => {
  server.close();
  delete process.env.INCEPTION_API_KEY;
  delete process.env.INCEPTION_BASE_URL;
});

beforeEach(() => {
  requests = [];
  delete process.env.MERCURY_DISABLED;
});

const req = {
  system: 'sys',
  prompt: 'Someone typed "python".',
  schema: { name: 'clarification', schema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'], additionalProperties: false } },
};
const parseQ = (v: unknown) => (typeof (v as any)?.question === 'string' ? (v as { question: string }) : null);

describe('generateJSON', () => {
  it('asks Mercury first with a strict JSON schema and the instant effort', async () => {
    reply = { status: 200, content: '{"question":"Which Python?"}' };
    const r = await llm.generateJSON('clarify', req, parseQ);
    expect(r?.provider).toBe('mercury');
    expect(r?.data.question).toBe('Which Python?');
    const sent = requests[0].body;
    expect(requests[0].auth).toBe('Bearer test-key');
    expect(sent.model).toBe(llm.MERCURY_MODEL);
    expect(sent.reasoning_effort).toBe('instant');
    expect(sent.response_format).toMatchObject({ type: 'json_schema', json_schema: { name: 'clarification', strict: true } });
    expect(sent.messages.map((m: any) => m.role)).toEqual(['system', 'user']);
  });

  it('accepts JSON wrapped in a code fence', async () => {
    reply = { status: 200, content: '```json\n{"question":"Fenced?"}\n```' };
    const r = await llm.generateJSON('clarify', req, parseQ);
    expect(r?.data.question).toBe('Fenced?');
  });

  it('moves on (null when nothing else is available) when Mercury errors', async () => {
    const saved = [process.env.GOOGLE_API_KEY, process.env.AI_INTEGRATIONS_GEMINI_API_KEY];
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    try {
      reply = { status: 500, content: '' };
      expect(await llm.generateJSON('clarify', req, parseQ)).toBeNull();
      reply = { status: 200, content: '{"nope":1}' }; // parse rejects it
      expect(await llm.generateJSON('clarify', req, parseQ)).toBeNull();
      reply = { status: 200, content: 'not json' };
      expect(await llm.generateJSON('clarify', req, parseQ)).toBeNull();
      expect(requests).toHaveLength(3);
    } finally {
      if (saved[0]) process.env.GOOGLE_API_KEY = saved[0];
      if (saved[1]) process.env.AI_INTEGRATIONS_GEMINI_API_KEY = saved[1];
    }
  });

  it('skips Mercury entirely when disabled', async () => {
    process.env.MERCURY_DISABLED = 'true';
    const saved = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      expect(await llm.generateJSON('quick_preview', req, parseQ)).toBeNull();
      expect(requests).toHaveLength(0);
    } finally {
      if (saved) process.env.GOOGLE_API_KEY = saved;
    }
  });
});

describe('costOf', () => {
  it('prices Mercury and Gemini per 1M tokens', () => {
    expect(llm.costOf(llm.MERCURY_MODEL, 1_000_000, 1_000_000)).toBeCloseTo(0.95);
    expect(llm.costOf('gemini-2.5-flash', 1_000_000, 0)).toBeCloseTo(0.3);
    expect(llm.costOf('unknown-model', 0, 1_000_000)).toBeCloseTo(2.5); // unknown -> Gemini prices, conservative
  });
});
