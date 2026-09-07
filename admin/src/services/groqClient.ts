import { storageService } from './storageService';

/**
 * Thin browser client for Groq's OpenAI-compatible chat completions endpoint.
 * All generation in the admin panel goes through `groqChatJson`, which forces
 * JSON-object mode and parses the reply. Callers validate the shape themselves.
 */

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export const GROQ_MODEL_OPTIONS: { id: string; label: string; note: string }[] = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    note: 'Recommended. Best structured JSON quality, 32k output tokens.',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    note: 'Fastest and cheapest. Weaker on long level packs.',
  },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Strong reasoning, slower.' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'Light reasoning model.' },
];

export class GroqError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
  }
}

export function hasGroqKey(): boolean {
  return Boolean(storageService.getGroqApiKey());
}

export function getGroqModel(): string {
  return storageService.getGroqModel() || DEFAULT_GROQ_MODEL;
}

export interface GroqJsonRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message || JSON.stringify(body).slice(0, 200);
  } catch {
    return res.statusText;
  }
}

/**
 * Strips markdown fences and trailing chatter, then parses JSON.
 */
export function parseJsonLoose<T>(text: string): T {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new GroqError('Groq response was not valid JSON');
  }
}

export async function groqChatJson<T = unknown>(req: GroqJsonRequest): Promise<T> {
  const apiKey = storageService.getGroqApiKey();
  if (!apiKey) throw new GroqError('No Groq API key configured');
  const model = getGroqModel();

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      temperature: req.temperature ?? 0.7,
      max_completion_tokens: req.maxTokens ?? 8192,
      response_format: { type: 'json_object' },
    }),
    signal: req.signal,
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new GroqError(`Groq API ${res.status}: ${detail}`, res.status);
  }

  const data = await res.json();
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new GroqError('Groq returned an empty response');
  }
  return parseJsonLoose<T>(content);
}

/**
 * Cheap round-trip used by the Settings modal to verify a key before saving.
 */
export async function testGroqConnection(apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  if (!apiKey.trim()) return { ok: false, message: 'Enter a Groq API key first.' };
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Reply with JSON only.' },
          { role: 'user', content: 'Return the JSON object {"ok": true}.' },
        ],
        temperature: 0,
        max_completion_tokens: 20,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const detail = await readErrorDetail(res);
      return { ok: false, message: `Groq responded ${res.status}: ${detail}` };
    }
    const data = await res.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    return { ok: true, message: `Connected to ${model}. Reply: ${content.slice(0, 60)}` };
  } catch (e) {
    return {
      ok: false,
      message: `Could not reach Groq: ${(e as Error).message}. A "Failed to fetch" here usually means the browser blocked the request (CORS or network).`,
    };
  }
}
