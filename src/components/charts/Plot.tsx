import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { scaleLinear } from 'd3-scale'
import { area, line, curveStepAfter, curveLinear, curveMonotoneX } from 'd3-shape'
import { Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Pt = { x: number; y: number }
interface Base {
  id: string
  label: string
  color: string
  /** Hide from legend (e.g., CI band that belongs to a curve). */
  hideLegend?: boolean
  /** Exclude from the crosshair readout. */
  noTooltip?: boolean
}
export interface StepSeries extends Base {
  kind: 'step'
  points: Pt[]
  extendTo?: number
  dashed?: boolean
  width?: number
  censor?: Pt[]
}
export interface LineSeries extends Base {
  kind: 'line'
  points: Pt[]
  dashed?: boolean
  width?: number
  curve?: 'linear' | 'monotone'
}
export interface BandSeries extends Base {
  kind: 'band'
  points: { x: number; y0: number; y1: number }[]
  step?: boolean
  opacity?: number
  /** draw a 2px surface-coloured gap along the upper edge (stacked areas) */
  gapEdge?: boolean
}
export interface ScatterSeries extends Base {
  kind: 'scatter'
  points: Pt[]
  r?: number
  opacity?: number
  hollow?: boolean
}
export type Series = StepSeries | LineSeries | BandSeries | ScatterSeries

export interface RefLine {
  x?: number
  y?: number
  label?: string
}
export interface Shade {
  x0: number
  x1: number
  label?: string
}

export interface PlotProps {
  series: Series[]
  xLabel: string
  yLabel: string
  xDomain?: [number, number]
  yDomain?: [number, number]
  height?: number
  refLines?: RefLine[]
  shades?: Shade[]
  yFormat?: (v: number) => string
  xFormat?: (v: number) => string
  /** Number-at-risk table aligned with the x-axis. */
  riskTable?: { times: number[]; rows: { label: string; color: string; counts: number[] }[]; title?: string }
  /** Points at which the data-table view samples every series. */
  tableTimes?: number[]
  ariaLabel: string
  className?: string
  children?: ReactNode
}

const BASE_M = { top: 10, right: 18, bottom: 44, left: 52 }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver((entries) => setW(Math.max(260, entries[0].contentRect.width)))
    ro.observe(el)
    setW(Math.max(260, el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function stepAt(points: Pt[], x: number): number | undefined {
  if (!points.length || x < points[0].x) return undefined
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (points[mid].x <= x) lo = mid
    else hi = mid - 1
  }
  return points[lo].y
}
function lineAt(points: Pt[], x: number): number | undefined {
  if (points.length < 2 || x < points[0].x || x > points[points.length - 1].x) return undefined
  let i = 1
  while (i < points.length && points[i].x < x) i++
  const a = points[i - 1]
  const b = points[i] ?? a
  if (b.x === a.x) return b.y
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
}

export function valueAt(s: Series, x: number): number | undefined {
  if (s.kind === 'step') {
    if (s.extendTo !== undefined && x > s.extendTo) return undefined
    return stepAt(s.points, x)
  }
  if (s.kind === 'line') return lineAt(s.points, x)
  return undefined
}

const fmtVal = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(3))

export const defaultFormat = (step: number) => (v: number) => {
  const d = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)))
  return v.toFixed(d)
}

