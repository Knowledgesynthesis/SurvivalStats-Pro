import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useProgressStore } from '@/store/progressStore'
import { generateCompetingRisksData } from '@/lib/dataGenerators'
import { calculateCIF, calculateKaplanMeier } from '@/lib/survivalAnalysis'
import { AlertCircle } from 'lucide-react'

const MODULE_ID = 'competing-risks'

export const CompetingRisksPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  const [lambda1, setLambda1] = useState(0.06)
  const [lambda2, setLambda2] = useState(0.04)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  // Generate competing risks data
  const crData = generateCompetingRisksData(200, lambda1, lambda2, 0.2, refreshKey)
  const cif1 = calculateCIF(crData, 1)
  const cif2 = calculateCIF(crData, 2)

  // For comparison: KM for event 1 (treating event 2 as censored)
  const event1Only = crData.map(d => ({
    id: d.id,
    time: d.time,
    event: d.eventType === 1,
    covariates: d.covariates,
  }))
  const kmEvent1 = calculateKaplanMeier(event1Only)

  const chartData = cif1.time.map((t, i) => ({
    time: t,
    cif1: cif1.cif[i],
    cif2: cif2.cif[i] || 0,
    kmIncorrect: 1 - (kmEvent1.survival[i] || 1),
  }))

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Competing Risks Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Learn cumulative incidence functions and subdistribution hazards for competing events.
        </p>
      </div>

      <Tabs defaultValue="cif">
        <TabsList>
          <TabsTrigger value="cif">CIF Simulator</TabsTrigger>
          <TabsTrigger value="theory">Theory & Methods</TabsTrigger>
          <TabsTrigger value="pitfalls">Common Pitfalls</TabsTrigger>
        </TabsList>

        <TabsContent value="cif" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Incidence Function (CIF) Simulator</CardTitle>
              <CardDescription>
                Visualize how competing events affect the cumulative incidence of each event type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Hazard for Event 1 (λ₁)"
                  value={lambda1}
                  onChange={setLambda1}
                  min={0.01}
                  max={0.15}
                  step={0.01}
                />
                <Slider
                  label="Hazard for Event 2 (λ₂)"
                  value={lambda2}
                  onChange={setLambda2}
                  min={0.01}
                  max={0.15}
                  step={0.01}
                />
                <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
                  Regenerate Data
                </Button>
              </div>

              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      label={{ value: 'Cumulative Incidence', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="stepAfter"
                      dataKey="cif1"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="CIF for Event 1"
                    />
                    <Line
                      type="stepAfter"
                      dataKey="cif2"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="CIF for Event 2"
                    />
                    <Line
                      type="stepAfter"
                      dataKey="kmIncorrect"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="1 - KM (INCORRECT for competing risks)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Critical Warning
                </h4>
                <p className="text-sm">
                  The dashed red line shows 1 - KM(t) for event 1, which <strong>overestimates</strong> the
                  true cumulative incidence (solid blue line). Using KM in competing risks settings leads
                  to biased estimates because it treats competing events as non-informative censoring!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competing Risks Theory</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What are Competing Risks?</h3>
              <p>
                Competing risks arise when a subject can experience one of several mutually exclusive events,
                and the occurrence of one event <strong>prevents</strong> the occurrence of other events.
              </p>

              <h3>Examples</h3>
              <ul>
                <li>Cancer patients can die from cancer or other causes</li>
                <li>Transplant patients can experience graft failure or death</li>
                <li>Relapse or death in remission (where death prevents observing relapse)</li>
              </ul>

              <h3>Cumulative Incidence Function (CIF)</h3>
              <p>
                For event type j, the CIF represents the probability of experiencing event j by time t,
                accounting for the fact that competing events prevent event j from occurring.
              </p>

              <div className="bg-muted p-4 rounded not-prose">
                <p className="font-mono text-sm">CIF_j(t) = ∫₀ᵗ S(u) × h_j(u) du</p>
                <p className="text-xs text-muted-foreground mt-2">
                  where S(u) is overall survival and h_j(u) is cause-specific hazard for event j
                </p>
              </div>

              <h3>Two Types of Hazards</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Cause-Specific Hazard</h4>
                  <p className="text-sm text-muted-foreground">
                    Rate of event j among those still at risk (no event yet).
                    Treats other events as censoring.
                  </p>
                  <p className="text-xs mt-2 font-mono">h_j(t) = lim P(t ≤ T &lt; t+Δt, J=j | T ≥ t) / Δt</p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-2">Subdistribution Hazard</h4>
                  <p className="text-sm text-muted-foreground">
                    Rate of event j among those who haven't experienced event j yet
                    (keeps competing events in risk set).
                  </p>
                  <p className="text-xs mt-2">Used in Fine-Gray model for regression</p>
                </div>
              </div>

              <h3>Fine-Gray Model</h3>
              <p>
                The Fine-Gray model is a regression model for the subdistribution hazard, allowing
                covariate adjustment for CIF estimation.
              </p>

              <div className="bg-muted p-4 rounded not-prose">
                <p className="font-mono text-sm">h*_j(t|X) = h*_{0j}(t) × exp(β'X)</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Similar to Cox model but for subdistribution hazard
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pitfalls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Common Pitfalls in Competing Risks</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Pitfall #1: Using 1 - KM for Cumulative Incidence</h3>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded not-prose">
                <p className="text-sm font-semibold mb-2">❌ WRONG APPROACH</p>
                <p className="text-sm">
                  Treating competing events as censored and using 1 - KM(t) to estimate
                  cumulative incidence of the event of interest.
                </p>
                <p className="text-sm mt-2 font-semibold">Why it's wrong:</p>
                <p className="text-sm">
                  This overestimates the true cumulative incidence because it assumes subjects
                  who experienced competing events could still experience the event of interest.
                </p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded not-prose mt-4">
                <p className="text-sm font-semibold mb-2">✓ CORRECT APPROACH</p>
                <p className="text-sm">
                  Use the cumulative incidence function (CIF), which properly accounts for
                  the fact that competing events prevent the event of interest.
                </p>
              </div>

              <h3>Pitfall #2: Confusing Cause-Specific and Subdistribution Hazards</h3>
              <ul>
                <li>
                  <strong>Cause-specific HR:</strong> Compares rates among those at risk
                  (useful for etiologic research)
                </li>
                <li>
                  <strong>Subdistribution HR:</strong> Directly relates to cumulative incidence
                  (useful for prediction)
                </li>
                <li>They answer <strong>different questions</strong> and can give different conclusions!</li>
              </ul>

              <h3>Pitfall #3: Ignoring Competing Risks Entirely</h3>
              <p>
                In settings with high competing risk rates (e.g., elderly populations, serious comorbidities),
                ignoring competing risks can lead to severely biased effect estimates.
              </p>

              <h3>Which Method to Use?</h3>
              <div className="bg-muted p-4 rounded not-prose">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Goal</th>
                      <th className="text-left p-2">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Estimate absolute risk of event</td>
                      <td className="p-2">Cumulative Incidence Function (CIF)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Compare CIF between groups</td>
                      <td className="p-2">Gray's test</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Regression for CIF</td>
                      <td className="p-2">Fine-Gray model (subdistribution hazard)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Etiologic research on causes</td>
                      <td className="p-2">Cause-specific Cox model</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <Button onClick={() => markModuleComplete(MODULE_ID)}>
                  Mark Module as Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
