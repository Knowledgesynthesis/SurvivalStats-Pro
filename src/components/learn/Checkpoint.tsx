import { useMemo, useState } from 'react'
import { Award, Check, RotateCcw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Rich, type QuizQ } from './blocks'
import { shuffleQ } from './shuffle'
import { Button } from '@/components/ui/controls'
import { PASS_MARK, useProgress } from '@/store/progress'
import { bankFor } from '@/content/questions'

export function QuestionCard({ q, n, choice, onChoose, reveal }: { q: QuizQ; n: number; choice: number | undefined; onChoose: (i: number) => void; reveal: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4">
      <div className="mb-3 flex gap-2 font-medium text-ink">
        <span className="text-muted tabular">{n}.</span>
        <Rich text={q.stem} />
      </div>
      <div className="space-y-2">
        {q.options.map((o, i) => {
          const picked = choice === i
          const right = i === q.answer
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onChoose(i)}
              aria-pressed={picked}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                !reveal && (picked ? 'border-accent bg-accent/[0.07]' : 'border-line hover:border-accent/50'),
                reveal && right && 'border-good/50 bg-good/[0.07]',
                reveal && picked && !right && 'border-bad/50 bg-bad/[0.06]',
                reveal && !picked && !right && 'border-line opacity-65',
              )}
            >
              <span className={cn('mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]', reveal && right ? 'border-good bg-good text-white' : reveal && picked ? 'border-bad bg-bad text-white' : picked ? 'border-accent bg-accent text-white' : 'border-line text-ink-2')}>
                {reveal && right ? <Check size={12} /> : reveal && picked ? <XCircle size={12} /> : String.fromCharCode(65 + i)}
              </span>
              <Rich text={o} className="text-ink" />
            </button>
          )
        })}
      </div>
      {reveal && (
        <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink">
          <Rich text={q.why} />
        </div>
      )}
    </div>
  )
}

export function Checkpoint({ moduleId }: { moduleId: string }) {
  const [attempt, setAttempt] = useState(0)
  const questions = useMemo(() => bankFor(moduleId).map((q) => shuffleQ(q, attempt)), [moduleId, attempt])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const mastery = useProgress((s) => s.mastery[moduleId])
  const setMastery = useProgress((s) => s.setMastery)
  const score = questions.filter((q) => answers[q.id] === q.answer).length
  const all = questions.every((q) => answers[q.id] !== undefined)
  const passed = score / questions.length >= PASS_MARK

  return (
    <div className="not-lesson space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-sm">
        <span className="text-ink-2">
          {questions.length} questions · pass mark {Math.round(PASS_MARK * 100)}% · counts toward mastery
        </span>
        {mastery && (
          <span className={cn('inline-flex items-center gap-1 font-medium', mastery.passed ? 'text-good-ink' : 'text-ink-2')}>
            <Award size={15} /> Best: {mastery.score}/{mastery.total}
            {mastery.passed && ' · mastered'}
          </span>
        )}
      </div>
      {questions.map((q, i) => (
        <QuestionCard key={q.id} q={q} n={i + 1} choice={answers[q.id]} onChoose={(c) => setAnswers((a) => ({ ...a, [q.id]: c }))} reveal={submitted} />
      ))}
      {!submitted ? (
        <Button
          disabled={!all}
          onClick={() => {
            setSubmitted(true)
            setMastery(moduleId, { score, total: questions.length, passed, at: Date.now() })
          }}
        >
          Submit answers {!all && `(${Object.keys(answers).length}/${questions.length})`}
        </Button>
      ) : (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', passed ? 'border-good/40 bg-good/[0.06]' : 'border-warn/45 bg-warn/[0.07]')}>
          <div className="text-sm text-ink">
            <span className="font-semibold">
              {score}/{questions.length}
            </span>{' '}
            {passed ? '— module mastered. Explanations are shown under each question.' : `— review the explanations and the sections they point to, then retry. You need ${Math.ceil(PASS_MARK * questions.length)} to pass.`}
          </div>
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() => {
              setAnswers({})
              setSubmitted(false)
              setAttempt((a) => a + 1)
            }}
          >
            <RotateCcw size={14} /> Retake (options reshuffled)
          </Button>
        </div>
      )}
    </div>
  )
}