export function Plot({ series, xLabel, yLabel, xDomain, yDomain, height = 300, refLines, shades, yFormat, xFormat, riskTable, tableTimes, ariaLabel, className, children }: PlotProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const M = riskTable ? { ...BASE_M, left: 92 } : BASE_M
  const clipId = useId().replace(/:/g, '')
  const [hoverX, setHoverX] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const iw = Math.max(100, width - M.left - M.right)
  const ih = height

  const [x0, x1] = useMemo<[number, number]>(() => {
    if (xDomain) return xDomain
    let lo = Infinity
    let hi = -Infinity
    for (const s of series) for (const p of s.points) {
      lo = Math.min(lo, p.x)
      hi = Math.max(hi, p.x)
    }
    for (const s of series) if (s.kind === 'step' && s.extendTo !== undefined) hi = Math.max(hi, s.extendTo)
    if (!Number.isFinite(lo)) return [0, 1]
    return [Math.min(0, lo), hi > lo ? hi : lo + 1]
  }, [series, xDomain])
  const [y0, y1] = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain
    let lo = Infinity
    let hi = -Infinity
    for (const s of series) for (const p of s.points as Array<Pt | { y0: number; y1: number }>) {
      const vals = 'y' in p ? [p.y] : [p.y0, p.y1]
      for (const v of vals) if (Number.isFinite(v)) {
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
    }
    if (!Number.isFinite(lo)) return [0, 1]
    const pad = (hi - lo) * 0.06 || 1
    return [lo >= 0 && lo - pad < 0 ? 0 : lo - pad, hi + pad]
  }, [series, yDomain])

  const x = useMemo(() => scaleLinear().domain([x0, x1]).range([0, iw]).nice(), [x0, x1, iw])
  const y = useMemo(() => {
    const s = scaleLinear().domain([y0, y1]).range([ih, 0])
    return yDomain ? s : s.nice()
  }, [y0, y1, ih, yDomain])
  const xTicks = x.ticks(Math.max(3, Math.min(10, Math.floor(iw / 70))))
  const yTicks = y.ticks(Math.max(3, Math.floor(ih / 55)))
  const fx = xFormat ?? defaultFormat(xTicks.length > 1 ? xTicks[1] - xTicks[0] : 1)
  const fy = yFormat ?? defaultFormat(yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1)
  const [dx0, dx1] = x.domain()

  const candidates = useMemo(() => {
    const set = new Set<number>()
    for (const s of series) if ((s.kind === 'step' || s.kind === 'line') && !s.noTooltip) for (const p of s.points) set.add(p.x)
    return Array.from(set).sort((a, b) => a - b)
  }, [series])

  const snap = (px: number) => {
    const target = x.invert(px)
    if (!candidates.length) return target
    let best = candidates[0]
    for (const c of candidates) if (Math.abs(c - target) < Math.abs(best - target)) best = c
    // for steps, also allow positions between knots if the pointer is far from any
    if (Math.abs(x(best) - px) > 24) return target
    return best
  }

  const stepPath = (s: StepSeries) => {
    if (!s.points.length) return ''
    const pts = s.points.slice()
    const end = s.extendTo ?? pts[pts.length - 1].x
    if (end > pts[pts.length - 1].x) pts.push({ x: end, y: pts[pts.length - 1].y })
    return line<Pt>().x((p) => x(p.x)).y((p) => y(p.y)).curve(curveStepAfter)(pts) ?? ''
  }

  const legendItems = series.filter((s) => !s.hideLegend)
  const readout = hoverX === null ? [] : series.filter((s) => !s.noTooltip && (s.kind === 'step' || s.kind === 'line')).map((s) => ({ s, v: valueAt(s, hoverX) }))
  const sampleTimes = tableTimes ?? riskTable?.times ?? x.ticks(8)

  return (
    <figure className={cn('w-full min-w-0', className)} aria-label={ariaLabel}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {legendItems.length >= 2 &&
          legendItems.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <LegendKey s={s} />
              {s.label}
            </span>
          ))}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
          aria-pressed={showTable}
        >
          <Table2 size={13} /> {showTable ? 'Chart' : 'Data'}
        </button>
      </div>
      <div ref={wrapRef} className="relative w-full min-w-0">
        {showTable ? (
          <DataTable series={series} times={sampleTimes} fx={fx} xLabel={xLabel} />
        ) : (
          <svg
            width={width}
            height={ih + M.top + M.bottom}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            className="block touch-pan-y select-none outline-none"
            onPointerMove={(e) => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
              const px = e.clientX - rect.left - M.left
              if (px < 0 || px > iw) return setHoverX(null)
              setHoverX(snap(px))
            }}
            onPointerLeave={() => setHoverX(null)}
            onKeyDown={(e) => {
              if (!candidates.length) return
              const idx = hoverX === null ? -1 : candidates.findIndex((c) => c >= hoverX)
              if (e.key === 'ArrowRight') setHoverX(candidates[Math.min(candidates.length - 1, idx + 1)])
              else if (e.key === 'ArrowLeft') setHoverX(candidates[Math.max(0, idx - 1)])
              else if (e.key === 'Escape') setHoverX(null)
            }}
            onBlur={() => setHoverX(null)}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={0} y={-2} width={iw} height={ih + 4} />
              </clipPath>
            </defs>
            <g transform={`translate(${M.left},${M.top})`}>
              {/* grid */}
              {yTicks.map((t) => (
                <line key={`gy${t}`} x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              ))}
              {shades?.map((s, i) => (
                <g key={`sh${i}`}>
                  <rect x={x(Math.max(s.x0, dx0))} width={Math.max(0, x(Math.min(s.x1, dx1)) - x(Math.max(s.x0, dx0)))} y={0} height={ih} fill="var(--ink)" opacity={0.045} />
                  {s.label && (
                    <text x={x(Math.max(s.x0, dx0)) + 4} y={12} fontSize={11} fill="var(--muted)">
                      {s.label}
                    </text>
                  )}
                </g>
              ))}
              <g clipPath={`url(#${clipId})`}>
                {series.map((s) => {
                  if (s.kind === 'band') {
                    const gen = area<{ x: number; y0: number; y1: number }>()
                      .x((p) => x(p.x))
                      .y0((p) => y(p.y0))
                      .y1((p) => y(p.y1))
                      .curve(s.step ? curveStepAfter : curveLinear)
                    const top = line<{ x: number; y0: number; y1: number }>()
                      .x((p) => x(p.x))
                      .y((p) => y(p.y1))
                      .curve(s.step ? curveStepAfter : curveLinear)
                    return (
                      <g key={s.id}>
                        <path d={gen(s.points) ?? ''} fill={s.color} opacity={s.opacity ?? 0.14} />
                        {s.gapEdge && <path d={top(s.points) ?? ''} fill="none" stroke="var(--surface)" strokeWidth={2} />}
                      </g>
                    )
                  }
                  return null
                })}
                {series.map((s) => {
                  if (s.kind === 'step')
                    return (
                      <g key={s.id}>
                        <path d={stepPath(s)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '6 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                        {s.censor?.map((c, i) => (
                          <line key={i} x1={x(c.x)} x2={x(c.x)} y1={y(c.y) - 5} y2={y(c.y) + 5} stroke={s.color} strokeWidth={1.5} />
                        ))}
                      </g>
                    )
                  if (s.kind === 'line') {
                    const gen = line<Pt>()
                      .defined((p) => Number.isFinite(p.y))
                      .x((p) => x(p.x))
                      .y((p) => y(p.y))
                      .curve(s.curve === 'monotone' ? curveMonotoneX : curveLinear)
                    return <path key={s.id} d={gen(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dashed ? '6 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                  }
                  if (s.kind === 'scatter')
                    return (
                      <g key={s.id}>
                        {s.points.map((p, i) => (
                          <circle key={i} cx={x(p.x)} cy={y(p.y)} r={s.r ?? 3} fill={s.hollow ? 'var(--surface)' : s.color} stroke={s.hollow ? s.color : 'var(--surface)'} strokeWidth={s.hollow ? 1.5 : 1} opacity={s.opacity ?? 0.75} />
                        ))}
                      </g>
                    )
                  return null
                })}
              </g>
              {refLines?.map((r, i) =>
                r.x !== undefined ? (
                  <g key={`r${i}`}>
                    <line x1={x(r.x)} x2={x(r.x)} y1={0} y2={ih} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
                    {r.label && (
                      <text x={x(r.x) + 4} y={ih - 6} fontSize={11} fill="var(--muted)">
                        {r.label}
                      </text>
                    )}
                  </g>
                ) : r.y !== undefined ? (
                  <g key={`r${i}`}>
                    <line x1={0} x2={iw} y1={y(r.y)} y2={y(r.y)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
                    {r.label && (
                      <text x={iw - 4} y={y(r.y) - 5} textAnchor="end" fontSize={11} fill="var(--muted)">
                        {r.label}
                      </text>
                    )}
                  </g>
                ) : null,
              )}
              {/* axes */}
              <line x1={0} x2={iw} y1={ih} y2={ih} stroke="var(--axis)" />
              {xTicks.map((t) => (
                <g key={`x${t}`} transform={`translate(${x(t)},${ih})`}>
                  <line y2={4} stroke="var(--axis)" />
                  <text y={17} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
                    {fx(t)}
                  </text>
                </g>
              ))}
              {yTicks.map((t) => (
                <text key={`y${t}`} x={-8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
                  {fy(t)}
                </text>
              ))}
              <text x={iw / 2} y={ih + 36} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
                {xLabel}
              </text>
              <text transform={`translate(${-40},${ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
                {yLabel}
              </text>
              {/* crosshair */}
              {hoverX !== null && hoverX >= dx0 && hoverX <= dx1 && (
                <g pointerEvents="none">
                  <line x1={x(hoverX)} x2={x(hoverX)} y1={0} y2={ih} stroke="var(--ink-2)" strokeWidth={1} opacity={0.5} />
                  {readout.map(({ s, v }) =>
                    v === undefined || !Number.isFinite(v) ? null : <circle key={s.id} cx={x(hoverX)} cy={y(v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />,
                  )}
                </g>
              )}
              {children}
            </g>
          </svg>
        )}
        {!showTable && hoverX !== null && readout.some((r) => r.v !== undefined) && (
          <Tooltip left={M.left + x(hoverX)} width={width} title={`${xLabel}: ${fx(hoverX)}`} rows={readout.filter((r) => r.v !== undefined && Number.isFinite(r.v)).map((r) => ({ color: r.s.color, dashed: 'dashed' in r.s && !!r.s.dashed, label: r.s.label, value: fmtVal(r.v!) }))} />
        )}
      </div>
      {riskTable && !showTable && (
        <div className="mt-1 overflow-hidden" aria-label="Number at risk">
          <div className="mb-0.5 text-[11px] font-medium text-muted" style={{ paddingLeft: 4 }}>
            {riskTable.title ?? 'Number at risk'}
          </div>
          {riskTable.rows.map((row) => (
            <div key={row.label} className="relative h-5 text-[11px] text-ink-2 tabular">
              <span className="absolute left-0 top-0 inline-flex w-[84px] items-center gap-1.5 overflow-hidden whitespace-nowrap" title={row.label}>
                <span className="inline-block h-0.5 w-2.5 shrink-0 rounded" style={{ background: row.color }} />
                <span className="truncate">{row.label}</span>
              </span>
              {riskTable.times.map((t, i) =>
                t >= dx0 && t <= dx1 ? (
                  <span key={t} className="absolute top-0 -translate-x-1/2" style={{ left: M.left + x(t) }}>
                    {row.counts[i]}
                  </span>
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}
    </figure>
  )
}

function LegendKey({ s }: { s: Series }) {
  if (s.kind === 'band') return <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: s.color, opacity: Math.max(0.35, s.opacity ?? 0.14) }} />
  if (s.kind === 'scatter') return <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
  const dashed = 'dashed' in s && s.dashed
  return (
    <svg width="18" height="6" aria-hidden>
      <line x1="1" x2="17" y1="3" y2="3" stroke={s.color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} strokeLinecap="round" />
    </svg>
  )
}

function Tooltip({ left, width, title, rows }: { left: number; width: number; title: string; rows: { color: string; dashed: boolean; label: string; value: string }[] }) {
  const flip = left > width * 0.6
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
      style={flip ? { right: width - left + 12 } : { left: left + 12 }}
    >
      <div className="mb-1 text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          <svg width="14" height="6" aria-hidden>
            <line x1="1" x2="13" y1="3" y2="3" stroke={r.color} strokeWidth={2} strokeDasharray={r.dashed ? '3 2' : undefined} />
          </svg>
          <span className="font-semibold text-ink tabular">{r.value}</span>
          <span className="truncate text-ink-2">{r.label}</span>
        </div>
      ))}
    </div>
  )
}

function DataTable({ series, times, fx, xLabel }: { series: Series[]; times: number[]; fx: (v: number) => string; xLabel: string }) {
  const cols = series.filter((s) => s.kind === 'step' || s.kind === 'line' || s.kind === 'band')
  return (
    <div className="max-h-[360px] overflow-auto rounded-lg border border-line">
      <table className="w-full text-xs tabular">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-ink-2">{xLabel}</th>
            {cols.map((s) => (
              <th key={s.id} className="px-2 py-1.5 text-right font-medium text-ink-2">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="border-t border-grid">
              <td className="px-2 py-1">{fx(t)}</td>
              {cols.map((s) => {
                let v: string = '–'
                if (s.kind === 'band') {
                  const lo = stepAt(s.points.map((p) => ({ x: p.x, y: p.y0 })), t)
                  const hi = stepAt(s.points.map((p) => ({ x: p.x, y: p.y1 })), t)
                  if (lo !== undefined && hi !== undefined) v = `${lo.toFixed(3)}–${hi.toFixed(3)}`
                } else {
                  const val = valueAt(s, t)
                  if (val !== undefined && Number.isFinite(val)) v = val.toFixed(3)
                }
                return (
                  <td key={s.id} className="px-2 py-1 text-right">
                    {v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
