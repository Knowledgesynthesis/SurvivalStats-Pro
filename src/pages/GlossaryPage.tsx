import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Rich } from '@/components/learn/blocks'
import { GLOSSARY } from '@/content/glossary'
import { MODULES, moduleById } from '@/content/curriculum'
import { cn } from '@/lib/utils'

export default function GlossaryPage() {
  const [q, setQ] = useState('')
  const [mod, setMod] = useState<string>('all')
  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    return GLOSSARY.filter((t) => (mod === 'all' || t.module === mod) && (!s || t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s) || t.aka?.some((a) => a.toLowerCase().includes(s)))).sort((a, b) => a.term.localeCompare(b.term))
  }, [q, mod])
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-24 pt-8 sm:px-6">
      <PageHeader kicker="Reference" title="Glossary">
        {GLOSSARY.length} terms, each defined precisely and linked to the module that teaches it.
      </PageHeader>
      <div className="sticky top-14 z-10 -mx-2 mb-6 bg-page/90 px-2 py-3 backdrop-blur">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms, synonyms or definitions…"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
            aria-label="Search glossary"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[{ id: 'all', short: 'All' }, ...MODULES].map((m) => (
            <button key={m.id} type="button" onClick={() => setMod(m.id)} className={cn('rounded-full border px-2.5 py-0.5 text-xs', mod === m.id ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-2 hover:text-ink')}>
              {m.short}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-ink-2">No terms match “{q}”.</p>
      ) : (
        <dl className="space-y-3">
          {items.map((t) => {
            const m = moduleById(t.module)
            return (
              <div key={t.term} id={t.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="rounded-xl border border-line bg-surface px-4 py-3">
                <dt className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink">{t.term}</span>
                  {m && (
                    <Link to={`/learn/${m.id}`} className="text-xs text-accent-ink hover:underline">
                      Module {m.n}: {m.short}
                    </Link>
                  )}
                </dt>
                <dd className="mt-1 text-[0.95rem] leading-relaxed text-ink">
                  <Rich text={t.def} />
                  {t.aka && <div className="mt-1 text-xs text-muted">Also: {t.aka.join(', ')}</div>}
                </dd>
              </div>
            )
          })}
        </dl>
      )}
    </div>
  )
}
