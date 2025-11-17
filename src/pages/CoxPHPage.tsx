import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts'
import { useProgressStore } from '@/store/progressStore'
import { generateDataWithCovariates, generateNonProportionalHazardsData } from '@/lib/dataGenerators'
import { calculateKaplanMeier } from '@/lib/survivalAnalysis'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle } from 'lucide-react'

const MODULE_ID = 'cox-ph'

export const CoxPHPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  const [sampleSize, setSampleSize] = useState(200)
  const [ageCoefficent, setAgeCoefficient] = useState(0.02)
  const [treatmentCoefficient, setTreatmentCoefficient] = useState(-0.5)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  // Generate data with covariates
  const data = generateDataWithCovariates(
    sampleSize,
    0.05,
    { age: ageCoefficent, treatment: treatmentCoefficient },
    0.2,
    refreshKey
  )

  // Calculate HR for treatment
  const treatmentHR = Math.exp(treatmentCoefficient)
  const ageHR = Math.exp(ageCoefficent * 10) // HR for 10-year age increase

  // Generate non-PH data for diagnostics
  const { group1, group2 } = generateNonProportionalHazardsData(100, refreshKey + 500)
  const km1 = calculateKaplanMeier(group1)
  const km2 = calculateKaplanMeier(group2)

  // Simulate Schoenfeld residuals (simplified for educational purposes)
  const schoenfelData = km1.time.slice(1, 30).map((t, i) => ({
    time: t,
    residual: Math.sin(i / 5) * 0.3 + (Math.random() - 0.5) * 0.2,
    smoothed: Math.sin(i / 5) * 0.3,
  }))

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cox Proportional Hazards Model</h1>
        <p className="text-muted-foreground mt-2">
          Learn about regression modeling in survival analysis, hazard ratios, and proportional hazards assumptions.
        </p>
      </div>

      <Tabs defaultValue="model">
        <TabsList>
          <TabsTrigger value="model">Cox Model Builder</TabsTrigger>
          <TabsTrigger value="diagnostics">PH Assumption Diagnostics</TabsTrigger>
          <TabsTrigger value="interpretation">Interpreting HRs</TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Cox Model</CardTitle>
              <CardDescription>
                Adjust covariate coefficients to see their effect on hazard ratios and survival.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Sample Size"
                  value={sampleSize}
                  onChange={setSampleSize}
                  min={50}
                  max={500}
                  step={50}
                />
                <Slider
                  label="Age Coefficient (β₁)"
                  value={ageCoefficent}
                  onChange={setAgeCoefficient}
                  min={-0.05}
                  max={0.05}
                  step={0.005}
                />
                <Slider
                  label="Treatment Coefficient (β₂)"
                  value={treatmentCoefficient}
                  onChange={setTreatmentCoefficient}
                  min={-1}
                  max={0.5}
                  step={0.05}
                />
                <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
                  Regenerate Data
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Cox Model Equation */}
                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <h4 className="font-semibold">Cox PH Model</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p>h(t|X) = h₀(t) * exp(β₁*Age + β₂*Treatment)</p>
                    <p className="text-muted-foreground">where h₀(t) is the baseline hazard</p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Age Coefficient (β₁)</p>
                      <p className="font-mono text-lg">{ageCoefficent.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Treatment Coefficient (β₂)</p>
                      <p className="font-mono text-lg">{treatmentCoefficient.toFixed(3)}</p>
                    </div>
                  </div>
                </div>

                {/* Hazard Ratios */}
                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <h4 className="font-semibold">Hazard Ratios</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">HR for Treatment (vs Control)</p>
                      <p className="font-mono text-2xl">
                        {treatmentHR.toFixed(3)}
                        {treatmentHR < 1 && (
                          <Badge variant="success" className="ml-2">Protective</Badge>
                        )}
                        {treatmentHR > 1 && (
                          <Badge variant="warning" className="ml-2">Harmful</Badge>
                        )}
                      </p>
                      <p className="text-xs mt-1">
                        {treatmentHR < 1
                          ? `${((1 - treatmentHR) * 100).toFixed(1)}% reduction in hazard`
                          : `${((treatmentHR - 1) * 100).toFixed(1)}% increase in hazard`
                        }
                      </p>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground">HR for 10-Year Age Increase</p>
                      <p className="font-mono text-2xl">{ageHR.toFixed(3)}</p>
                      <p className="text-xs mt-1">
                        {ageHR > 1
                          ? `${((ageHR - 1) * 100).toFixed(1)}% increase in hazard per 10 years`
                          : `${((1 - ageHR) * 100).toFixed(1)}% decrease in hazard per 10 years`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Understanding the Cox Model
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• The Cox model is <strong>semi-parametric</strong>: it doesn't assume a specific baseline hazard shape</li>
                  <li>• Hazard Ratio (HR) = exp(β): interprets as multiplicative effect on hazard</li>
                  <li>• HR &lt; 1 means protective effect; HR &gt; 1 means increased risk</li>
                  <li>• The model assumes <strong>proportional hazards</strong>: HR is constant over time</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proportional Hazards Assumption Diagnostics</CardTitle>
              <CardDescription>
                Learn to check whether the proportional hazards assumption holds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h3>What is the PH Assumption?</h3>
                <p>
                  The Cox model assumes the hazard ratio between groups is <strong>constant over time</strong>.
                  If this assumption is violated, the model may give misleading results.
                </p>
              </div>

              {/* Log-Log Survival Curves */}
              <div className="space-y-2">
                <h4 className="font-semibold">Method 1: Log-Log Survival Curves</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Under PH assumption, log(-log(S(t))) curves should be parallel.
                </p>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={km1.time.map((t, i) => ({
                      time: t,
                      loglog1: Math.log(-Math.log(Math.max(km1.survival[i], 0.001))),
                      loglog2: Math.log(-Math.log(Math.max(km2.survival[i] || 0.001, 0.001))),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'log(-log(S(t)))', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="loglog1" stroke="#3b82f6" name="Group 1" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="loglog2" stroke="#10b981" name="Group 2" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground">
                  If curves cross or diverge significantly, PH assumption may be violated.
                </p>
              </div>

              {/* Schoenfeld Residuals */}
              <div className="space-y-2 mt-6">
                <h4 className="font-semibold">Method 2: Schoenfeld Residuals</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Plot scaled Schoenfeld residuals against time. Should show no trend if PH holds.
                </p>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={schoenfelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Scaled Schoenfeld Residual', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Scatter dataKey="residual" fill="#3b82f6" name="Residuals" />
                      <Line type="monotone" dataKey="smoothed" stroke="#ef4444" name="Smoothed Trend" strokeWidth={2} dot={false} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground">
                  A trend in the smoothed line suggests time-varying effects (PH violation).
                </p>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <h4 className="font-semibold mb-2">What to Do if PH is Violated?</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Stratification:</strong> Stratify by the violating covariate</li>
                  <li>• <strong>Time interaction:</strong> Add interaction between covariate and time</li>
                  <li>• <strong>Time-dependent covariates:</strong> Model the covariate as changing over time</li>
                  <li>• <strong>Landmark analysis:</strong> Analyze from specific time points</li>
                  <li>• <strong>Accelerated failure time models:</strong> Use a different modeling framework</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interpretation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interpreting Hazard Ratios</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What is a Hazard Ratio?</h3>
              <p>
                The hazard ratio (HR) compares the <strong>instantaneous risk</strong> of an event
                between two groups or for a unit change in a continuous covariate.
              </p>

              <div className="bg-muted p-4 rounded not-prose">
                <p className="font-mono text-sm">HR = exp(β)</p>
                <p className="text-xs text-muted-foreground mt-2">
                  where β is the coefficient from the Cox model
                </p>
              </div>

              <h3>Interpretation Examples</h3>
              <div className="grid gap-4 not-prose">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="font-semibold">HR = 0.70 for Treatment vs Control</p>
                  <p className="text-sm mt-2">
                    Treatment reduces the hazard of death by 30% compared to control.
                    Patients on treatment have 70% the hazard (or risk) of the control group at any given time.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="font-semibold">HR = 1.22 for 10-year age increase</p>
                  <p className="text-sm mt-2">
                    For every 10-year increase in age, the hazard increases by 22%.
                    A 70-year-old has 1.22 times the hazard of a 60-year-old.
                  </p>
                </div>
              </div>

              <h3>Common Misinterpretations to Avoid</h3>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded not-prose">
                <ul className="text-sm space-y-2">
                  <li>
                    <strong>❌ Wrong:</strong> "HR = 0.70 means 70% reduction in mortality"<br/>
                    <strong>✓ Correct:</strong> "HR = 0.70 means 30% reduction in hazard"
                  </li>
                  <li>
                    <strong>❌ Wrong:</strong> "HR = 2.0 means twice the risk"<br/>
                    <strong>✓ Correct:</strong> "HR = 2.0 means twice the instantaneous hazard"
                  </li>
                  <li>
                    <strong>❌ Wrong:</strong> "HR tells us about survival probability"<br/>
                    <strong>✓ Correct:</strong> "HR tells us about the rate of events (hazard)"
                  </li>
                </ul>
              </div>

              <h3>Hazard ≠ Risk ≠ Odds</h3>
              <p>
                These are three different concepts that are often confused:
              </p>
              <ul>
                <li><strong>Hazard:</strong> Instantaneous rate of event occurrence</li>
                <li><strong>Risk:</strong> Probability of event by a specific time</li>
                <li><strong>Odds:</strong> Ratio of event probability to non-event probability</li>
              </ul>

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
