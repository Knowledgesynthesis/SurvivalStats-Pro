import { useLayoutEffect, useRef, useState } from 'react'
import { scaleLog } from 'd3-scale'

export interface ForestRow {
  label: string
  est: number
  lo: number
  hi: number
  truth?: number
}

/** Hazard-ratio forest plot on a log axis, with optional true values. */
export function Forest({ rows, xLabel = 'Hazard ratio (log scale)', domain }: { rows: ForestRow[]; xLabel?: string; domain?: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width))
    ro.observe(ref.current)
    setW(ref.current.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  const left = Math.min(150, w * 0.36)
  const m = { l: left, r: 16, t: 6, b: 36 }
  const rowH = 30
  const ih = rows.length * rowH
  const vals = rows.flatMap((r) => [r.lo, r.hi, r.truth ?? r.est]).filter((v) => Number.isFinite(v) && v > 0)
  const lo = domain?.[0] ?? Math.max(0.05, Math.min(0.5, ...vals) * 0.85)
  const hi = domain?.[1] ?? Math.min(20, Math.max(2, ...vals) * 1.15)
  const x = scaleLog().domain([lo, hi]).range([0, Math.max(80, w - m.l - m.r)]).clamp(true)
  const ticks = [0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 10].filter((t) => t >= lo && t <= hi)
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg width={w} height={ih + m.t + m.b} role="img" aria-label="Forest plot of hazard ratios">
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke={t === 1 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={t === 1 ? 1.5 : 1} />
          ))}
          {rows.map((r, i) => {
            const y = i * rowH + rowH / 2
            return (
              <g key={r.label}>
                <text x={-10} y={y} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--ink)">
                  {r.label}
                </text>
                <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} stroke="var(--s1)" strokeWidth={2} strokeLinecap="round" />
                <rect x={x(r.est) - 5} y={y - 5} width={10} height={10} rx={2} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
                {r.truth !== undefined && <path d={`M${x(r.truth)},${y - 9} l5,-6 h-10 z`} fill="var(--s2)" transform={`translate(0,0)`} />}
              </g>
            )
          })}
          <line x1={0} x2={x(hi)} y1={ih} y2={ih} stroke="var(--axis)" />
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={ih + 15} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
              {t}
            </text>
          ))}
          <text x={x(hi) / 2} y={ih + 31} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
            {xLabel}
          </text>
        </g>
      </svg>
      {rows.some((r) => r.truth !== undefined) && (
        <div className="mt-1 flex gap-4 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="10">
              <rect x="1" y="0" width="10" height="10" rx="2" fill="var(--s1)" />
            </svg>
            Estimate with 95% CI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="10">
              <path d="M6,9 l5,-8 h-10 z" fill="var(--s2)" />
            </svg>
            True value
          </span>
        </div>
      )}
    </div>
  )
}
