export type TaterImageStatus = 'pending' | 'approved' | 'rejected' | 'discarded';

export type TaterImage = {
  id: string;
  categoryId: string;
  status: TaterImageStatus;
  url: string | null;
  storageKey: string | null;
  width: number | null;
  height: number | null;
  source: string;
  sourcePageUrl: string | null;
  originalUrl: string;
  title: string | null;
  author: string | null;
  license: string | null;
  aiScore: number | null;
  aiReason: string | null;
  createdAt: string;
};

export type TaterJobEvent = {
  at: string;
  categoryId: string | null;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type TaterJob = {
  id: string;
  scope: 'category' | 'question' | 'audit';
  categoryIds: string[];
  questionId: string | null;
  targetPerCategory: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: Record<
    string,
    { checked: number; accepted: number; discarded: number; done: boolean; note?: string; total?: number }
  >;
  checked: number;
  accepted: number;
  discarded: number;
  events: TaterJobEvent[];
  error: string | null;
  startedAt: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type TaterCategory = {
  id: string;
  group: string;
  label: string;
  description: string;
  searchQueries: string[];
  counts: Record<TaterImageStatus, number>;
  previews: TaterImage[];
  usedByQuestions: string[];
  activeJob: TaterJob | null;
};

export type TaterQuestionOption = {
  id: string;
  art: string;
  label?: string;
  categoryLabel: string;
  approvedCount: number;
  pendingCount: number;
  previewImage: TaterImage | null;
  pendingPreviewImage: TaterImage | null;
};

export type TaterQuestion = {
  id: string;
  mode: 'variety' | 'disease' | 'growth';
  prompt: string;
  hint: string;
  learn: string;
  correctOptionId: string;
  options: TaterQuestionOption[];
  isActive: boolean;
  ready: boolean;
};

export class TaterApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'TaterApiError';
  }
}

async function taterFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init?.body) headers['content-type'] = 'application/json';

  const res = await fetch(`/api/admin/tater-match${path}`, { ...init, headers, cache: 'no-store' });
  let json: { data?: T; message?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new TaterApiError(json?.message || `Tater Match API error (${res.status})`, res.status);
  }
  return json?.data as T;
}

export const taterMatchApi = {
  listCategories: () =>
    taterFetch<{ targetPoolSize: number; results: TaterCategory[] }>('/categories'),

  listCategoryImages: (categoryId: string, status?: TaterImageStatus) =>
    taterFetch<{ results: TaterImage[]; total: number }>(
      `/categories/${encodeURIComponent(categoryId)}/images?limit=100${status ? `&status=${status}` : ''}`,
    ),

  updateSearchQueries: (categoryId: string, searchQueries: string[]) =>
    taterFetch<TaterCategory>(`/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ searchQueries }),
    }),

  refreshCategory: (categoryId: string, targetPerCategory?: number) =>
    taterFetch<TaterJob>(`/categories/${encodeURIComponent(categoryId)}/refresh`, {
      method: 'POST',
      body: JSON.stringify(targetPerCategory ? { targetPerCategory } : {}),
    }),

  setImagesStatus: (ids: string[], status: 'approved' | 'rejected' | 'pending') =>
    taterFetch<{ updated: number }>('/images/status', {
      method: 'PATCH',
      body: JSON.stringify({ ids, status }),
    }),

  listQuestions: () =>
    taterFetch<{ results: TaterQuestion[]; total: number; ready: number }>('/questions?includeInactive=true'),

  refreshQuestion: (questionId: string) =>
    taterFetch<TaterJob>(`/questions/${encodeURIComponent(questionId)}/refresh`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  setQuestionActive: (questionId: string, isActive: boolean) =>
    taterFetch<TaterQuestion>(`/questions/${encodeURIComponent(questionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  reviewQueue: () => taterFetch<{ total: number; results: TaterReviewGroup[] }>('/review'),

  publishStatus: () => taterFetch<TaterPublishStatus>('/publish'),
  publish: () => taterFetch<TaterPublishStatus>('/publish', { method: 'POST' }),
  unpublish: () => taterFetch<TaterPublishStatus>('/unpublish', { method: 'POST' }),

  listJobs: () => taterFetch<{ results: TaterJob[] }>('/jobs?limit=20'),
  startAudit: () => taterFetch<TaterJob>('/audit', { method: 'POST' }),
};

export type TaterReviewGroup = {
  categoryId: string;
  label: string;
  description: string;
  group: string;
  approvedCount: number;
  images: TaterImage[];
};

export type TaterPublishStatus = {
  published: boolean;
  publishedAt: string | null;
  /** Published questions players can get right now. */
  liveCount: number;
  /** Published questions that lost every approved photo of an option since publishing. */
  brokenCount: number;
  /** Active questions with an approved photo for every option. */
  readyCount: number;
  /** Ready questions that the next Publish would add. */
  newReadyCount: number;
  totalActive: number;
  notReady: Array<{
    id: string;
    prompt: string;
    missing: Array<{ categoryId: string; label: string; pending: number }>;
  }>;
};
