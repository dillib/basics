import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

/**
 * Exercises the Claude Opus 5.5 scene path end to end against a local mock
 * of the Anthropic Messages API -- real SDK, real request, zero spend. The DB
 * and Gemini are mocked.
 */

const storageMock = {
  getPrinciplesByIds: vi.fn(),
  getTopic: vi.fn(),
  getPrinciplesByTopic: vi.fn(),
  updatePrincipleVisual: vi.fn(),
};
vi.mock('../storage', () => ({ storage: storageMock }));

const geminiGenerate = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: geminiGenerate };
  },
}));

const flowScene = {
  kind: 'flow',
  caption: 'Follow each step from heat to pressure.',
  steps: [{ label: 'Heat added' }, { label: 'Molecules speed up' }, { label: 'Pressure rises' }],
};

let server: http.Server;
let requests: any[] = [];
let nextResponse: { stop_reason: string; text: string } = { stop_reason: 'end_turn', text: JSON.stringify(flowScene) };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
        content: [{ type: 'text', text: nextResponse.text }],
        stop_reason: nextResponse.stop_reason, stop_sequence: null,
        usage: { input_tokens: 420, output_tokens: 310, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 },
      }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_BASE_URL;
});

const principle = (visualData: unknown) => ({
  id: 'p1', topicId: 't1', orderIndex: 0, title: 'Pressure from heat',
  explanation: 'Adding heat speeds molecules up, so they hit the walls harder and more often.',
  analogy: null, visualType: 'flowchart', visualData, keyTakeaways: [],
});

async function freshModule() {
  vi.resetModules(); // the Claude client is created at import time from env
  return import('../visuals');
}

beforeEach(() => {
  requests = [];
  nextResponse = { stop_reason: 'end_turn', text: JSON.stringify(flowScene) };
  Object.values(storageMock).forEach((m) => m.mockReset());
  geminiGenerate.mockReset();
  storageMock.getTopic.mockResolvedValue({ id: 't1', title: 'Gas Laws' });
  storageMock.getPrinciplesByTopic.mockResolvedValue([]);
});

describe('canAccessVisuals (paid-feature gate)', () => {
  it('free launch mode: everyone gets visuals, including signed-out visitors', async () => {
    const { canAccessVisuals } = await freshModule();
    expect(canAccessVisuals(false, undefined)).toBe(true);
    expect(canAccessVisuals(false, { plan: 'free' })).toBe(true);
  });

  it('monetization on: only an active Pro subscription gets visuals', async () => {
    const { canAccessVisuals } = await freshModule();
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect(canAccessVisuals(true, undefined)).toBe(false);
    expect(canAccessVisuals(true, { plan: 'free' })).toBe(false);
    expect(canAccessVisuals(true, { plan: 'pro', proExpiresAt: past })).toBe(false);
    expect(canAccessVisuals(true, { plan: 'pro', proExpiresAt: future })).toBe(true);
    expect(canAccessVisuals(true, { plan: 'pro', proExpiresAt: null })).toBe(true);
  });
});

describe('scene generation with Claude Opus 5.5', () => {
  it('sends a cached system prompt, low effort, and a JSON schema to claude-opus-5-5', async () => {
    storageMock.getPrinciplesByIds.mockResolvedValue([principle({ type: 'x', description: 'brief' })]);
    const { getOrCreateScene } = await freshModule();

    const spec = await getOrCreateScene('p1');

    expect(spec?.kind).toBe('flow');
    expect(requests).toHaveLength(1);
    const body = requests[0].body;
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.output_config.effort).toBe('low');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.anyOf).toHaveLength(7);
    // Opus 5.5 400s on these -- they must never be sent.
    expect(body.thinking).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    // Per-principle data goes in the user turn, not the cached system prompt.
    expect(body.system[0].text).not.toContain('Pressure from heat');
    expect(body.messages[0].content).toContain('Pressure from heat');
    expect(body.messages[0].content).toContain('intended a "flow" scene');
    expect(geminiGenerate).not.toHaveBeenCalled();

    const saved = storageMock.updatePrincipleVisual.mock.calls[0][2];
    expect(saved).toMatchObject({ v: 2, gen: 2, model: 'claude-opus-5-5', claudeFailed: false, authorType: 'flowchart' });
  });

  it('keeps the cacheable system prompt above the 512-token minimum', async () => {
    storageMock.getPrinciplesByIds.mockResolvedValue([principle(null)]);
    const { getOrCreateScene } = await freshModule();
    await getOrCreateScene('p1');
    // ~4 chars/token is a conservative English estimate.
    expect(requests[0].body.system[0].text.length / 4).toBeGreaterThan(600);
  });

  it('falls back to Gemini on a refusal, and records that Claude already had its shot', async () => {
    nextResponse = { stop_reason: 'refusal', text: '' };
    geminiGenerate.mockResolvedValue({ text: JSON.stringify(flowScene) });
    storageMock.getPrinciplesByIds.mockResolvedValue([principle(null)]);
    const { getOrCreateScene } = await freshModule();

    const spec = await getOrCreateScene('p1');

    expect(spec?.kind).toBe('flow');
    expect(requests).toHaveLength(1); // exactly one Opus call, no retry
    expect(geminiGenerate).toHaveBeenCalledTimes(1);
    expect(storageMock.updatePrincipleVisual.mock.calls[0][2]).toMatchObject({ model: 'gemini-2.5-flash', claudeFailed: true });
  });

  it('does not re-bill Opus for a scene where Claude already failed', async () => {
    storageMock.getPrinciplesByIds.mockResolvedValue([
      principle({ v: 2, spec: flowScene, gen: 2, model: 'gemini-2.5-flash', claudeFailed: true }),
    ]);
    const { getOrCreateScene } = await freshModule();
    expect((await getOrCreateScene('p1'))?.kind).toBe('flow');
    expect(requests).toHaveLength(0);
  });

  it('upgrades a Gemini-era scene to Opus exactly once when the key is added', async () => {
    storageMock.getPrinciplesByIds.mockResolvedValue([
      principle({ v: 2, spec: flowScene, gen: 2, model: 'gemini-2.5-flash' }),
    ]);
    const { getOrCreateScene } = await freshModule();
    await getOrCreateScene('p1');
    expect(requests).toHaveLength(1);
    expect(storageMock.updatePrincipleVisual.mock.calls[0][2].model).toBe('claude-opus-5-5');
  });

  it('serves an Opus-written scene from the DB with no API call', async () => {
    storageMock.getPrinciplesByIds.mockResolvedValue([
      principle({ v: 2, spec: flowScene, gen: 2, model: 'claude-opus-5-5' }),
    ]);
    const { getOrCreateScene } = await freshModule();
    await getOrCreateScene('p1');
    expect(requests).toHaveLength(0);
  });
});
