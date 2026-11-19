import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Copy, FlaskConical, Lightbulb, ListChecks, Target, XCircle, Ban, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { M } from './Math'
import { useProgress } from '@/store/progress'
import { REFERENCES, type RefKey } from '@/content/references'
import { shuffleQ } from './shuffle'

/** Renders a string with $inline math$ segments. */
export function Rich({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <span className={className}>
      {parts.map((p, i) => (p.startsWith('$') && p.endsWith('$') && p.length > 2 ? <M key={i}>{p.slice(1, -1)}</M> : <span key={i}>{p}</span>))}
    </span>
  )
}

export function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section id={id} data-section={title} className="scroll-mt-24 border-t border-line pt-10 first:border-t-0 first:pt-0">
      {kicker && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">{kicker}</div>}
      <h2 className="mb-4 text-[1.55rem] font-semibold leading-tight tracking-tight text-ink">
        <a href={`#${id}`} className="hover:underline decoration-line underline-offset-4">
          {title}
        </a>
      </h2>
      <div className="lesson">{children}</div>
    </section>
  )
}

type CalloutKind = 'key' | 'warn' | 'myth' | 'tip' | 'practice'
const calloutMeta: Record<CalloutKind, { icon: ReactNode; title: string; cls: string }> = {
  key: { icon: <Target size={16} />, title: 'Key idea', cls: 'border-accent/35 bg-accent/[0.06]' },
  warn: { icon: <AlertTriangle size={16} />, title: 'Pitfall', cls: 'border-warn/45 bg-warn/[0.07]' },
  myth: { icon: <Ban size={16} />, title: 'Common misreading', cls: 'border-bad/35 bg-bad/[0.05]' },
  tip: { icon: <Lightbulb size={16} />, title: 'Intuition', cls: 'border-line bg-surface-2/70' },
  practice: { icon: <Wrench size={16} />, title: 'In practice', cls: 'border-good/35 bg-good/[0.05]' },
}

export function Callout({ kind = 'key', title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const m = calloutMeta[kind]
  return (
    <aside className={cn('not-lesson my-5 rounded-xl border px-4 py-3', m.cls)}>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-ink-2">{m.icon}</span>
        {title ?? m.title}
      </div>
      <div className="text-[0.95rem] leading-relaxed text-ink [&>p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li+li]:mt-1">{children}</div>
    </aside>
  )
}

/** "Wrong reading → correct reading" pair. */
export function MythFact({ myth, fact }: { myth: ReactNode; fact: ReactNode }) {
  return (
    <div className="my-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-bad/30 bg-bad/[0.04] px-3 py-2 text-sm">
        <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-bad-ink">
          <XCircle size={13} /> Not this
        </div>
        {myth}
      </div>
      <div className="rounded-lg border border-good/30 bg-good/[0.05] px-3 py-2 text-sm">
        <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-good-ink">
          <CheckCircle2 size={13} /> This
        </div>
        {fact}
      </div>
    </div>
  )
}

export function Lab({ title, goal, controls, children, footer }: { title: string; goal: ReactNode; controls?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="not-lesson my-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent-ink">
          <FlaskConical size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[0.95rem] font-semibold text-ink">{title}</div>
          <div className="text-sm leading-snug text-ink-2">{goal}</div>
        </div>
      </div>
      {controls && <div className="grid gap-x-6 gap-y-4 border-b border-line bg-surface-2/40 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">{controls}</div>}
      <div className="px-3 py-4 sm:px-5">{children}</div>
      {footer && <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div>}
    </div>
  )
}

/** Predict-then-check prompts for a lab. */
export function TryThis({ items }: { items: { do: ReactNode; see: ReactNode }[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <ListChecks size={15} className="text-accent-ink" /> Try this — predict first, then check
      </div>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className="flex w-full items-start gap-2 text-left text-ink" aria-expanded={!!open[i]}>
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-ink-2 tabular">{i + 1}</span>
              <span className="flex-1">{it.do}</span>
              <ChevronDown size={15} className={cn('mt-0.5 shrink-0 text-muted transition-transform', open[i] && 'rotate-180')} />
            </button>
            {open[i] && <div className="ml-7 mt-1 rounded-lg bg-surface px-3 py-2 text-ink-2 fade-up">{it.see}</div>}
          </li>
        ))}
      </ol>
    </div>
  )
}

export interface QuizQ {
  id: string
  stem: string
  options: string[]
  answer: number
  why: string
}

