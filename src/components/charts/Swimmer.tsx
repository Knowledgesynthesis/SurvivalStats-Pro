import { useLayoutEffect, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'

export interface Lane {
  id: string
  start: number
  end: number
  /** 'event' (filled dot), 'censor' (open circle), 'competing' (cross) */
  outcome: 'event' | 'censor' | 'competing'
  /** optional mid-lane marker (e.g., response time) */
  mark?: number
  /** recurrent events along the lane */
  events?: number[]
  dim?: boolean
}

/** One horizontal line per subject: follow-up from start to end with an outcome marker. */
export function Swimmer({ lanes, xMax, xLabel, refX, refLabel, markLabel, height }: { lanes: Lane[]; xMax: number; xLabel: string; refX?: number; refLabel?: string; markLabel?: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width))
    ro.observe(ref.current)
    setW(ref.current.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  const m = { l: 40, r: 14, t: 22, b: 38 }
  const rowH = 22
  const ih = height ?? lanes.length * rowH
  const x = scaleLinear().domain([0, xMax]).range([0, Math.max(100, w - m.l - m.r)])
  const ticks = x.ticks(6)
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg width={w} height={ih + m.t + m.b} role="img" aria-label={`Follow-up of ${lanes.length} subjects`}>
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke="var(--grid)" />
          ))}
          {lanes.map((ln, i) => {
            const y = i * rowH + rowH / 2
            const color = ln.outcome === 'event' ? 'var(--s2)' : ln.outcome === 'competing' ? 'var(--s7)' : 'var(--s1)'
            return (
              <g key={ln.id} opacity={ln.dim ? 0.3 : 1}>
                <text x={-8} y={y} dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--muted)" className="tabular">
                  {ln.id}
                </text>
                <line x1={x(ln.start)} x2={x(ln.end)} y1={y} y2={y} stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
                {ln.events?.map((e, j) => <circle key={j} cx={x(e)} cy={y} r={4.5} fill="var(--s2)" stroke="var(--surface)" strokeWidth={1.5} />)}
                {ln.mark !== undefined && ln.mark < ln.end && <rect x={x(ln.mark) - 3} y={y - 6} width={6} height={12} rx={1.5} fill="var(--s3)" />}
                {ln.outcome === 'event' && <circle cx={x(ln.end)} cy={y} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />}
                {ln.outcome === 'censor' && <circle cx={x(ln.end)} cy={y} r={4.5} fill="var(--surface)" stroke={color} strokeWidth={2} />}
                {ln.outcome === 'competing' && (
                  <g stroke={color} strokeWidth={2.2} strokeLinecap="round">
                    <line x1={x(ln.end) - 4} x2={x(ln.end) + 4} y1={y - 4} y2={y + 4} />
                    <line x1={x(ln.end) - 4} x2={x(ln.end) + 4} y1={y + 4} y2={y - 4} />
                  </g>
                )}
              </g>
            )
          })}
          {refX !== undefined && (
            <g>
              <line x1={x(refX)} x2={x(refX)} y1={-4} y2={ih} stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="4 3" />
              {refLabel && (
                <text x={x(refX) + 5} y={-8} fontSize={11} fill="var(--bad-ink)">
                  {refLabel}
                </text>
              )}
            </g>
          )}
          <line x1={0} x2={x(xMax)} y1={ih} y2={ih} stroke="var(--axis)" />
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={ih + 15} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
              {t}
            </text>
          ))}
          <text x={x(xMax) / 2} y={ih + 32} textAnchor="middle" fontSize={12} fill="var(--ink-2)">
            {xLabel}
          </text>
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12">
            <circle cx="6" cy="6" r="4.5" fill="var(--s2)" />
          </svg>
          Event
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12">
            <circle cx="6" cy="6" r="4" fill="var(--surface)" stroke="var(--s1)" strokeWidth="2" />
          </svg>
          Censored
        </span>
        {lanes.some((l) => l.outcome === 'competing') && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" stroke="var(--s7)" strokeWidth="2">
              <line x1="2" x2="10" y1="2" y2="10" />
              <line x1="2" x2="10" y1="10" y2="2" />
            </svg>
            Competing event
          </span>
        )}
        {markLabel && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="8" height="12">
              <rect x="1" y="0" width="6" height="12" rx="1.5" fill="var(--s3)" />
            </svg>
            {markLabel}
          </span>
        )}
      </div>
    </div>
  )
}
