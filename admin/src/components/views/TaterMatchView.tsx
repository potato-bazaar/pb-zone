import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  ImageOff,
  Images,
  ListChecks,
  Loader2,
  RefreshCw,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Button,
  EmptyState,
  IconTile,
  PageHeader,
  Panel,
  Pill,
  Switch,
  Tabs,
  inputClass,
  insetClass,
  panelClass,
  softClass,
  textareaClass,
  type Tone,
} from '../ui/pb';
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

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#64748B]">
      <Loader2 className="h-4 w-4 animate-spin text-[#16A34A]" /> {label}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#FDE8EC] px-3.5 py-2.5 text-sm text-[#BE123C]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function ProgressBar({ value, max, failed }: { value: number; max: number; failed?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF3EF]" role="progressbar" aria-valuenow={pct}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', failed ? 'bg-[#F43F5E]' : 'bg-[#22C55E]')}
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
    <div className={cn(insetClass, 'flex flex-col gap-2 px-3 py-2.5 text-xs')}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#16A34A]" />
        <span className="font-semibold text-[#0F172A]">{job.status === 'queued' ? 'Queued' : activity}</span>
        <span className="tabular-nums text-[#5F6F83]">{numbers.summary}</span>
      </div>
      <ProgressBar value={numbers.value} max={numbers.max} />
      {latest && (
        <div className={cn('truncate', latest.level === 'error' ? 'text-[#BE123C]' : 'text-[#64748B]')}>
          {latest.message}
        </div>
      )}
      {entry?.note && <div className="truncate text-[#B45309]">({entry.note})</div>}
    </div>
  );
}

