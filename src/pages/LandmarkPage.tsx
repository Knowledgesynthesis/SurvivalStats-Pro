import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useProgressStore } from '@/store/progressStore'
import { generateExponentialData } from '@/lib/dataGenerators'
import { calculateKaplanMeier } from '@/lib/survivalAnalysis'

const MODULE_ID = 'landmark'

export const LandmarkPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()
  const [landmarkTime, setLandmarkTime] = useState(10)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  const allData = generateExponentialData(200, 0.06, 0.3, refreshKey)
  const landmarkData = allData.filter(d => d.time >= landmarkTime).map(d => ({
    ...d,
    time: d.time - landmarkTime,
  }))

  const kmAll = calculateKaplanMeier(allData)
  const kmLandmark = calculateKaplanMeier(landmarkData)

  const chartData = kmLandmark.time.map((t, i) => ({
    time: t + landmarkTime,
    survival: kmLandmark.survival[i],
    nRisk: kmLandmark.nRisk[i],
  }))

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Landmark Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Dynamic prediction and handling time-dependent covariates through landmarking.
        </p>
      </div>

      <Tabs defaultValue="interactive">
        <TabsList>
          <TabsTrigger value="interactive">Landmark Visualizer</TabsTrigger>
          <TabsTrigger value="theory">Theory & Use Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Landmark Analysis</CardTitle>
              <CardDescription>
                Select a landmark time to see survival from that point forward.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <Slider
                  label="Landmark Time"
                  value={landmarkTime}
                  onChange={setLandmarkTime}
                  min={0}
                  max={30}
                  step={1}
                />
                <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
                  Regenerate Data
                </Button>
              </div>

              <div className="w-full h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[0, 1]} label={{ value: 'Survival Probability', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine x={landmarkTime} stroke="red" strokeDasharray="3 3" label="Landmark" />
                    <Line type="stepAfter" dataKey="survival" stroke="#3b82f6" strokeWidth={2} dot={false} name="Survival from Landmark" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Subjects at Landmark Time</h4>
                  <p className="text-3xl font-mono">{landmarkData.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allData.length - landmarkData.length} subjects excluded (events before landmark)
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Purpose</h4>
                  <p className="text-sm text-muted-foreground">
                    Estimate survival for patients who have already survived to the landmark time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Landmark Analysis: Theory & Applications</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What is Landmark Analysis?</h3>
              <p>
                Landmark analysis estimates survival from a specific time point (the "landmark"),
                including only subjects who survived to that point. This addresses several important issues:
              </p>

              <ul>
                <li><strong>Guarantee-time bias:</strong> Avoiding bias from covariates that require survival to a certain time</li>
                <li><strong>Dynamic prediction:</strong> Updating predictions as patients survive longer</li>
                <li><strong>Time-dependent treatments:</strong> Handling treatments that start after baseline</li>
              </ul>

              <h3>Common Use Cases</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-semibold mb-2">Response-Based Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Comparing survival between responders and non-responders to treatment,
                    where response is assessed at a specific time.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-semibold mb-2">Dynamic Risk Prediction</h4>
                  <p className="text-sm text-muted-foreground">
                    Providing updated survival estimates for patients who have survived
                    to milestone time points (e.g., 1-year, 5-year survivors).
                  </p>
                </div>
              </div>

              <h3>Guarantee-Time Bias Example</h3>
              <p>
                Suppose we want to compare survival between patients who achieve complete remission
                vs those who don't. Patients must survive long enough to achieve remission, creating
                <strong> immortal time bias</strong> if we analyze from baseline.
              </p>

              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded not-prose">
                <p className="text-sm font-semibold mb-2">❌ WRONG: Analyze from baseline</p>
                <p className="text-sm">Remission group artificially has better survival because they had to survive to achieve remission</p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded not-prose mt-2">
                <p className="text-sm font-semibold mb-2">✓ CORRECT: Landmark analysis</p>
                <p className="text-sm">Set landmark at time remission is assessed (e.g., 3 months). Compare survival from that point forward.</p>
              </div>

              <h3>Landmark vs Time-Dependent Cox</h3>
              <div className="grid md:grid-cols-2 gap-4 not-prose">
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Landmark Analysis</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Simpler to implement and explain</li>
                    <li>• Clinically intuitive</li>
                    <li>• Single time point</li>
                    <li>• Loses some efficiency</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-2">Time-Dependent Cox</h4>
                  <ul className="text-sm space-y-1">
                    <li>• More complex</li>
                    <li>• Uses all data continuously</li>
                    <li>• More statistical power</li>
                    <li>• Requires careful setup</li>
                  </ul>
                </div>
              </div>

              <h3>Multiple Landmarks</h3>
              <p>
                Often, multiple landmark analyses are performed (e.g., at 6 months, 12 months, 24 months)
                to provide a comprehensive picture of how prognosis changes over time.
              </p>

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
