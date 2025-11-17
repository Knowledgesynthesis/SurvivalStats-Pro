import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Book, Activity, BarChart3, TrendingUp, GitBranch,
  Layers, Workflow, Brain, CheckCircle, ArrowRight
} from 'lucide-react'
import { useProgressStore } from '@/store/progressStore'

interface ModuleCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  path: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  topics: string[]
}

const modules: ModuleCard[] = [
  {
    id: 'foundations',
    title: 'Foundations of Survival Analysis',
    description: 'Learn the core concepts: time, events, censoring, survival functions, and hazard functions.',
    icon: <Book className="h-6 w-6" />,
    path: '/foundations',
    difficulty: 'Beginner',
    topics: ['Censoring', 'Survival Function', 'Hazard Function'],
  },
  {
    id: 'kaplan-meier',
    title: 'Kaplan-Meier Estimation',
    description: 'Master the construction of KM curves, confidence intervals, and log-rank tests.',
    icon: <Activity className="h-6 w-6" />,
    path: '/kaplan-meier',
    difficulty: 'Beginner',
    topics: ['KM Curves', 'Confidence Bands', 'Log-Rank Test'],
  },
  {
    id: 'cox-ph',
    title: 'Cox Proportional Hazards Model',
    description: 'Understand partial likelihood, hazard ratios, and proportional hazards assumptions.',
    icon: <BarChart3 className="h-6 w-6" />,
    path: '/cox-ph',
    difficulty: 'Intermediate',
    topics: ['Partial Likelihood', 'HR Interpretation', 'PH Diagnostics'],
  },
  {
    id: 'parametric',
    title: 'Parametric Survival Models',
    description: 'Explore exponential, Weibull, and other parametric distributions for survival data.',
    icon: <TrendingUp className="h-6 w-6" />,
    path: '/parametric',
    difficulty: 'Intermediate',
    topics: ['Exponential', 'Weibull', 'AFT Models'],
  },
  {
    id: 'competing-risks',
    title: 'Competing Risks Analysis',
    description: 'Learn cumulative incidence functions and subdistribution hazards (Fine-Gray).',
    icon: <GitBranch className="h-6 w-6" />,
    path: '/competing-risks',
    difficulty: 'Advanced',
    topics: ['CIF', 'Cause-Specific Hazard', 'Fine-Gray'],
  },
  {
    id: 'landmark',
    title: 'Landmark Analysis',
    description: 'Understand dynamic prediction and time-dependent covariates through landmarking.',
    icon: <Layers className="h-6 w-6" />,
    path: '/landmark',
    difficulty: 'Advanced',
    topics: ['Landmarking', 'Dynamic Prediction', 'Time-Varying Risk'],
  },
  {
    id: 'multi-state',
    title: 'Multi-State Models',
    description: 'Model complex disease trajectories with multiple states and transitions.',
    icon: <Workflow className="h-6 w-6" />,
    path: '/multi-state',
    difficulty: 'Advanced',
    topics: ['Transition Intensities', 'Illness-Death', 'State Diagrams'],
  },
  {
    id: 'ml-concepts',
    title: 'Machine Learning for Survival',
    description: 'Conceptual overview of RSF, CoxNet, and deep learning approaches.',
    icon: <Brain className="h-6 w-6" />,
    path: '/ml-concepts',
    difficulty: 'Advanced',
    topics: ['Random Survival Forests', 'CoxNet', 'DeepSurv'],
  },
]

export const HomePage: React.FC = () => {
  const { getModuleProgress, getTotalProgress } = useProgressStore()
  const totalProgress = getTotalProgress()

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Welcome to SurvivalStats Pro
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          The Complete Time-to-Event Analysis Learning Lab
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A comprehensive, deeply visual, simulation-driven environment that teaches all statistical
          methods relating to survival analysis, from beginner to advanced, using only synthetic datasets.
        </p>

        {totalProgress > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-3">
              <div className="text-sm text-muted-foreground">Overall Progress</div>
              <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <div className="text-sm font-medium">{Math.round(totalProgress)}%</div>
            </div>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="flex flex-wrap gap-3 justify-center">
        <Link to="/assessment">
          <Button variant="default">
            <CheckCircle className="mr-2 h-4 w-4" />
            Take Assessment
          </Button>
        </Link>
        <Link to="/glossary">
          <Button variant="outline">View Glossary</Button>
        </Link>
      </section>

      {/* Module Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Learning Modules</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const progress = getModuleProgress(module.id)
            const isCompleted = progress?.completed || false

            return (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {module.icon}
                    </div>
                    {isCompleted && (
                      <Badge variant="success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <Badge variant="outline">{module.difficulty}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {module.topics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  <Link to={module.path}>
                    <Button className="w-full" variant="outline">
                      Start Learning
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Educational Philosophy */}
      <section className="mt-12 p-6 rounded-lg bg-muted/50">
        <h2 className="text-2xl font-bold mb-4">Our Educational Philosophy</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Interactive Learning</h3>
            <p className="text-sm text-muted-foreground">
              Manipulate parameters, visualize results, and build intuition through hands-on exploration.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Statistical Rigor</h3>
            <p className="text-sm text-muted-foreground">
              All methods are implemented following canonical textbook formulations with zero statistical hallucinations.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Clinical Relevance</h3>
            <p className="text-sm text-muted-foreground">
              Learn to interpret results in clinical contexts and understand common pitfalls in survival analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="text-center text-sm text-muted-foreground p-4 border rounded-lg">
        <p>
          <strong>Educational Use Only:</strong> All data in this application is completely synthetic
          and generated for educational purposes. This tool is not intended for clinical decision support
          or real-world predictions.
        </p>
      </section>
    </div>
  )
}