const EVENT_STYLES: Record<TaterJobEvent['level'], string> = {
  info: 'text-[#334155]',
  warn: 'text-[#B45309]',
  error: 'text-[#BE123C] font-medium',
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
    <Panel
      icon={Activity}
      title="Image fetcher activity"
      actions={
        active.length > 0 ? (
          <Pill tone="amber">
            <Loader2 className="h-3 w-3 animate-spin" /> Running
          </Pill>
        ) : (
          <Pill tone="gray" dot>
            Idle
          </Pill>
        )
      }
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex flex-wrap gap-1.5">
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
                'flex h-7 max-w-[14rem] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
                job.id === shown.id
                  ? 'bg-[#E3F7E7] text-[#14532D] ring-1 ring-[#86D19A]'
                  : 'bg-white text-[#475569] ring-1 ring-[#E2E8E4] hover:bg-[#F6F9F7] hover:text-[#0F172A]',
              )}
            >
              {isActiveJob(job) && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
              {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />}
              {failed && <XCircle className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />}
              <span className="truncate">{jobLabel(job, categoryById)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
          <span className="font-semibold text-[#0F172A]">{jobLabel(shown, categoryById)}</span>
          <span className="tabular-nums text-[#5F6F83]">
            {numbers.summary} · {running ? (shown.status === 'queued' ? 'queued' : 'running') : shown.status}
          </span>
        </div>
        <ProgressBar value={numbers.value} max={numbers.max} failed={shown.status === 'failed'} />
        {shown.error && <ErrorNote>Job failed: {shown.error}</ErrorNote>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#334155]">Activity log (newest first)</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-[#334155]">
            <input
              type="checkbox"
              checked={problemsOnly}
              onChange={(e) => setProblemsOnly(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-[#16A34A]"
            />
            <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" /> Problems only ({problemCount})
          </label>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-xl bg-[#F6F9F7] p-3 font-mono text-[11px] leading-5">
          {events.length === 0 ? (
            <div className="text-[#64748B]">
              {problemsOnly ? 'No problems in this job.' : 'No activity recorded for this job.'}
            </div>
          ) : (
            events.map((event, index) => (
              <div key={`${event.at}-${index}`} className={cn('flex gap-2', EVENT_STYLES[event.level])}>
                <span className="shrink-0 text-[#94A3B8]">{formatTime(event.at)}</span>
                {event.categoryId && shown.categoryIds.length > 1 && (
                  <span className="shrink-0 text-[#94A3B8]">[{event.categoryId}]</span>
                )}
                <span className="min-w-0 break-words">{event.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
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
        'flex flex-col gap-4 rounded-2xl p-4',
        question.isActive ? 'bg-white shadow-card' : 'border border-dashed border-[#CBD5D0] bg-white/70 opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone="gray">{MODE_LABELS[question.mode]}</Pill>
            {question.ready ? (
              <Pill tone="green" dot>
                Ready
              </Pill>
            ) : (
              <Pill tone="amber" dot>
                Needs photos: {question.options.filter((o) => o.approvedCount === 0).length}
              </Pill>
            )}
            <span className="text-[11px] text-[#94A3B8]">{question.id}</span>
          </div>
          <div className="text-[15px] font-semibold leading-snug text-[#0B1220]">{question.prompt}</div>
          {question.hint && <div className="mt-0.5 text-xs text-[#64748B]">{question.hint}</div>}
        </div>
        <label
          className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-[#334155]"
          title="Off = never shown to players, even after publishing"
        >
          In game
          <Switch checked={question.isActive} disabled={toggling} onChange={() => void handleToggle()} />
        </label>
      </div>
      {!question.ready && question.isActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFF8EB] px-3 py-2 text-xs text-[#92400E]">
          <span className="min-w-0">
            Approve a photo for:{' '}
            {question.options
              .filter((o) => o.approvedCount === 0)
              .map((o) => o.categoryLabel)
              .join(', ')}
          </span>
          <Button
            variant="outline"
            size="xs"
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
      {error && <div className="text-xs text-[#BE123C]">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option) => {
          const isCorrect = option.id === question.correctOptionId;
          const revealed = picked !== null;
          const shown = option.previewImage ?? option.pendingPreviewImage;
          const isPendingPreview = !option.previewImage && !!option.pendingPreviewImage;
          return (
            <div key={option.id} className="flex min-w-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setPicked(option.id)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl bg-[#F1F5F3] transition',
                  !revealed && 'ring-1 ring-[#E6ECE8] hover:ring-2 hover:ring-[#16A34A]',
                  revealed && isCorrect && 'ring-2 ring-[#22C55E]',
                  revealed && !isCorrect && picked === option.id && 'ring-2 ring-[#F43F5E]',
                  revealed && !isCorrect && picked !== option.id && 'opacity-60 ring-1 ring-[#E6ECE8]',
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
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-[#64748B]">
                    <ImageOff className="h-5 w-5 text-[#94A3B8]" />
                    No images yet — click Refresh
                  </div>
                )}
                {isPendingPreview && (
                  <Pill tone="amber" className="absolute bottom-1.5 left-1.5 shadow-sm">
                    Pending review
                  </Pill>
                )}
                <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-lg bg-white/90 px-1.5 text-xs font-bold uppercase text-[#0B1220] shadow-sm">
                  {option.id}
                </span>
                {revealed && isCorrect && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#16A34A] p-1 text-white shadow-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenCategory(option.art)}
                className="group flex min-w-0 flex-col items-start text-left"
                title="Open this image pool"
              >
                <span className="w-full truncate text-xs font-medium text-[#334155] transition-colors group-hover:text-[#14532D]">
                  {option.label || option.categoryLabel}
                </span>
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    option.approvedCount === 0 ? 'font-semibold text-[#B45309]' : 'text-[#64748B]',
                  )}
                >
                  {option.approvedCount} approved
                  {option.pendingCount > 0 && ` · ${option.pendingCount} pending`}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {picked && (
        <div className={cn(softClass, 'flex items-start justify-between gap-2 p-3 text-xs leading-relaxed text-[#334155]')}>
          <div>
            <span
              className={cn(
                'font-semibold',
                picked === question.correctOptionId ? 'text-[#15803D]' : 'text-[#BE123C]',
              )}
            >
              {picked === question.correctOptionId ? 'Correct! ' : 'Not quite. '}
            </span>
            {question.learn}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setPicked(null)} title="Reset demo">
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

function StoredUrl({ url, storageKey }: { url: string; storageKey: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy image URL', url);
    }
  };
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[#F6F9F7] px-2 py-1" title={url}>
      <span className="shrink-0 font-semibold text-[#64748B]">{url.includes('.s3.') ? 'S3' : 'URL'}</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate font-mono text-[#334155] hover:text-[#14532D] hover:underline"
      >
        {storageKey ?? url}
      </a>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-[#94A3B8] transition-colors hover:text-[#0F172A]"
        title="Copy image URL"
      >
        {copied ? <Check className="h-3 w-3 text-[#16A34A]" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

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
        'flex flex-col overflow-hidden rounded-xl bg-white transition-shadow',
        selected ? 'ring-2 ring-[#16A34A]' : 'ring-1 ring-[#E6ECE8] hover:shadow-card',
      )}
    >
      <button
        type="button"
        className="relative aspect-square bg-[#F1F5F3]"
        onClick={reviewable ? onToggle : undefined}
        disabled={!reviewable}
      >
        {image.url ? (
          <img src={image.url} alt={image.title ?? ''} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[11px] text-[#64748B]">
            <ImageOff className="h-5 w-5 text-[#94A3B8]" />
            Not stored
          </div>
        )}
        {image.aiScore !== null && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-[#0B1220]/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
            AI {Math.round(Number(image.aiScore) * 100)}%
          </span>
        )}
        {reviewable && (
          <span
            className={cn(
              'absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-[6px] border-2 shadow-sm',
              selected ? 'border-[#16A34A] bg-[#16A34A] text-white' : 'border-white bg-white/80',
            )}
          >
            {selected && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 text-[11px] text-[#64748B]">
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold capitalize text-[#0F172A]">{image.source}</span>
          <a
            href={image.sourcePageUrl || image.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#94A3B8] transition-colors hover:text-[#0F172A]"
            title="Open source page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {image.url && <StoredUrl url={image.url} storageKey={image.storageKey} />}
        {(image.author || image.license) && (
          <div className="truncate" title={[image.author, image.license].filter(Boolean).join(' · ')}>
            {[image.author, image.license].filter(Boolean).join(' · ')}
          </div>
        )}
        {image.aiReason && (
          <div className="line-clamp-2" title={image.aiReason}>
            {image.aiReason}
          </div>
        )}
        {reviewable && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {image.status !== 'approved' && (
              <Button size="xs" className="flex-1" onClick={() => onSetStatus('approved')}>
                <Check className="h-3 w-3" /> Approve
              </Button>
            )}
            {image.status !== 'rejected' && (
              <Button variant="outline" size="xs" className="flex-1" onClick={() => onSetStatus('rejected')}>
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
      <Panel
        icon={Images}
        title={category.label}
        description={category.description}
        actions={
          <>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#334155]">
              Fetch
              <span className="block w-[72px]">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={target}
                  onChange={(e) => setTarget(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                  className={inputClass}
                />
              </span>
            </label>
            <Button onClick={refresh} disabled={queuing || !!job}>
              <RefreshCw className={cn('h-4 w-4', (queuing || job) && 'animate-spin')} />
              Refresh images
            </Button>
          </>
        }
        bodyClassName="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={category.counts.approved >= targetPoolSize ? 'green' : 'amber'} dot>
            {category.counts.approved}/{targetPoolSize} approved
          </Pill>
          <Pill tone="gray">{category.counts.pending} pending</Pill>
          <Pill tone="gray">{category.counts.rejected} rejected</Pill>
          <Pill tone="gray">{category.counts.discarded} auto-removed</Pill>
          {category.usedByQuestions.length > 0 && (
            <Pill tone="blue">Used by {category.usedByQuestions.length} questions</Pill>
          )}
        </div>
        {job && <JobProgress job={job} categoryId={category.id} />}
      </Panel>

      <details className={cn(panelClass, 'group p-4 sm:p-5')}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#0B1220] [&::-webkit-details-marker]:hidden">
          Search queries ({category.searchQueries.length})
          <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B] transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-3 text-xs text-[#64748B]">
          One query per line. The fetcher searches these across all sources on the next refresh.
        </p>
        <textarea
          value={queries}
          onChange={(e) => setQueries(e.target.value)}
          rows={4}
          className={cn(textareaClass, 'mt-2 font-mono')}
        />
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={saveQueries} disabled={!queriesDirty || savingQueries}>
            {savingQueries ? 'Saving…' : 'Save queries'}
          </Button>
        </div>
      </details>

      <section className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            items={STATUS_TABS.map((tab) => ({
              id: tab.id,
              label: tab.label,
              badge: (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    status === tab.id ? 'bg-[#E3F8E8] text-[#14532D]' : 'bg-white/70 text-[#64748B]',
                  )}
                >
                  {category.counts[tab.id]}
                </span>
              ),
            }))}
            value={status}
            onChange={setStatus}
          />
          {status !== 'discarded' && reviewableIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
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

        {error && <ErrorNote>{error}</ErrorNote>}

        {loading && images.length === 0 ? (
          <Loading label="Loading images…" />
        ) : images.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            tone="gray"
            title={`No ${STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()} images`}
            description={status === 'pending' ? 'Click “Refresh images” to fetch new candidates.' : undefined}
            className={softClass}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
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
      </section>
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
    <section className={cn(panelClass, 'flex flex-col gap-4 p-4 sm:p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#0B1220]">{group.label}</h3>
            <Pill tone="gray">{group.images.length} waiting</Pill>
            <Pill tone={group.approvedCount > 0 ? 'green' : 'amber'} dot>
              {group.approvedCount} live
            </Pill>
          </div>
          <p className="mt-1 text-sm text-[#5F6F83]">Should show: {group.description}</p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve {keepIds.length}
          {rejected.size > 0 && ` · reject ${rejected.size}`}
        </Button>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {group.images.map((image) => {
          const isRejected = rejected.has(image.id);
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => toggle(image.id)}
              title={isRejected ? 'Will be rejected · tap to keep' : 'Will be approved · tap to reject'}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl bg-[#F1F5F3] transition',
                isRejected ? 'ring-2 ring-[#F43F5E]' : 'ring-1 ring-[#E6ECE8] hover:ring-2 hover:ring-[#16A34A]',
              )}
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.title ?? group.label}
                  loading="lazy"
                  className={cn('h-full w-full object-cover transition', isRejected && 'opacity-30 grayscale')}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                  <ImageOff className="h-5 w-5" />
                </span>
              )}
              {isRejected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-[#E11D48] p-1.5 text-white shadow-md">
                    <X className="h-5 w-5" strokeWidth={2.5} />
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

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!groups) {
    return (
      <div className={panelClass}>
        <Loading label="Loading photos…" />
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={CheckCircle2}
          title="All photos reviewed"
          description="Go to Questions to check them, then Publish."
        />
      </Panel>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#5F6F83]">
        Every photo below will be <b className="font-semibold text-[#14532D]">approved</b>. Tap a photo that is wrong to
        mark it <b className="font-semibold text-[#BE123C]">rejected</b>, then press Approve for that group. Approved
        photos go live in the game after you Publish.
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

function PublishStat({
  icon,
  tone,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className={cn(panelClass, 'flex items-start gap-3.5 p-4')}>
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#1F2937]">{label}</p>
        <p className="text-[22px] font-extrabold leading-tight tabular-nums text-[#0B1220]">{value}</p>
        <p className="mt-0.5 text-xs text-[#64748B]">{note}</p>
      </div>
    </div>
  );
}

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
      <div className={panelClass}>
        <Loading label="Loading…" />
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
      <section
        className={cn(
          'flex flex-col gap-5 rounded-2xl p-5 shadow-card md:flex-row md:items-center md:justify-between sm:p-6',
          status.published ? 'bg-gradient-to-br from-[#E6F7EB] via-white to-white ring-1 ring-[#CDEBD6]' : 'bg-white',
        )}
      >
        <div className="flex min-w-0 items-start gap-4">
          <IconTile icon={status.published ? CheckCircle2 : XCircle} tone={status.published ? 'green' : 'gray'} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-[#0B1220]">
              {status.published ? <>Live: {status.liveCount} questions</> : 'Not published'}
            </h2>
            <p className="mt-1 text-sm text-[#5F6F83]">
              {status.published
                ? `Players get these questions with real photos. Published ${
                    status.publishedAt ? formatDate(status.publishedAt) : ''
                  }.`
                : 'Players still see the built-in drawings. Publish to switch the game to real photos.'}
            </p>
            {status.published && status.newReadyCount > 0 && (
              <p className="mt-1.5 text-sm font-medium text-[#15803D]">
                {status.newReadyCount} more ready question{status.newReadyCount === 1 ? '' : 's'} not live yet. Publish
                again to add {status.newReadyCount === 1 ? 'it' : 'them'}.
              </p>
            )}
            {status.brokenCount > 0 && (
              <p className="mt-1.5 text-sm font-medium text-[#B45309]">
                {status.brokenCount} published question{status.brokenCount === 1 ? ' is' : 's are'} hidden from players:
                an option has no approved photo any more.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:shrink-0">
          {status.published && (
            <Button variant="outline" size="lg" onClick={() => void run('unpublish')} disabled={!!busy}>
              {busy === 'unpublish' && <Loader2 className="h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => void run('publish')}
            disabled={!!busy || status.readyCount === 0 || (status.published && !hasChanges)}
          >
            {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {status.published
              ? hasChanges
                ? `Update live game (${status.readyCount})`
                : 'Up to date'
              : `Publish ${status.readyCount} questions`}
          </Button>
        </div>
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PublishStat
          icon={CheckCircle2}
          tone="green"
          label="Ready to play"
          value={status.readyCount}
          note="every option has an approved photo"
        />
        <PublishStat
          icon={ImageOff}
          tone="amber"
          label="Need photos"
          value={status.notReady.length}
          note="left out until their photos are approved"
        />
        <PublishStat
          icon={ListChecks}
          tone="blue"
          label="Questions in game"
          value={status.totalActive}
          note="switched off ones are never shown"
        />
      </div>

      {status.notReady.length > 0 && (
        <Panel
          icon={AlertTriangle}
          tone="amber"
          title="Not ready yet"
          actions={
            <Button variant="outline" size="sm" onClick={onOpenReview}>
              Review photos
            </Button>
          }
        >
          <ul className="flex flex-col divide-y divide-[#EEF2F6] text-sm">
            {status.notReady.map((question) => (
              <li
                key={question.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 text-[#0F172A]">
                  <span className="mr-1.5 text-[11px] text-[#94A3B8]">{question.id}</span>
                  {question.prompt}
                </span>
                <span className="text-xs text-[#B45309]">
                  needs{' '}
                  {question.missing
                    .map((m) => `${m.label}${m.pending ? ` (${m.pending} waiting)` : ' (none found)'}`)
                    .join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Step = 'review' | 'questions' | 'publish' | 'tools';

const STEP_ICONS: Record<Step, LucideIcon> = {
  review: Images,
  questions: ListChecks,
  publish: Rocket,
  tools: Wrench,
};

function StepCard({
  active,
  done,
  icon,
  label,
  hint,
  title,
  onClick,
}: {
  active: boolean;
  done?: boolean;
  icon: LucideIcon;
  label: string;
  hint: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left shadow-card ring-inset transition-colors sm:p-4',
        active ? 'bg-[#F0FAF3] ring-2 ring-[#16A34A]' : 'bg-white ring-1 ring-transparent hover:ring-[#CFE7D6]',
      )}
    >
      <IconTile icon={icon} tone={active ? 'green' : 'gray'} className="hidden sm:flex" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0B1220]">
          {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />}
          {label}
        </span>
        <span className={cn('mt-0.5 block text-xs', active ? 'text-[#15803D]' : 'text-[#64748B]')}>{hint}</span>
      </span>
    </button>
  );
}

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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tater Match"
        description="Approve real photos, check the questions, then publish them to the game."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Reload
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {steps.map((s) => (
          <StepCard
            key={s.id}
            active={step === s.id}
            done={s.done}
            icon={STEP_ICONS[s.id]}
            label={s.label}
            hint={s.hint}
            onClick={() => setStep(s.id)}
          />
        ))}
        <StepCard
          active={step === 'tools'}
          icon={STEP_ICONS.tools}
          label="Tools"
          hint={anyJobActive ? 'Fetching…' : 'Photo pools'}
          title="Image pools per category, fetching new photos, search queries and the fetcher log"
          onClick={() => setStep('tools')}
        />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading && categories.length === 0 ? (
        <div className={panelClass}>
          <Loading label="Loading Tater Match…" />
        </div>
      ) : step === 'review' ? (
        <ReviewStep onChanged={() => void load(true)} />
      ) : step === 'publish' ? (
        <PublishStep status={publishStatus} onChanged={() => load(true)} onOpenReview={() => setStep('review')} />
      ) : step === 'questions' ? (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Tabs<ModeFilter>
                items={(['all', 'variety', 'disease', 'growth'] as const).map((mode) => ({
                  id: mode,
                  label: mode === 'all' ? 'All modes' : MODE_LABELS[mode],
                }))}
                value={modeFilter}
                onChange={setModeFilter}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#334155]">
                <input
                  type="checkbox"
                  checked={onlyMissing}
                  onChange={(e) => setOnlyMissing(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[#16A34A]"
                />
                Only questions that need photos
              </label>
            </div>
            <p className="text-sm text-[#5F6F83]">
              Tap an option to play the question like a player. Switch off any question you don't want in the game.
              Only <b className="font-semibold text-[#0F172A]">Ready</b> questions that are{' '}
              <b className="font-semibold text-[#0F172A]">In game</b> get published.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4">
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
            <div className={cn(panelClass, 'py-12 text-center text-sm text-[#64748B]')}>
              No questions match this filter.
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-3xl text-sm text-[#5F6F83]">
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <aside
              className={cn(
                panelClass,
                'flex max-h-80 w-full shrink-0 flex-col gap-4 overflow-y-auto p-3 lg:max-h-none lg:w-60 xl:w-64 2xl:w-72',
              )}
            >
              {groupedCategories.map(([group, list]) => (
                <div key={group}>
                  <div className="mb-1.5 px-2.5 text-xs font-semibold text-[#64748B]">{GROUP_LABELS[group] ?? group}</div>
                  <div className="flex flex-col gap-0.5">
                    {list.map((category) => {
                      const active = selectedCategory?.id === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(category.id)}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
                            active
                              ? 'bg-[#E3F7E7] text-[#14532D]'
                              : 'text-[#334155] hover:bg-[#F6F9F7] hover:text-[#0F172A]',
                          )}
                        >
                          <span className="truncate">{category.label}</span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {isActiveJob(category.activeJob) && (
                              <Loader2 className="h-3 w-3 animate-spin text-[#16A34A]" />
                            )}
                            {category.counts.pending > 0 && (
                              <span className="rounded-full bg-[#FFF3D6] px-1.5 text-[10px] font-semibold tabular-nums text-[#92400E]">
                                {category.counts.pending}
                              </span>
                            )}
                            <span
                              className={cn(
                                'text-[11px] tabular-nums',
                                category.counts.approved >= targetPoolSize ? 'text-[#15803D]' : 'text-[#94A3B8]',
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