/** Inline check-your-understanding question with immediate feedback. */
export function Quiz({ q: raw }: { q: QuizQ }) {
  const q = useMemo(() => shuffleQ(raw), [raw])
  const saved = useProgress((s) => s.answers[q.id])
  const answer = useProgress((s) => s.answer)
  const [choice, setChoice] = useState<number | null>(saved?.choice ?? null)
  const done = choice !== null
  return (
    <div className="not-lesson my-6 rounded-xl border border-line bg-surface px-4 py-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Check your understanding</div>
      <div className="mb-3 font-medium text-ink">
        <Rich text={q.stem} />
      </div>
      <div className="space-y-2">
        {q.options.map((o, i) => {
          const isRight = i === q.answer
          const picked = choice === i
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => {
                setChoice(i)
                answer(q.id, i, i === q.answer)
              }}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                !done && 'border-line hover:border-accent/50 hover:bg-accent/[0.04]',
                done && isRight && 'border-good/50 bg-good/[0.07]',
                done && picked && !isRight && 'border-bad/50 bg-bad/[0.06]',
                done && !picked && !isRight && 'border-line opacity-70',
              )}
            >
              <span className={cn('mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]', done && isRight ? 'border-good bg-good text-white' : done && picked ? 'border-bad bg-bad text-white' : 'border-line text-ink-2')}>
                {done && isRight ? <Check size={12} /> : done && picked ? <XCircle size={12} /> : String.fromCharCode(65 + i)}
              </span>
              <Rich text={o} className="text-ink" />
            </button>
          )
        })}
      </div>
      {done && (
        <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink fade-up">
          <span className={cn('font-semibold', choice === q.answer ? 'text-good-ink' : 'text-bad-ink')}>{choice === q.answer ? 'Correct. ' : 'Not quite. '}</span>
          <Rich text={q.why} />
        </div>
      )}
    </div>
  )
}

export function CodeTabs({ r, python, note }: { r?: string; python?: string; note?: ReactNode }) {
  const tabs = [r && { id: 'R', code: r }, python && { id: 'Python', code: python }].filter(Boolean) as { id: string; code: string }[]
  const [tab, setTab] = useState(tabs[0]?.id)
  const [copied, setCopied] = useState(false)
  const code = tabs.find((t) => t.id === tab)?.code ?? ''
  return (
    <div className="not-lesson my-5 overflow-hidden rounded-xl border border-line bg-surface-2/60">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn('rounded-md px-2.5 py-1 text-xs font-medium', tab === t.id ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-2 hover:text-ink')}>
            {t.id}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-ink"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[0.82rem] leading-relaxed text-ink">
        <code className="font-mono">{code.trim()}</code>
      </pre>
      {note && <div className="border-t border-line px-4 py-2 text-xs text-ink-2">{note}</div>}
    </div>
  )
}

export function Takeaways({ items }: { items: ReactNode[] }) {
  return (
    <div className="not-lesson my-6 rounded-2xl border border-accent/30 bg-accent/[0.05] px-5 py-4">
      <div className="mb-2 text-sm font-semibold text-ink">Take-home points</div>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-[0.95rem] leading-relaxed text-ink">
            <CheckCircle2 size={16} className="mt-1 shrink-0 text-accent-ink" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Cite({ k }: { k: RefKey }) {
  const r = REFERENCES[k]
  return (
    <a href={`#ref-${k}`} className="!no-underline text-[0.8em] align-super text-accent-ink" title={`${r.authors} (${r.year}). ${r.title}`}>
      [{r.short}]
    </a>
  )
}

export function RefList({ keys }: { keys: RefKey[] }) {
  return (
    <ol className="not-lesson space-y-2 text-sm">
      {keys.map((k) => {
        const r = REFERENCES[k]
        const href = r.doi ? `https://doi.org/${r.doi}` : r.url
        return (
          <li key={k} id={`ref-${k}`} className="scroll-mt-24 leading-snug text-ink-2">
            <span className="text-ink">{r.authors}</span> ({r.year}). {r.title}. <em>{r.venue}</em>.{' '}
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">
                {r.doi ? `doi:${r.doi}` : 'link'}
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="not-lesson my-6">
      <div className="rounded-xl border border-line bg-surface px-3 py-3">{children}</div>
      {caption && <figcaption className="mt-2 text-sm leading-snug text-ink-2">{caption}</figcaption>}
    </figure>
  )
}

export function Table({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn('not-lesson my-4 overflow-x-auto rounded-xl border border-line', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-2">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-ink-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-grid align-top">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
