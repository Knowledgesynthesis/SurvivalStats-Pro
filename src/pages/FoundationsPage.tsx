import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useProgressStore } from '@/store/progressStore'
import { exponentialSurvival, weibullSurvival, weibullHazard } from '@/lib/survivalAnalysis'

const MODULE_ID = 'foundations'

export const FoundationsPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  const [lambda, setLambda] = useState(0.1)
  const [weibullK, setWeibullK] = useState(1.5)
  const [timeRange, setTimeRange] = useState(50)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  // Generate survival, hazard, and cumulative hazard curves
  const generateCurves = () => {
    const data = []
    for (let t = 0; t <= timeRange; t += 0.5) {
      const survival = exponentialSurvival(t, lambda)
      const hazard = lambda // constant for exponential
      const cumulativeHazard = lambda * t

      const weibullSurv = weibullSurvival(t, lambda, weibullK)
      const weibullHaz = weibullHazard(t, lambda, weibullK)

      data.push({
        time: t,
        survival,
        hazard,
        cumulativeHazard,
        weibullSurv,
        weibullHaz,
      })
    }
    return data
  }

  const curveData = generateCurves()

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Foundations of Survival Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Learn the core concepts: time, events, censoring, survival functions, and hazard functions.
        </p>
      </div>

      <Tabs defaultValue="concepts">
        <TabsList>
          <TabsTrigger value="concepts">Core Concepts</TabsTrigger>
          <TabsTrigger value="functions">Survival & Hazard Functions</TabsTrigger>
          <TabsTrigger value="censoring">Understanding Censoring</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Concepts in Survival Analysis</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What Makes Survival Analysis Special?</h3>
              <p>
                Survival analysis (also called time-to-event analysis) is unique because it handles:
              </p>
              <ul>
                <li><strong>Time-to-event data:</strong> We're interested in when something happens, not just if it happens</li>
                <li><strong>Censoring:</strong> Not all subjects experience the event during observation</li>
                <li><strong>Time-varying risk:</strong> The risk of an event can change over time</li>
              </ul>

              <h3>Key Terminology</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="font-semibold">Event</dt>
                  <dd>The outcome of interest (death, disease relapse, recovery, etc.)</dd>
                </div>
                <div>
                  <dt className="font-semibold">Time Origin</dt>
                  <dd>The starting point for measuring time (diagnosis, treatment start, birth)</dd>
                </div>
                <div>
                  <dt className="font-semibold">Censoring</dt>
                  <dd>When we know a subject survived past a certain time, but don't know their exact event time</dd>
                </div>
                <div>
                  <dt className="font-semibold">At Risk</dt>
                  <dd>Subjects who have not yet experienced the event and are still being observed</dd>
                </div>
              </dl>

              <h3>Types of Censoring</h3>
              <div className="grid md:grid-cols-3 gap-4 not-prose mt-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Right Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Most common. Event hasn't occurred by end of study or subject is lost to follow-up.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Left Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Event occurred before observation began, but exact time is unknown.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Interval Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Event occurred within an interval, but exact time is unknown.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Function Explorer</CardTitle>
              <CardDescription>
                Visualize how survival, hazard, and cumulative hazard functions relate to each other.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Hazard Rate (λ) - Exponential"
                  value={lambda}
                  onChange={setLambda}
                  min={0.01}
                  max={0.3}
                  step={0.01}
                />
                <Slider
                  label="Weibull Shape (k)"
                  value={weibullK}
                  onChange={setWeibullK}
                  min={0.5}
                  max={3}
                  step={0.1}
                />
                <Slider
                  label="Time Range"
                  value={timeRange}
                  onChange={setTimeRange}
                  min={20}
                  max={100}
                  step={5}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Survival Function */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Survival Function S(t)</h4>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="survival" stroke="#3b82f6" name="Exponential" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibullSurv" stroke="#10b981" name="Weibull" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    S(t) = Probability of surviving beyond time t
                  </p>
                </div>

                {/* Hazard Function */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Hazard Function h(t)</h4>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="hazard" stroke="#f59e0b" name="Exponential (constant)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibullHaz" stroke="#ef4444" name="Weibull" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    h(t) = Instantaneous risk of event at time t
                  </p>
                </div>

                {/* Cumulative Hazard */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Cumulative Hazard H(t)</h4>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={curveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="cumulativeHazard" fill="#8b5cf6" stroke="#8b5cf6" name="Cumulative Hazard" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    H(t) = ∫₀ᵗ h(u) du = Total accumulated hazard
                  </p>
                </div>

                {/* Key Relationships */}
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <h4 className="font-semibold text-sm">Key Relationships</h4>
                  <div className="space-y-1 text-xs font-mono">
                    <p>S(t) = exp(-H(t))</p>
                    <p>H(t) = -ln(S(t))</p>
                    <p>h(t) = -d/dt[ln(S(t))]</p>
                    <p>f(t) = h(t) * S(t)</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    where f(t) is the probability density function
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="censoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Understanding Censoring</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Why Censoring Matters</h3>
              <p>
                Censoring is what makes survival analysis different from standard regression.
                We can't simply ignore censored observations — they provide valuable information
                about subjects who survived at least until a certain time.
              </p>

              <h3>Non-Informative vs Informative Censoring</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-2">✓ Non-Informative Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    The reason for censoring is unrelated to the event risk. Example: study ends,
                    patient moves away for unrelated reasons.
                  </p>
                  <p className="text-sm mt-2 font-medium">This is the assumption we make in standard analyses!</p>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <h4 className="font-semibold mb-2">✗ Informative Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    The reason for censoring is related to event risk. Example: patient drops out
                    due to treatment side effects or worsening health.
                  </p>
                  <p className="text-sm mt-2 font-medium">This violates standard assumptions and can bias results!</p>
                </div>
              </div>

              <h3>Common Censoring Scenarios</h3>
              <ul>
                <li><strong>Administrative censoring:</strong> Study ends at a fixed date</li>
                <li><strong>Loss to follow-up:</strong> Patient moves, withdraws consent, or can't be contacted</li>
                <li><strong>Competing events:</strong> Patient dies from a different cause (requires special methods!)</li>
                <li><strong>Delayed entry:</strong> Patient enters study after time origin (left truncation)</li>
              </ul>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 not-prose">
                <h4 className="font-semibold mb-2">Important Principle</h4>
                <p className="text-sm">
                  Censored observations are NOT failures or missing data. They contribute crucial
                  information to the analysis. A patient censored at 5 years tells us they survived
                  at least 5 years — this helps estimate the survival curve!
                </p>
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
