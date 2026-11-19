import { PageHeader } from '@/components/layout/PageHeader'
import { RefList } from '@/components/learn/blocks'
import { REFERENCES, type RefKey, type Reference } from '@/content/references'

const ORDER: Reference['topic'][] = ['Textbook', 'Foundations', 'Comparing groups', 'Cox & PH', 'Parametric', 'Competing risks', 'Time-dependent', 'Recurrent & multi-state', 'Prediction', 'Reporting & design', 'Software']

export default function ReferencesPage() {
  const keys = Object.keys(REFERENCES) as RefKey[]
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-24 pt-8 sm:px-6">
      <PageHeader kicker="Evidence" title="References">
        Every method and recommendation in the course traces to these sources. DOIs link to the publisher. Reporting guidance is current as of 2025: CONSORT 2025, TRIPOD+AI (2024), PROBAST+AI (2025).
      </PageHeader>
      <div className="space-y-8">
        {ORDER.map((topic) => {
          const ks = keys.filter((k) => REFERENCES[k].topic === topic).sort((a, b) => String(REFERENCES[a].year).localeCompare(String(REFERENCES[b].year)))
          if (!ks.length) return null
          return (
            <section key={topic}>
              <h2 className="mb-3 text-lg font-semibold text-ink">{topic}</h2>
              <RefList keys={ks} />
            </section>
          )
        })}
      </div>
    </div>
  )
}
