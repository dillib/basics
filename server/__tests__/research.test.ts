import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

/**
 * Exercises the Perplexity Agent API research step end to end against a local
 * mock of the Agent API (SDK posts to /v1/responses) -- real SDK, real HTTP request, zero spend.
 */

const briefJson = {
  recognized: true,
  canonical_name: 'Muse (Meta personal AI agent)',
  what_it_is: "Meta's personal AI agent, launched September 8, 2026.",
  key_facts: ['Launched September 8, 2026', 'Powered by the Muse Spark model'],
  how_it_works: 'It acts across a user\'s apps and accounts with permission.',
  fundamentals: ['What an AI agent is', 'Permissioned tool use', 'Memory and context'],
};

let server: http.Server;
let requests: { url?: string; body: any; auth?: string }[] = [];
let reply: { status: number; body: any } = { status: 200, body: {} };

const okResponse = (outputText: string) => ({
  id: 'resp_test', object: 'response', created_at: 0, status: 'completed', model: 'openai/gpt-6-luna',
  output: [
    { type: 'search_results', results: [
      { id: 1, url: 'https://about.fb.com/news/muse', title: 'Introducing Muse', date: '2026-09-08' },
      { id: 2, url: 'https://about.fb.com/news/muse', title: 'Duplicate URL', date: '2026-09-08' },
      { id: 3, url: 'https://techcrunch.com/muse', title: 'Meta debuts Muse' },
    ] },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: outputText, annotations: [] }] },
  ],
  output_text: outputText,
  usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150, cost: { total_cost: 0.0123, currency: 'USD' } },
});

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ url: req.url, body: body ? JSON.parse(body) : null, auth: req.headers.authorization });
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.PERPLEXITY_API_KEY = 'test-key';
  process.env.PERPLEXITY_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  delete process.env.PERPLEXITY_API_KEY;
  delete process.env.PERPLEXITY_BASE_URL;
});

beforeEach(() => {
  requests = [];
  reply = { status: 200, body: okResponse(JSON.stringify(briefJson)) };
});

async function freshModule() {
  const { vi } = await import('vitest');
  vi.resetModules(); // the client is created at import time from env
  return import('../research');
}

describe('researchTopic (Perplexity Agent API)', () => {
  it('sends a preset + structured-output request to the Agent API and returns a brief with deduped sources', async () => {
    const { researchTopic } = await freshModule();
    const brief = await researchTopic('How Meta Muse works');

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('/v1/responses'); // SDK route for the Agent API
    const body = requests[0].body;
    expect(body.preset).toBe('low');
    expect(body.input).toContain('How Meta Muse works');
    expect(body.instructions).toContain('never substitute a generic concept for a named entity');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.name).toBe('topic_research');
    expect(body.response_format.json_schema.schema.required).toContain('recognized');

    expect(brief?.canonical_name).toBe('Muse (Meta personal AI agent)');
    expect(brief?.fundamentals).toHaveLength(3);
    expect(brief?.sources.map((s) => s.url)).toEqual(['https://about.fb.com/news/muse', 'https://techcrunch.com/muse']);
    expect(brief?.sources[0].date).toBe('2026-09-08');
  });

  it('returns null (generation continues ungrounded) on a 401', async () => {
    reply = { status: 401, body: { error: { message: 'bad key' } } };
    const { researchTopic } = await freshModule();
    expect(await researchTopic('anything')).toBeNull();
  });

  it('returns null when the model output is not a valid brief', async () => {
    reply = { status: 200, body: okResponse('not json at all') };
    const { researchTopic } = await freshModule();
    expect(await researchTopic('anything')).toBeNull();
  });

  it('makes no request at all without a key', async () => {
    const saved = process.env.PERPLEXITY_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    const { researchTopic } = await freshModule();
    expect(await researchTopic('anything')).toBeNull();
    expect(requests).toHaveLength(0);
    process.env.PERPLEXITY_API_KEY = saved;
  });
});

describe('research helpers', () => {
  it('formats the brief as a prompt block flagging unrecognized subjects', async () => {
    const { formatResearchForPrompt } = await freshModule();
    const text = formatResearchForPrompt({ ...briefJson, recognized: false, misconceptions: [], ambiguity_note: 'Several products share this name', sources: [] });
    expect(text).toContain('Subject identified: NO');
    expect(text).toContain('Ambiguity: Several products share this name');
    expect(text).toContain('- Permissioned tool use');
  });
});
