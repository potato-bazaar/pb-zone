import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import {
  taterMatchApi,
  type TaterCategory,
  type TaterImage,
  type TaterImageStatus,
  type TaterJob,
  type TaterJobEvent,
  type TaterPublishStatus,
  type TaterQuestion,
  type TaterReviewGroup,
} from '../../services/taterMatchApi';

type ModeFilter = 'all' | TaterQuestion['mode'];

const POLL_MS = 4000;
// Slower poll while idle, so jobs started outside the admin (CLI) still show up.
const IDLE_POLL_MS = 15000;

const MODE_LABELS: Record<TaterQuestion['mode'], string> = {
  variety: 'Variety',
  disease: 'Leaf health',
  growth: 'Growth',
};

const GROUP_LABELS: Record<string, string> = {
  variety: 'Potato varieties',
  disease: 'Leaf health',
  growth: 'Growth stages',
  quality: 'Tuber quality',
  tool: 'Farm tools',
};
const GROUP_ORDER = Object.keys(GROUP_LABELS);

const STATUS_TABS: Array<{ id: TaterImageStatus; label: string }> = [
  { id: 'pending', label: 'Pending review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'discarded', label: 'Auto-removed' },
];

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');

const isActiveJob = (job: TaterJob | null | undefined) =>
  !!job && (job.status === 'queued' || job.status === 'running');

function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm',
        variant === 'primary' && 'bg-black text-white hover:bg-black/85',
        variant === 'outline' && 'border border-[#E2E2E2] bg-white hover:bg-[#F4F4F4]',
        variant === 'ghost' && 'hover:bg-[#F4F4F4]',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'success' && 'bg-emerald-600 text-white hover:bg-emerald-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function ProgressBar({ value, max, failed }: { value: number; max: number; failed?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10" role="progressbar" aria-valuenow={pct}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', failed ? 'bg-red-500' : 'bg-emerald-500')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const lastEvent = (job: TaterJob, categoryId?: string): TaterJobEvent | undefined => {
  const events = job.events ?? [];
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (!categoryId || events[i].categoryId === categoryId) return events[i];
  }
  return undefined;
};

/** Numbers for a job's progress bar. A re-check measures images checked against images to check. */
const jobNumbers = (job: TaterJob, categoryId?: string) => {
  const entries = categoryId ? [job.progress?.[categoryId]].filter(Boolean) : Object.values(job.progress ?? {});
  const sum = (key: 'checked' | 'accepted' | 'discarded' | 'total') =>
    entries.reduce((total, entry) => total + (entry?.[key] ?? 0), 0);
  const checked = categoryId ? sum('checked') : job.checked;
  const accepted = categoryId ? sum('accepted') : job.accepted;
  const discarded = categoryId ? sum('discarded') : job.discarded;
  if (job.scope === 'audit') {
    const total = sum('total');
    return {
      value: checked,
      max: total,
      summary: `${checked}/${total || '?'} re-checked · ${accepted} passed · ${discarded} removed`,
    };
  }
  const target = job.targetPerCategory * (categoryId ? 1 : Math.max(1, job.categoryIds.length));
  return {
    value: accepted,
    max: target,
    summary: `${accepted}/${target} kept · ${checked} checked · ${discarded} discarded`,
  };
};

function JobProgress({ job, categoryId }: { job: TaterJob; categoryId?: string }) {
  const entry = categoryId ? job.progress?.[categoryId] : undefined;
  const numbers = jobNumbers(job, categoryId);
  const latest = lastEvent(job, categoryId);
  const activity = job.scope === 'audit' ? 'Re-checking images' : 'Fetching images';
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
      <div className="flex flex-wrap items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="font-medium">{job.status === 'queued' ? 'Queued' : activity}</span>
        <span>{numbers.summary}</span>
      </div>
      <ProgressBar value={numbers.value} max={numbers.max} />
      {latest && (
        <div className={cn('truncate', latest.level === 'error' ? 'text-red-700' : 'text-amber-800')}>
          {latest.message}
        </div>
      )}
      {entry?.note && <div className="truncate text-amber-700">({entry.note})</div>}
    </div>
  );
}

