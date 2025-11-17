import React, { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useProgressStore } from '@/store/progressStore'

const MODULE_ID = 'multi-state'

export const MultiStatePage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Multi-State Models</h1>
        <p className="text-muted-foreground mt-2">
          Model complex disease trajectories with multiple states and transitions.
        </p>
      </div>

      <Tabs defaultValue="intro">
        <TabsList>
          <TabsTrigger value="intro">Introduction</TabsTrigger>
          <TabsTrigger value="examples">Common Models</TabsTrigger>
        </TabsList>

        <TabsContent value="intro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-State Models: An Overview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>What are Multi-State Models?</h3>
              <p>
                Multi-state models extend survival analysis to situations where subjects can transition
                through multiple states over time. Instead of just "alive" vs "dead," we can model
                intermediate disease states, treatment responses, and complex trajectories.
              </p>

              <h3>Key Components</h3>
              <ul>
                <li><strong>States:</strong> Distinct health conditions (e.g., healthy, diseased, dead)</li>
                <li><strong>Transitions:</strong> Movements between states</li>
                <li><strong>Transition intensities:</strong> Hazards of moving from one state to another</li>
                <li><strong>Transition probabilities:</strong> Probability of being in a state at time t given starting state</li>
              </ul>

              <h3>Simple Example: Three-State Illness-Death Model</h3>
              <div className="bg-muted p-6 rounded not-prose my-4">
                <svg viewBox="0 0 400 200" className="w-full max-w-md mx-auto">
                  <circle cx="80" cy="100" r="40" fill="hsl(var(--primary))" opacity="0.2" stroke="hsl(var(--primary))" strokeWidth="2"/>
                  <text x="80" y="105" textAnchor="middle" className="fill-foreground font-semibold">Healthy</text>

                  <circle cx="240" cy="100" r="40" fill="hsl(217 91% 60%)" opacity="0.2" stroke="hsl(217 91% 60%)" strokeWidth="2"/>
                  <text x="240" y="105" textAnchor="middle" className="fill-foreground font-semibold">Diseased</text>

                  <circle cx="320" cy="100" r="40" fill="hsl(0 84% 60%)" opacity="0.2" stroke="hsl(0 84% 60%)" strokeWidth="2"/>
                  <text x="320" y="105" textAnchor="middle" className="fill-foreground font-semibold">Dead</text>

                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
                    </marker>
                  </defs>

                  <line x1="120" y1="100" x2="200" y2="100" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                  <text x="160" y="90" textAnchor="middle" className="fill-foreground text-xs">h₁₂</text>

                  <line x1="280" y1="100" x2="280" y2="100" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)"/>
                  <text x="300" y="90" textAnchor="middle" className="fill-foreground text-xs">h₂₃</text>

                  <path d="M 80 60 Q 200 20 320 60" stroke="hsl(var(--foreground))" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                  <text x="200" y="25" textAnchor="middle" className="fill-foreground text-xs">h₁₃</text>
                </svg>
              </div>

              <h3>Transition Intensities</h3>
              <p>
                The transition intensity h<sub>rs</sub>(t) represents the hazard of moving from state r to state s at time t.
                These can be modeled using Cox-type models:
              </p>

              <div className="bg-muted p-4 rounded not-prose">
                <p className="font-mono text-sm">h<sub>rs</sub>(t|X) = h<sub>rs,0</sub>(t) * exp(β<sub>rs</sub>&apos;X)</p>
              </div>

              <h3>Applications</h3>
              <ul>
                <li>Disease progression models (remission → relapse → death)</li>
                <li>Chronic disease with acute events (stable → acute event → recovery → death)</li>
                <li>Transplant models (waiting → transplant → graft failure/death)</li>
                <li>Hospital readmission models</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Common Multi-State Models</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>1. Progressive Models</h3>
              <p>
                Subjects can only move forward through states (no recovery).
              </p>
              <div className="bg-muted p-4 rounded not-prose">
                <p className="text-sm">Example: Cancer staging</p>
                <p className="text-sm font-mono">Stage I → Stage II → Stage III → Stage IV → Death</p>
              </div>

              <h3>2. Illness-Death Models</h3>
              <p>
                Three-state model with an initial state, diseased state, and absorbing death state.
                Allows direct transition from healthy to death.
              </p>

              <h3>3. Competing Risks as Multi-State</h3>
              <p>
                Competing risks can be viewed as a multi-state model with one initial state and
                multiple absorbing states (one for each event type).
              </p>

              <h3>4. Recurrent Events Models</h3>
              <p>
                Models where subjects can experience the same event multiple times, possibly
                returning to an "at risk" state after each event.
              </p>

              <h3>Statistical Challenges</h3>
              <ul>
                <li><strong>Interval censoring:</strong> Transitions may occur between observation times</li>
                <li><strong>Markov assumption:</strong> Future transitions depend only on current state, not history</li>
                <li><strong>Semi-Markov models:</strong> Allow transition intensities to depend on time since entry to current state</li>
                <li><strong>Estimation complexity:</strong> Multiple hazards to estimate simultaneously</li>
              </ul>

              <h3>Software and Implementation</h3>
              <p>
                Multi-state models require specialized software:
              </p>
              <ul>
                <li>R: <code>mstate</code>, <code>msm</code> packages</li>
                <li>SAS: PROC PHREG with time-dependent covariates</li>
                <li>Stata: <code>stmm</code>, <code>multistate</code></li>
              </ul>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded not-prose">
                <h4 className="font-semibold mb-2">Educational Note</h4>
                <p className="text-sm">
                  Multi-state modeling is an advanced topic. In practice, careful consideration of
                  the clinical question and model assumptions is crucial. Simpler competing risks
                  or landmark analyses may be more appropriate depending on the research question.
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
