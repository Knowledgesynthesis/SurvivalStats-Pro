import { useId, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Slider({ label, value, onChange, min, max, step, format, hint }: { label: ReactNode; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string; hint?: string }) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold text-ink tabular">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-describedby={hint ? `${id}-h` : undefined}
      />
      {hint && (
        <p id={`${id}-h`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Segmented<T extends string>({ label, value, onChange, options, wide }: { label?: ReactNode; value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; wide?: boolean }) {
  const long = wide ?? options.reduce((n, o) => n + (typeof o.label === 'string' ? o.label.length + 4 : 8), 0) > 26
  return (
    <div className={cn('min-w-0', long && 'col-span-full')}>
      {label && <div className="mb-1 text-sm text-ink-2">{label}</div>}
      <div role="radiogroup" className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'whitespace-nowrap rounded-md px-2.5 py-1 text-sm transition-colors',
              value === o.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2 select-none">
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-grid')}>
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
      </span>
      {label}
    </label>
  )
}

export function Button({ children, onClick, variant = 'default', className, type = 'button', disabled }: { children: ReactNode; onClick?: () => void; variant?: 'default' | 'outline' | 'ghost'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45',
        variant === 'default' && 'bg-accent text-white hover:brightness-110',
        variant === 'outline' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Resample({ onClick, seed }: { onClick: () => void; seed: number }) {
  return (
    <Button variant="outline" onClick={onClick} className="py-1.5">
      <RefreshCw size={14} /> New sample <span className="text-xs text-muted tabular">#{seed}</span>
    </Button>
  )
}

export function StatTile({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('mt-0.5 text-lg font-semibold text-ink', tone === 'good' && 'text-good-ink', tone === 'bad' && 'text-bad-ink', tone === 'warn' && 'text-warn-ink')}>{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  )
}
