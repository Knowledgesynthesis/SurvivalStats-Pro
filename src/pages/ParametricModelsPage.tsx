import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useProgressStore } from '@/store/progressStore'
import { exponentialSurvival, weibullSurvival, weibullHazard } from '@/lib/survivalAnalysis'

const MODULE_ID = 'parametric'

export const ParametricModelsPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  const [lambda, setLambda] = useState(0.1)
  const [weibullK, setWeibullK] = useState(1.5)
  const [timeRange, setTimeRange] = useState(50)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  // Generate parametric survival curves
  const generateCurves = () => {
    const data = []
    for (let t = 0.1; t <= timeRange; t += 0.5) {
      const exponential = exponentialSurvival(t, lambda)
      const weibullIncreasing = weibullSurvival(t, lambda, 2) // k > 1: increasing hazard
      const weibullDecreasing = weibullSurvival(t, lambda, 0.8) // k < 1: decreasing hazard
      const weibullConstant = weibullSurvival(t, lambda, 1) // k = 1: exponential

      const expHazard = lambda
      const weibHazInc = weibullHazard(t, lambda, 2)
      const weibHazDec = weibullHazard(t, lambda, 0.8)

      data.push({
        time: t,
        exponential,
        weibullIncreasing,
        weibullDecreasing,
        weibullConstant,
        expHazard,
        weibHazInc,
        weibHazDec,
      })
    }
    return data
  }

  const curveData = generateCurves()

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parametric Survival Models</h1>
        <p className="text-muted-foreground mt-2">
          Explore exponential, Weibull, and other parametric distributions for survival data.
        </p>
      </div>

      <Tabs defaultValue="distributions">
        <TabsList>
          <TabsTrigger value="distributions">Distributions Playground</TabsTrigger>
          <TabsTrigger value="aft">AFT Models</TabsTrigger>
          <TabsTrigger value="comparison">Parametric vs Cox</TabsTrigger>
        </TabsList>

        <TabsContent value="distributions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parametric Distributions Explorer</CardTitle>
              <CardDescription>
                Compare different parametric survival distributions and their hazard functions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Scale Parameter (λ)"
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

              <div className="grid md:grid-cols-2 gap-6">
                {/* Survival Functions */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Survival Functions</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="exponential" stroke="#3b82f6" name="Exponential" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibullIncreasing" stroke="#ef4444" name="Weibull (k=2, increasing hazard)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibullDecreasing" stroke="#10b981" name="Weibull (k=0.8, decreasing hazard)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hazard Functions */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Hazard Functions</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={curveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="expHazard" stroke="#3b82f6" name="Exponential (constant)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibHazInc" stroke="#ef4444" name="Weibull (k>1, increasing)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="weibHazDec" stroke="#10b981" name="Weibull (k<1, decreasing)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Exponential</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    S(t) = exp(-λt)
                  </p>
                  <p className="text-xs">
                    • Constant hazard rate<br/>
                    • Memoryless property<br/>
                    • Simplest model
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <h4 className="font-semibold mb-2">Weibull (k &gt; 1)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Increasing hazard over time
                  </p>
                  <p className="text-xs">
                    • Wear-out failures<br/>
                    • Cancer progression<br/>
                    • Aging effects
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-2">Weibull (k &lt; 1)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Decreasing hazard over time
                  </p>
                  <p className="text-xs">
                    • Infant mortality<br/>
                    • Early treatment effects<br/>
                    • Survivor selection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aft" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accelerated Failure Time (AFT) Models</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What is an AFT Model?</h3>
              <p>
                Unlike the Cox model (which models hazard ratios), AFT models assume that covariates
                <strong> accelerate or decelerate</strong> the passage of time.
              </p>

              <div className="bg-muted p-4 rounded not-prose">
                <p className="font-mono text-sm">log(T) = μ + β₁X₁ + β₂X₂ + ... + σε</p>
                <p className="text-xs text-muted-foreground mt-2">
                  where T is survival time, μ is intercept, β are coefficients, σ is scale, and ε is error
                </p>
              </div>

              <h3>Interpretation of AFT Coefficients</h3>
              <p>
                In an AFT model, exp(β) is called the <strong>acceleration factor</strong>:
              </p>
              <ul>
                <li>exp(β) &gt; 1: Covariate <strong>prolongs</strong> survival time</li>
                <li>exp(β) &lt; 1: Covariate <strong>shortens</strong> survival time</li>
                <li>exp(β) = 1.5 means survival time is multiplied by 1.5</li>
              </ul>

              <h3>Common AFT Distributions</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Log-Logistic</h4>
                  <p className="text-sm text-muted-foreground">
                    • Non-monotonic hazard (can increase then decrease)<br/>
                    • Useful for modeling treatments with early effects that diminish over time
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Log-Normal</h4>
                  <p className="text-sm text-muted-foreground">
                    • Hazard increases then decreases<br/>
                    • Suitable when log(survival time) is normally distributed
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Weibull</h4>
                  <p className="text-sm text-muted-foreground">
                    • Both PH and AFT formulation<br/>
                    • Flexible: monotonic increasing or decreasing hazard
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Exponential</h4>
                  <p className="text-sm text-muted-foreground">
                    • Both PH and AFT formulation<br/>
                    • Constant hazard assumption
                  </p>
                </div>
              </div>

              <h3>AFT vs Proportional Hazards</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">AFT Model</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Models effect on <strong>survival time</strong></li>
                    <li>• Easier clinical interpretation</li>
                    <li>• Requires parametric assumption</li>
                    <li>• "Treatment extends life by X months"</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-2">Cox PH Model</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Models effect on <strong>hazard rate</strong></li>
                    <li>• Semi-parametric (more flexible)</li>
                    <li>• Requires PH assumption</li>
                    <li>• "Treatment reduces hazard by X%"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>When to Use Parametric vs Semi-Parametric Models</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Advantages of Parametric Models</h3>
              <ul>
                <li><strong>Extrapolation:</strong> Can predict beyond observed data</li>
                <li><strong>Efficiency:</strong> More powerful when distribution is correct</li>
                <li><strong>Direct interpretation:</strong> Can estimate median survival, percentiles</li>
                <li><strong>Flexible hazards:</strong> Can model non-monotonic hazards (log-logistic)</li>
              </ul>

              <h3>Advantages of Cox Model</h3>
              <ul>
                <li><strong>No distributional assumption:</strong> Robust to misspecification</li>
                <li><strong>Widely accepted:</strong> Standard in clinical trials</li>
                <li><strong>Handles ties easily:</strong> No special handling needed</li>
                <li><strong>Partial likelihood:</strong> Baseline hazard doesn't need specification</li>
              </ul>

              <h3>Model Selection Strategy</h3>
              <div className="bg-muted p-4 rounded not-prose">
                <ol className="text-sm space-y-2">
                  <li><strong>1. Explore data visually</strong> — Plot KM curves and hazard estimates</li>
                  <li><strong>2. Consider clinical knowledge</strong> — Does hazard increase/decrease over time?</li>
                  <li><strong>3. Fit multiple models</strong> — Compare exponential, Weibull, log-logistic, Cox</li>
                  <li><strong>4. Check model fit</strong> — Use AIC, BIC, residual plots</li>
                  <li><strong>5. Sensitivity analysis</strong> — Do conclusions change across models?</li>
                </ol>
              </div>

              <h3>Model Comparison Metrics</h3>
              <ul>
                <li><strong>AIC (Akaike Information Criterion):</strong> Lower is better, penalizes complexity</li>
                <li><strong>BIC (Bayesian Information Criterion):</strong> Lower is better, stronger complexity penalty</li>
                <li><strong>Likelihood ratio test:</strong> Compare nested models</li>
                <li><strong>Visual diagnostics:</strong> Cox-Snell residuals, QQ plots</li>
              </ul>

              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded not-prose">
                <h4 className="font-semibold mb-2">Practical Advice</h4>
                <p className="text-sm">
                  Start with the Cox model for initial exploration. If you need to extrapolate survival
                  beyond observed times or if hazard shape is clear from data and clinical knowledge,
                  consider parametric models. Always validate assumptions and perform sensitivity analyses.
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
