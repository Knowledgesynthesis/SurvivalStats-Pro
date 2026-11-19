import { memo, useMemo } from 'react'
import katex from 'katex'
import { cn } from '@/lib/utils'

const cache = new Map<string, string>()
function render(tex: string, display: boolean) {
  const key = (display ? 'D' : 'I') + tex
  let html = cache.get(key)
  if (!html) {
    html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
    cache.set(key, html)
  }
  return html
}

/** Inline math: <M>{String.raw`S(t)`}</M> */
export const M = memo(function M({ children }: { children: string }) {
  const html = useMemo(() => render(children, false), [children])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
})

/** Display math with an optional caption explaining every symbol. */
export const MathBlock = memo(function MathBlock({ tex, caption, className }: { tex: string; caption?: React.ReactNode; className?: string }) {
  const html = useMemo(() => render(tex, true), [tex])
  return (
    <div className={cn('my-4 rounded-xl border border-line bg-surface-2/60 px-4 py-3', className)}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption && <div className="mt-1 text-sm leading-relaxed text-ink-2">{caption}</div>}
    </div>
  )
})
