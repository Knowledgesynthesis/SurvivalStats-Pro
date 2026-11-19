import { useEffect, type ReactNode } from 'react'

export function PageHeader({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — SurvivalStats Pro`
  }, [title])
  return (
    <header className="mb-8 fade-up">
      {kicker && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">{kicker}</div>}
      <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-[1.05rem] leading-relaxed text-ink-2">{children}</div>}
    </header>
  )
}