const EVENT_STYLES: Record<TaterJobEvent['level'], string> = {
  info: 'text-[#444]',
  warn: 'text-amber-700',
  error: 'text-red-700 font-medium',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const jobLabel = (job: TaterJob, categoryById: Map<string, TaterCategory>) => {
  if (job.scope === 'audit') return `Quality re-check (${job.categoryIds.length} categories)`;
  if (job.scope === 'question') return `Question ${job.questionId}`;
  return job.categoryIds.map((id) => categoryById.get(id)?.label ?? id).join(', ');
};

/** Live view of what the image fetcher is doing: progress, recent jobs and the activity/error log. */
function LiveActivity({
  jobs,
  categoryById,
}: {
  jobs: TaterJob[];
  categoryById: Map<string, TaterCategory>;
}) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);

  const active = jobs.filter(isActiveJob);
  const shown = jobs.find((job) => job.id === selectedJobId) ?? active[0] ?? jobs[0] ?? null;
  if (!shown) return null;

  const events = [...(shown.events ?? [])]
    .reverse()
    .filter((event) => !problemsOnly || event.level !== 'info');
  const problemCount = (shown.events ?? []).filter((event) => event.level !== 'info').length;
  const numbers = jobNumbers(shown);
  const running = isActiveJob(shown);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#E2E2E2] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" /> Image fetcher activity
          {active.length > 0 ? (
            <Badge className="border-transparent bg-amber-100 text-amber-800">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Running
            </Badge>
          ) : (
            <Badge variant="secondary">Idle</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {jobs.slice(0, 10).map((job) => {
            const done = job.status === 'completed';
            const failed = job.status === 'failed';
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                title={`${jobLabel(job, categoryById)} · ${job.status}`}
                className={cn(
                  'flex max-w-[11rem] items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px]',
                  job.id === shown.id ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white hover:bg-[#F4F4F4]',
                )}
              >
                {isActiveJob(job) && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                {done && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />}
                {failed && <XCircle className="h-3 w-3 shrink-0 text-red-500" />}
                <span className="truncate">{jobLabel(job, categoryById)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">{jobLabel(shown, categoryById)}</span>
          <span className="text-muted-foreground">
            {numbers.summary} · {running ? (shown.status === 'queued' ? 'queued' : 'running') : shown.status}
          </span>
        </div>
        <ProgressBar value={numbers.value} max={numbers.max} failed={shown.status === 'failed'} />
        {shown.error && (
          <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">Job failed: {shown.error}</div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Activity log (newest first)</span>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
          <AlertTriangle className="h-3 w-3 text-amber-600" /> Problems only ({problemCount})
        </label>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border border-[#EEE] bg-[#FAFAFA] p-2 font-mono text-[11px] leading-5">
        {events.length === 0 ? (
          <div className="text-muted-foreground">
            {problemsOnly ? 'No problems in this job.' : 'No activity recorded for this job.'}
          </div>
        ) : (
          events.map((event, index) => (
            <div key={`${event.at}-${index}`} className={cn('flex gap-2', EVENT_STYLES[event.level])}>
              <span className="shrink-0 text-muted-foreground">{formatTime(event.at)}</span>
              {event.categoryId && shown.categoryIds.length > 1 && (
                <span className="shrink-0 text-muted-foreground">[{event.categoryId}]</span>
              )}
              <span className="break-words">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Questions (demo preview)                                           */
/* ------------------------------------------------------------------ */

function QuestionCard({
  question,
  busyJob,
  onRefresh,
  onOpenCategory,
  onToggleActive,
}: {
  question: TaterQuestion;
  busyJob: TaterJob | null;
  onRefresh: () => Promise<void>;
  onOpenCategory: (categoryId: string) => void;
  onToggleActive: (isActive: boolean) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    setError(null);
    try {
      await onToggleActive(!question.isActive);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-white p-4',
        question.isActive ? 'border-[#E2E2E2]' : 'border-dashed border-[#D0D0D0] opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{MODE_LABELS[question.mode]}</Badge>
            {question.ready ? (
              <Badge className="border-transparent bg-emerald-100 text-emerald-800">Ready</Badge>
            ) : (
              <Badge className="border-transparent bg-amber-100 text-amber-800">
                Needs photos: {question.options.filter((o) => o.approvedCount === 0).length}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{question.id}</span>
          </div>
          <div className="text-sm font-semibold">{question.prompt}</div>
          {question.hint && <div className="text-xs text-muted-foreground">{question.hint}</div>}
        </div>
        <label
          className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium"
          title="Off = never shown to players, even after publishing"
        >
          <input type="checkbox" checked={question.isActive} disabled={toggling} onChange={handleToggle} />
          In game
        </label>
      </div>
      {!question.ready && question.isActive && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
          <span>
            Approve a photo for:{' '}
            {question.options
              .filter((o) => o.approvedCount === 0)
              .map((o) => o.categoryLabel)
              .join(', ')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || !!busyJob}
            title="Fetch new photos for this question's options"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (refreshing || busyJob) && 'animate-spin')} />
            Find photos
          </Button>
        </div>
      )}

      {busyJob && <JobProgress job={busyJob} />}
      {error && <div className="text-xs text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option) => {
          const isCorrect = option.id === question.correctOptionId;
          const revealed = picked !== null;
          const shown = option.previewImage ?? option.pendingPreviewImage;
          const isPendingPreview = !option.previewImage && !!option.pendingPreviewImage;
          return (
            <div key={option.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setPicked(option.id)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-md border-2 bg-[#F4F4F4] transition-colors',
                  !revealed && 'border-transparent hover:border-black',
                  revealed && isCorrect && 'border-emerald-500',
                  revealed && !isCorrect && picked === option.id && 'border-red-500',
                  revealed && !isCorrect && picked !== option.id && 'border-transparent opacity-60',
                )}
              >
                {shown?.url ? (
                  <img
                    src={shown.url}
                    alt={option.categoryLabel}
                    loading="lazy"
                    className={cn('h-full w-full object-cover', isPendingPreview && 'opacity-80')}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                    No images yet — click Refresh
                  </div>
                )}
                {isPendingPreview && (
                  <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                    Pending review
                  </span>
                )}
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[11px] font-bold uppercase text-white">
                  {option.id}
                </span>
                {revealed && isCorrect && (
                  <span className="absolute right-1 top-1 rounded-full bg-emerald-500 p-0.5 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenCategory(option.art)}
                className="flex items-center justify-between gap-1 text-left text-[11px] text-muted-foreground hover:text-black"
                title="Open this image pool"
              >
                <span className="truncate">{option.label || option.categoryLabel}</span>
                <span className={cn('shrink-0', option.approvedCount === 0 && 'font-semibold text-amber-700')}>
                  {option.approvedCount} approved
                  {option.pendingCount > 0 && ` · ${option.pendingCount} pending`}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {picked && (
        <div className="flex items-start justify-between gap-2 rounded-md bg-[#F7F7F7] p-2.5 text-xs">
          <div>
            <span
              className={cn(
                'font-semibold',
                picked === question.correctOptionId ? 'text-emerald-700' : 'text-red-600',
              )}
            >
              {picked === question.correctOptionId ? 'Correct! ' : 'Not quite. '}
            </span>
            {question.learn}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPicked(null)} title="Reset demo">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image pool                                                         */
/* ------------------------------------------------------------------ */

function ImageTile({
  image,
  selected,
  onToggle,
  onSetStatus,
}: {
  image: TaterImage;
  selected: boolean;
  onToggle: () => void;
  onSetStatus: (status: 'approved' | 'rejected' | 'pending') => void;
}) {
  const reviewable = image.status !== 'discarded';
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-md border bg-white',
        selected ? 'border-black ring-1 ring-black' : 'border-[#E2E2E2]',
      )}
    >
      <button
        type="button"
        className="relative aspect-square bg-[#F4F4F4]"
        onClick={reviewable ? onToggle : undefined}
        disabled={!reviewable}
      >
        {image.url ? (
          <img src={image.url} alt={image.title ?? ''} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[11px] text-muted-foreground">
            <ImageOff className="h-5 w-5" />
            Not stored
          </div>
        )}
        {image.aiScore !== null && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[11px] font-semibold text-white">
            AI {Math.round(Number(image.aiScore) * 100)}%
          </span>
        )}
        {reviewable && (
          <span
            className={cn(
              'absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded border',
              selected ? 'border-black bg-black text-white' : 'border-white bg-white/80',
            )}
          >
            {selected && <Check className="h-3 w-3" />}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-2 text-[11px]">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium capitalize">{image.source}</span>
          <a
            href={image.sourcePageUrl || image.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-black"
            title="Open source page"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {(image.author || image.license) && (
          <div className="truncate text-muted-foreground" title={[image.author, image.license].filter(Boolean).join(' · ')}>
            {[image.author, image.license].filter(Boolean).join(' · ')}
          </div>
        )}
        {image.aiReason && (
          <div className="line-clamp-2 text-muted-foreground" title={image.aiReason}>
            {image.aiReason}
          </div>
        )}
        {reviewable && (
          <div className="mt-auto flex gap-1 pt-1">
            {image.status !== 'approved' && (
              <Button variant="success" size="sm" className="flex-1" onClick={() => onSetStatus('approved')}>
                <Check className="h-3 w-3" /> Approve
              </Button>
            )}
            {image.status !== 'rejected' && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onSetStatus('rejected')}>
                <X className="h-3 w-3" /> Reject
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPanel({
  category,
  targetPoolSize,
  onChanged,
}: {
  category: TaterCategory;
  targetPoolSize: number;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<TaterImageStatus>(category.counts.pending > 0 ? 'pending' : 'approved');
  const [images, setImages] = useState<TaterImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState(8);
  const [queries, setQueries] = useState(category.searchQueries.join('\n'));
  const [savingQueries, setSavingQueries] = useState(false);
  const [queuing, setQueuing] = useState(false);

  const job = isActiveJob(category.activeJob) ? category.activeJob : null;

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taterMatchApi.listCategoryImages(category.id, status);
      setImages(data.results);
      setSelected(new Set());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [category.id, status]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  useEffect(() => {
    setQueries(category.searchQueries.join('\n'));
  }, [category.id, category.searchQueries]);

  // Reload the grid whenever the pipeline adds images to this category.
  const countsKey = `${category.counts.pending}-${category.counts.approved}-${category.counts.rejected}-${category.counts.discarded}`;
  useEffect(() => {
    void loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey]);

  const setImagesStatus = async (ids: string[], next: 'approved' | 'rejected' | 'pending') => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await taterMatchApi.setImagesStatus(ids, next);
      setImages((prev) => prev.filter((image) => !ids.includes(image.id)));
      setSelected(new Set());
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const refresh = async () => {
    setQueuing(true);
    setError(null);
    try {
      await taterMatchApi.refreshCategory(category.id, target);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setQueuing(false);
    }
  };

  const saveQueries = async () => {
    const list = queries
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);
    if (list.length === 0) {
      setError('Add at least one search query');
      return;
    }
    setSavingQueries(true);
    setError(null);
    try {
      await taterMatchApi.updateSearchQueries(category.id, list);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingQueries(false);
    }
  };

  const reviewableIds = images.filter((image) => image.status !== 'discarded').map((image) => image.id);
  const queriesDirty = queries.trim() !== category.searchQueries.join('\n').trim();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#E2E2E2] bg-white p-4">
        <div className="min-w-0">
          <div className="text-base font-semibold">{category.label}</div>
          <div className="text-xs text-muted-foreground">{category.description}</div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Badge
              className={cn(
                'border-transparent',
                category.counts.approved >= targetPoolSize
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800',
              )}
            >
              {category.counts.approved}/{targetPoolSize} approved
            </Badge>
            <Badge variant="outline">{category.counts.pending} pending</Badge>
            <Badge variant="outline">{category.counts.rejected} rejected</Badge>
            <Badge variant="outline">{category.counts.discarded} auto-removed</Badge>
            {category.usedByQuestions.length > 0 && (
              <Badge variant="secondary">Used by {category.usedByQuestions.length} questions</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Fetch
            <input
              type="number"
              min={1}
              max={30}
              value={target}
              onChange={(e) => setTarget(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className="h-8 w-14 rounded-md border border-[#E2E2E2] px-2 text-sm text-black"
            />
          </label>
          <Button onClick={refresh} disabled={queuing || !!job}>
            <RefreshCw className={cn('h-4 w-4', (queuing || job) && 'animate-spin')} />
            Refresh images
          </Button>
        </div>
        {job && (
          <div className="w-full">
            <JobProgress job={job} categoryId={category.id} />
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[#E2E2E2] bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">Search queries ({category.searchQueries.length})</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          One query per line. The fetcher searches these across all sources on the next refresh.
        </p>
        <textarea
          value={queries}
          onChange={(e) => setQueries(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-md border border-[#E2E2E2] p-2 font-mono text-xs"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={saveQueries} disabled={!queriesDirty || savingQueries}>
            {savingQueries ? 'Saving…' : 'Save queries'}
          </Button>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-md border border-[#E2E2E2] bg-white p-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                status === tab.id ? 'bg-black text-white' : 'text-muted-foreground hover:text-black',
              )}
            >
              {tab.label} ({category.counts[tab.id]})
            </button>
          ))}
        </div>
        {status !== 'discarded' && reviewableIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected((prev) => (prev.size === reviewableIds.length ? new Set() : new Set(reviewableIds)))
              }
            >
              {selected.size === reviewableIds.length ? 'Clear selection' : 'Select all'}
            </Button>
            {status !== 'approved' && (
              <Button
                variant="success"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setImagesStatus([...selected], 'approved')}
              >
                Approve {selected.size || ''}
              </Button>
            )}
            {status !== 'rejected' && (
              <Button
                variant="danger"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setImagesStatus([...selected], 'rejected')}
              >
                Reject {selected.size || ''}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {loading && images.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E2E2E2] py-10 text-center text-sm text-muted-foreground">
          No {STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()} images.
          {status === 'pending' && ' Click “Refresh images” to fetch new candidates.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((image) => (
            <ImageTile
              key={image.id}
              image={image}
              selected={selected.has(image.id)}
              onToggle={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(image.id)) next.delete(image.id);
                  else next.add(image.id);
                  return next;
                })
              }
              onSetStatus={(next) => setImagesStatus([image.id], next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: review photos                                              */
/* ------------------------------------------------------------------ */

/**
 * One category's waiting photos. Every photo starts as "keep"; tapping one marks it as reject.
 * One button then approves the kept ones and rejects the marked ones.
 */
function ReviewGroup({ group, onSaved }: { group: TaterReviewGroup; onSaved: () => Promise<void> }) {
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keepIds = group.images.filter((image) => !rejected.has(image.id)).map((image) => image.id);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (keepIds.length) await taterMatchApi.setImagesStatus(keepIds, 'approved');
      if (rejected.size) await taterMatchApi.setImagesStatus([...rejected], 'rejected');
      setRejected(new Set());
      await onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) =>
    setRejected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[#E2E2E2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{group.label}</h3>
            <Badge variant="outline">{group.images.length} waiting</Badge>
            <Badge
              className={cn(
                'border-transparent',
                group.approvedCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
              )}
            >
              {group.approvedCount} live
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Should show: {group.description}</p>
        </div>
        <Button variant="success" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve {keepIds.length}
          {rejected.size > 0 && ` · reject ${rejected.size}`}
        </Button>
      </div>
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {group.images.map((image) => {
          const isRejected = rejected.has(image.id);
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => toggle(image.id)}
              title={isRejected ? 'Will be rejected · tap to keep' : 'Will be approved · tap to reject'}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border-2 bg-[#F4F4F4]',
                isRejected ? 'border-red-500' : 'border-transparent hover:border-black',
              )}
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.title ?? group.label}
                  loading="lazy"
                  className={cn('h-full w-full object-cover', isRejected && 'opacity-30 grayscale')}
                />
              ) : (
                <ImageOff className="m-auto h-5 w-5 text-muted-foreground" />
              )}
              {isRejected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-red-600 p-1.5 text-white">
                    <X className="h-5 w-5" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ReviewStep({ onChanged }: { onChanged: () => void }) {
  const [groups, setGroups] = useState<TaterReviewGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await taterMatchApi.reviewQueue();
      setGroups(data.results);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!groups) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#E2E2E2] py-12 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        <div className="text-sm font-semibold">All photos reviewed</div>
        <div className="text-xs text-muted-foreground">Go to Questions to check them, then Publish.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Every photo below will be <b>approved</b>. Tap a photo that is wrong to mark it <b>rejected</b>, then press
        Approve for that group. Approved photos go live in the game after you Publish.
      </p>
      {groups.map((group) => (
        <ReviewGroup
          key={group.categoryId}
          group={group}
          onSaved={async () => {
            await load();
            onChanged();
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: publish                                                    */
/* ------------------------------------------------------------------ */

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function PublishStep({
  status,
  onChanged,
  onOpenReview,
}: {
  status: TaterPublishStatus | null;
  onChanged: () => Promise<void>;
  onOpenReview: () => void;
}) {
  const [busy, setBusy] = useState<'publish' | 'unpublish' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!status) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const run = async (action: 'publish' | 'unpublish') => {
    if (action === 'unpublish' && !window.confirm('Take Tater Match photos offline? Players go back to the built-in drawings.')) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      await (action === 'publish' ? taterMatchApi.publish() : taterMatchApi.unpublish());
      await onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const hasChanges = !status.published || status.newReadyCount > 0 || status.brokenCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 rounded-lg border p-5',
          status.published ? 'border-emerald-200 bg-emerald-50' : 'border-[#E2E2E2] bg-white',
        )}
      >
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            {status.published ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Live: {status.liveCount} questions
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" /> Not published
              </>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {status.published
              ? `Players get these questions with real photos. Published ${
                  status.publishedAt ? formatDate(status.publishedAt) : ''
                }.`
              : 'Players still see the built-in drawings. Publish to switch the game to real photos.'}
          </p>
          {status.published && status.newReadyCount > 0 && (
            <p className="mt-1 text-sm font-medium text-emerald-800">
              {status.newReadyCount} more ready question{status.newReadyCount === 1 ? '' : 's'} not live yet. Publish
              again to add {status.newReadyCount === 1 ? 'it' : 'them'}.
            </p>
          )}
          {status.brokenCount > 0 && (
            <p className="mt-1 text-sm font-medium text-amber-800">
              {status.brokenCount} published question{status.brokenCount === 1 ? ' is' : 's are'} hidden from players:
              an option has no approved photo any more.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {status.published && (
            <Button variant="outline" onClick={() => void run('unpublish')} disabled={!!busy}>
              {busy === 'unpublish' && <Loader2 className="h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          )}
          <Button
            variant="success"
            onClick={() => void run('publish')}
            disabled={!!busy || status.readyCount === 0 || (status.published && !hasChanges)}
            className="h-10 px-5 text-base"
          >
            {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {status.published
              ? hasChanges
                ? `Update live game (${status.readyCount})`
                : 'Up to date'
              : `Publish ${status.readyCount} questions`}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E2E2E2] bg-white p-3">
          <div className="text-xs text-muted-foreground">Ready to play</div>
          <div className="text-xl font-semibold text-emerald-700">{status.readyCount}</div>
          <div className="text-[11px] text-muted-foreground">every option has an approved photo</div>
        </div>
        <div className="rounded-lg border border-[#E2E2E2] bg-white p-3">
          <div className="text-xs text-muted-foreground">Need photos</div>
          <div className="text-xl font-semibold text-amber-700">{status.notReady.length}</div>
          <div className="text-[11px] text-muted-foreground">left out until their photos are approved</div>
        </div>
        <div className="rounded-lg border border-[#E2E2E2] bg-white p-3">
          <div className="text-xs text-muted-foreground">Questions in game</div>
          <div className="text-xl font-semibold">{status.totalActive}</div>
          <div className="text-[11px] text-muted-foreground">switched off ones are never shown</div>
        </div>
      </div>

      {status.notReady.length > 0 && (
        <div className="rounded-lg border border-[#E2E2E2] bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Not ready yet</div>
            <Button variant="outline" size="sm" onClick={onOpenReview}>
              Review photos
            </Button>
          </div>
          <ul className="flex flex-col divide-y divide-[#F0F0F0] text-sm">
            {status.notReady.map((question) => (
              <li key={question.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span>
                  <span className="mr-1.5 text-[11px] text-muted-foreground">{question.id}</span>
                  {question.prompt}
                </span>
                <span className="text-xs text-amber-800">
                  needs{' '}
                  {question.missing
                    .map((m) => `${m.label}${m.pending ? ` (${m.pending} waiting)` : ' (none found)'}`)
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Step = 'review' | 'questions' | 'publish' | 'tools';

export function TaterMatchView() {
  const [step, setStep] = useState<Step>('review');
  const [categories, setCategories] = useState<TaterCategory[]>([]);
  const [targetPoolSize, setTargetPoolSize] = useState(10);
  const [questions, setQuestions] = useState<TaterQuestion[]>([]);
  const [publishStatus, setPublishStatus] = useState<TaterPublishStatus | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<TaterJob[]>([]);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cats, qs, recentJobs, status] = await Promise.all([
        taterMatchApi.listCategories(),
        taterMatchApi.listQuestions(),
        taterMatchApi.listJobs(),
        taterMatchApi.publishStatus(),
      ]);
      setCategories(cats.results);
      setTargetPoolSize(cats.targetPoolSize);
      setQuestions(qs.results);
      setJobs(recentJobs.results);
      setPublishStatus(status);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const anyJobActive =
    categories.some((category) => isActiveJob(category.activeJob)) || jobs.some(isActiveJob);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), anyJobActive ? POLL_MS : IDLE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [anyJobActive, load]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const startAudit = async () => {
    setAuditing(true);
    try {
      await taterMatchApi.startAudit();
      setError(null);
      await load(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAuditing(false);
    }
  };

  const jobForQuestion = (question: TaterQuestion): TaterJob | null => {
    for (const option of question.options) {
      const job = categoryById.get(option.art)?.activeJob;
      if (isActiveJob(job)) return job!;
    }
    return null;
  };

  const visibleQuestions = questions.filter(
    (q) => (modeFilter === 'all' || q.mode === modeFilter) && (!onlyMissing || !q.ready),
  );

  const groupedCategories = useMemo(() => {
    const groups = new Map<string, TaterCategory[]>();
    for (const category of categories) {
      const list = groups.get(category.group) ?? [];
      list.push(category);
      groups.set(category.group, list);
    }
    const rank = (group: string) => (GROUP_ORDER.includes(group) ? GROUP_ORDER.indexOf(group) : GROUP_ORDER.length);
    return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
  }, [categories]);

  const selectedCategory =
    (selectedCategoryId && categoryById.get(selectedCategoryId)) || categories[0] || null;

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setStep('tools');
  };

  const pendingTotal = categories.reduce((sum, c) => sum + c.counts.pending, 0);
  const readyCount = questions.filter((q) => q.ready && q.isActive).length;

  const steps: Array<{ id: Step; label: string; hint: string; done: boolean }> = [
    {
      id: 'review',
      label: '1. Review photos',
      hint: pendingTotal ? `${pendingTotal} waiting` : 'All reviewed',
      done: pendingTotal === 0,
    },
    {
      id: 'questions',
      label: '2. Check questions',
      hint: `${readyCount} of ${questions.filter((q) => q.isActive).length} ready`,
      done: readyCount > 0,
    },
    {
      id: 'publish',
      label: '3. Publish',
      hint: publishStatus?.published ? `Live · ${publishStatus.liveCount} questions` : 'Not published',
      done: !!publishStatus?.published,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tater Match</h1>
          <p className="text-sm text-muted-foreground">
            Approve real photos, check the questions, then publish them to the game.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Reload
        </Button>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              'flex min-w-[10rem] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
              step === s.id ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white hover:bg-[#FAFAFA]',
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {s.done && <CheckCircle2 className={cn('h-4 w-4', step === s.id ? 'text-emerald-300' : 'text-emerald-600')} />}
              {s.label}
            </span>
            <span className={cn('text-xs', step === s.id ? 'text-white/70' : 'text-muted-foreground')}>{s.hint}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStep('tools')}
          className={cn(
            'flex flex-col items-start rounded-lg border px-3 py-2 text-left',
            step === 'tools' ? 'border-black bg-black text-white' : 'border-[#E2E2E2] bg-white hover:bg-[#FAFAFA]',
          )}
          title="Image pools per category, fetching new photos, search queries and the fetcher log"
        >
          <span className="text-sm font-semibold">Tools</span>
          <span className={cn('text-xs', step === 'tools' ? 'text-white/70' : 'text-muted-foreground')}>
            {anyJobActive ? 'Fetching…' : 'Photo pools'}
          </span>
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading && categories.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading Tater Match…
        </div>
      ) : step === 'review' ? (
        <ReviewStep onChanged={() => void load(true)} />
      ) : step === 'publish' ? (
        <PublishStep status={publishStatus} onChanged={() => load(true)} onOpenReview={() => setStep('review')} />
      ) : step === 'questions' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'variety', 'disease', 'growth'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setModeFilter(mode)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium',
                  modeFilter === mode
                    ? 'border-black bg-black text-white'
                    : 'border-[#E2E2E2] bg-white text-muted-foreground hover:text-black',
                )}
              >
                {mode === 'all' ? 'All modes' : MODE_LABELS[mode]}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
              Only questions that need photos
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tap an option to play the question like a player. Switch off any question you don't want in the game.
            Only <b>Ready</b> questions that are <b>In game</b> get published.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                busyJob={jobForQuestion(question)}
                onRefresh={async () => {
                  await taterMatchApi.refreshQuestion(question.id);
                  await load(true);
                }}
                onOpenCategory={openCategory}
                onToggleActive={async (isActive) => {
                  await taterMatchApi.setQuestionActive(question.id, isActive);
                  await load(true);
                }}
              />
            ))}
          </div>
          {visibleQuestions.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No questions match this filter.</div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Every photo pool, with fetching and search settings. You only need this when a category has too few
              photos.
            </p>
            <Button
              variant="outline"
              onClick={() => void startAudit()}
              disabled={auditing || anyJobActive || pendingTotal === 0}
              title="Run every waiting photo through the automatic quality check again"
            >
              <ShieldCheck className={cn('h-4 w-4', auditing && 'animate-pulse')} /> Re-check waiting photos
            </Button>
          </div>
          <LiveActivity jobs={jobs} categoryById={categoryById} />
          <div className="flex flex-col gap-4 lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-60">
              {groupedCategories.map(([group, list]) => (
                <div key={group}>
                  <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABELS[group] ?? group}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {list.map((category) => {
                      const active = selectedCategory?.id === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(category.id)}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                            active ? 'bg-[#E8E8E8] font-medium' : 'hover:bg-[#F4F4F4]',
                          )}
                        >
                          <span className="truncate">{category.label}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            {isActiveJob(category.activeJob) && <Loader2 className="h-3 w-3 animate-spin" />}
                            {category.counts.pending > 0 && (
                              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">
                                {category.counts.pending}
                              </span>
                            )}
                            <span
                              className={cn(
                                'text-[11px]',
                                category.counts.approved >= targetPoolSize ? 'text-emerald-700' : 'text-muted-foreground',
                              )}
                            >
                              {category.counts.approved}/{targetPoolSize}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>
            {selectedCategory && (
              <CategoryPanel
                key={selectedCategory.id}
                category={selectedCategory}
                targetPoolSize={targetPoolSize}
                onChanged={() => void load(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
