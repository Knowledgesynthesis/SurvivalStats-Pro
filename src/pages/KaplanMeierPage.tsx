import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { generateExponentialData, generateTwoGroupData } from '@/lib/dataGenerators'
import { calculateKaplanMeier, logRankTest } from '@/lib/survivalAnalysis'
import { useProgressStore } from '@/store/progressStore'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, AlertCircle } from 'lucide-react'

const MODULE_ID = 'kaplan-meier'

export const KaplanMeierPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  // Interactive controls
  const [sampleSize, setSampleSize] = useState(100)
  const [hazardRate, setHazardRate] = useState(0.05)
  const [censoringRate, setCensoringRate] = useState(0.3)
  const [showCI, setShowCI] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Two-group comparison
  const [hazardRate1, setHazardRate1] = useState(0.05)
  const [hazardRate2, setHazardRate2] = useState(0.08)

  // Results
  const [kmData, setKmData] = useState<any[]>([])
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const [logRankResult, setLogRankResult] = useState<any>(null)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  useEffect(() => {
    // Generate single KM curve
    const data = generateExponentialData(sampleSize, hazardRate, censoringRate, refreshKey)
    const km = calculateKaplanMeier(data)

    const chartData = km.time.map((t, i) => ({
      time: t,
      survival: km.survival[i],
      lower: km.confidenceLower?.[i],
      upper: km.confidenceUpper?.[i],
      nRisk: km.nRisk[i],
      nEvent: km.nEvent[i],
    }))

    setKmData(chartData)

    // Generate two-group comparison
    const { group1, group2 } = generateTwoGroupData(50, 50, hazardRate1, hazardRate2, 0.2, refreshKey + 100)
    const km1 = calculateKaplanMeier(group1)
    const km2 = calculateKaplanMeier(group2)

    // Combine for visualization
    const maxLength = Math.max(km1.time.length, km2.time.length)
    const combined = []

    for (let i = 0; i < maxLength; i++) {
      combined.push({
        time: Math.max(km1.time[i] || 0, km2.time[i] || 0),
        group1: km1.survival[i] !== undefined ? km1.survival[i] : null,
        group2: km2.survival[i] !== undefined ? km2.survival[i] : null,
      })
    }

    setComparisonData(combined)

    // Calculate log-rank test
    const lrTest = logRankTest(group1, group2)
    setLogRankResult(lrTest)
  }, [sampleSize, hazardRate, censoringRate, hazardRate1, hazardRate2, refreshKey])

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kaplan-Meier Estimation</h1>
        <p className="text-muted-foreground mt-2">
          Master the construction of survival curves, confidence intervals, and comparison between groups.
        </p>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">KM Curve Builder</TabsTrigger>
          <TabsTrigger value="comparison">Group Comparison</TabsTrigger>
          <TabsTrigger value="theory">Theory & Concepts</TabsTrigger>
        </TabsList>

        {/* KM Curve Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Kaplan-Meier Curve Builder</CardTitle>
              <CardDescription>
                Adjust parameters to see how sample size, hazard rate, and censoring affect the KM curve.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Controls */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Sample Size"
                  value={sampleSize}
                  onChange={setSampleSize}
                  min={20}
                  max={500}
                  step={10}
                />

                <Slider
                  label="Hazard Rate (λ)"
                  value={hazardRate}
                  onChange={setHazardRate}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                />

                <Slider
                  label="Censoring Rate"
                  value={censoringRate}
                  onChange={setCensoringRate}
                  min={0}
                  max={0.7}
                  step={0.05}
                />

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCI}
                      onChange={(e) => setShowCI(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Show 95% Confidence Interval</span>
                  </label>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefreshKey(k => k + 1)}
                  >
                    Regenerate Data
                  </Button>
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kmData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      label={{ value: 'Survival Probability', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-background border rounded p-3 shadow-lg">
                              <p className="font-semibold">Time: {data.time.toFixed(2)}</p>
                              <p className="text-primary">Survival: {data.survival.toFixed(3)}</p>
                              {showCI && (
                                <p className="text-xs text-muted-foreground">
                                  95% CI: [{data.lower?.toFixed(3)}, {data.upper?.toFixed(3)}]
                                </p>
                              )}
                              <p className="text-xs">At Risk: {data.nRisk}</p>
                              <p className="text-xs">Events: {data.nEvent}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Line
                      type="stepAfter"
                      dataKey="survival"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Survival Probability"
                    />
                    {showCI && (
                      <>
                        <Line
                          type="stepAfter"
                          dataKey="lower"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Lower 95% CI"
                        />
                        <Line
                          type="stepAfter"
                          dataKey="upper"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Upper 95% CI"
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Key Observations */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Key Observations
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• The curve is a step function that drops at each event time</li>
                  <li>• Higher censoring creates wider confidence intervals (more uncertainty)</li>
                  <li>• Larger sample sizes produce smoother, more reliable curves</li>
                  <li>• The curve never increases — survival can only stay the same or decrease</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Group Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log-Rank Test: Comparing Two Survival Curves</CardTitle>
              <CardDescription>
                Compare survival between two groups and perform the log-rank test for statistical significance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Controls */}
              <div className="grid md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Group 1 (Control)</h4>
                  <Slider
                    label="Hazard Rate (λ₁)"
                    value={hazardRate1}
                    onChange={setHazardRate1}
                    min={0.01}
                    max={0.15}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Group 2 (Treatment)</h4>
                  <Slider
                    label="Hazard Rate (λ₂)"
                    value={hazardRate2}
                    onChange={setHazardRate2}
                    min={0.01}
                    max={0.15}
                    step={0.01}
                  />
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      label={{ value: 'Survival Probability', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="stepAfter"
                      dataKey="group1"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Group 1 (Control)"
                    />
                    <Line
                      type="stepAfter"
                      dataKey="group2"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Group 2 (Treatment)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Log-Rank Test Results */}
              {logRankResult && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-semibold">Log-Rank Test Results</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Chi-Square Statistic</p>
                      <p className="text-lg font-mono">{logRankResult.chiSquare.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">P-Value</p>
                      <p className="text-lg font-mono">{logRankResult.pValue.toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {logRankResult.pValue < 0.05 ? (
                      <Badge variant="success" className="text-sm">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Statistically Significant (p &lt; 0.05)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-sm">
                        Not Statistically Significant (p ≥ 0.05)
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The log-rank test compares the overall survival experience between groups.
                    A p-value &lt; 0.05 suggests the survival curves are significantly different.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theory Tab */}
        <TabsContent value="theory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theory & Key Concepts</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What is the Kaplan-Meier Estimator?</h3>
              <p>
                The Kaplan-Meier (KM) estimator is a non-parametric method for estimating the survival
                function from lifetime data. It handles censored observations elegantly by only updating
                the survival probability at observed event times.
              </p>

              <h3>The KM Formula</h3>
              <p>
                At each event time t<sub>i</sub>, the survival probability is calculated as:
              </p>
              <div className="bg-muted p-4 rounded font-mono text-sm">
                S(t) = ∏<sub>i: t<sub>i</sub> ≤ t</sub> (n<sub>i</sub> - d<sub>i</sub>) / n<sub>i</sub>
              </div>
              <p className="text-sm text-muted-foreground">
                Where n<sub>i</sub> is the number at risk and d<sub>i</sub> is the number of events at time t<sub>i</sub>.
              </p>

              <h3>Confidence Intervals: Greenwood's Formula</h3>
              <p>
                The variance of the KM estimator is calculated using Greenwood's formula:
              </p>
              <div className="bg-muted p-4 rounded font-mono text-sm">
                Var[S(t)] = S(t)² × ∑<sub>i: t<sub>i</sub> ≤ t</sub> d<sub>i</sub> / (n<sub>i</sub> × (n<sub>i</sub> - d<sub>i</sub>))
              </div>

              <h3>The Log-Rank Test</h3>
              <p>
                The log-rank test compares survival curves between groups. It tests the null hypothesis
                that there is no difference in survival between groups across all time points.
              </p>

              <h3>Clinical Interpretation</h3>
              <ul>
                <li><strong>Median Survival:</strong> The time at which S(t) = 0.5</li>
                <li><strong>5-Year Survival:</strong> The value of S(t) at t = 5 years</li>
                <li><strong>Censoring:</strong> Represented by tick marks on KM curves</li>
              </ul>

              <h3>Common Pitfalls</h3>
              <ul>
                <li>Don't compare KM curves at single time points — use the log-rank test for overall comparison</li>
                <li>Heavy censoring at late time points creates wide confidence intervals</li>
                <li>The KM curve assumes non-informative censoring</li>
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
