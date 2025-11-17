import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Search } from 'lucide-react'

interface GlossaryTerm {
  term: string
  definition: string
  category: string
  relatedTerms?: string[]
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Censoring',
    definition: 'Incomplete observation of the event time. Right censoring occurs when the event has not occurred by the end of observation. Left censoring occurs when the event happened before observation began. Interval censoring means the event occurred within a known time interval.',
    category: 'Foundations',
    relatedTerms: ['Right Censoring', 'Informative Censoring'],
  },
  {
    term: 'Survival Function',
    definition: 'S(t) = P(T > t), the probability of surviving beyond time t. The survival function is monotonically decreasing from 1 at t=0 to 0 as t approaches infinity.',
    category: 'Foundations',
    relatedTerms: ['Hazard Function', 'Cumulative Hazard'],
  },
  {
    term: 'Hazard Function',
    definition: 'h(t) = lim[P(t ≤ T < t+Δt | T ≥ t) / Δt] as Δt→0. The instantaneous rate of event occurrence at time t, given survival to time t. Also called the hazard rate or intensity function.',
    category: 'Foundations',
    relatedTerms: ['Cumulative Hazard', 'Survival Function'],
  },
  {
    term: 'Cumulative Hazard',
    definition: 'H(t) = ∫₀ᵗ h(u)du, the integral of the hazard function from 0 to t. Related to survival via S(t) = exp(-H(t)). Estimated by the Nelson-Aalen estimator.',
    category: 'Foundations',
    relatedTerms: ['Nelson-Aalen', 'Hazard Function'],
  },
  {
    term: 'Kaplan-Meier Estimator',
    definition: 'A non-parametric method for estimating the survival function from censored data. Calculates survival probability as the product of conditional probabilities at each event time.',
    category: 'Kaplan-Meier',
    relatedTerms: ['Survival Function', 'Log-Rank Test'],
  },
  {
    term: 'Log-Rank Test',
    definition: 'A non-parametric hypothesis test comparing survival distributions between two or more groups. Tests the null hypothesis that there is no difference in survival across groups.',
    category: 'Kaplan-Meier',
    relatedTerms: ['Kaplan-Meier Estimator', 'Hazard Ratio'],
  },
  {
    term: 'Hazard Ratio',
    definition: 'HR = exp(β), the ratio of hazards comparing two groups or for a unit change in a covariate. HR < 1 indicates protective effect; HR > 1 indicates increased risk. IMPORTANT: HR ≠ Risk Ratio.',
    category: 'Cox PH',
    relatedTerms: ['Cox Model', 'Proportional Hazards'],
  },
  {
    term: 'Proportional Hazards',
    definition: 'The assumption that the hazard ratio comparing groups is constant over time. If h₁(t)/h₂(t) = θ for all t, where θ is constant, the proportional hazards assumption holds.',
    category: 'Cox PH',
    relatedTerms: ['Cox Model', 'Schoenfeld Residuals'],
  },
  {
    term: 'Cox Proportional Hazards Model',
    definition: 'A semi-parametric regression model for survival data: h(t|X) = h₀(t)exp(βᵀX). Models the effect of covariates on the hazard without specifying the baseline hazard h₀(t).',
    category: 'Cox PH',
    relatedTerms: ['Proportional Hazards', 'Partial Likelihood'],
  },
  {
    term: 'Schoenfeld Residuals',
    definition: 'Residuals used to check the proportional hazards assumption in Cox models. Plotting scaled Schoenfeld residuals against time and looking for trends indicates PH violations.',
    category: 'Cox PH',
    relatedTerms: ['Proportional Hazards', 'Cox Model'],
  },
  {
    term: 'Partial Likelihood',
    definition: 'The likelihood function used in Cox regression that considers only the ordering of events, not the baseline hazard. Allows estimation of covariate effects without specifying h₀(t).',
    category: 'Cox PH',
    relatedTerms: ['Cox Model'],
  },
  {
    term: 'Weibull Distribution',
    definition: 'A parametric survival distribution with hazard h(t) = λkᵏtᵏ⁻¹. When k=1, reduces to exponential. k>1 gives increasing hazard; k<1 gives decreasing hazard.',
    category: 'Parametric',
    relatedTerms: ['Exponential Distribution', 'AFT Models'],
  },
  {
    term: 'Exponential Distribution',
    definition: 'The simplest parametric survival distribution with constant hazard λ. Survival function: S(t) = exp(-λt). Has the memoryless property.',
    category: 'Parametric',
    relatedTerms: ['Weibull Distribution', 'Parametric Models'],
  },
  {
    term: 'AFT Models',
    definition: 'Accelerated Failure Time models assume covariates affect the rate of time passage: log(T) = μ + βᵀX + σε. Coefficients represent effects on survival time (not hazard).',
    category: 'Parametric',
    relatedTerms: ['Weibull Distribution', 'Parametric Models'],
  },
  {
    term: 'Competing Risks',
    definition: 'Situation where subjects can experience one of several mutually exclusive events, and occurrence of one event prevents others. Requires special methods like CIF and Fine-Gray model.',
    category: 'Competing Risks',
    relatedTerms: ['CIF', 'Fine-Gray Model'],
  },
  {
    term: 'Cumulative Incidence Function',
    definition: 'CIF(t) = P(T ≤ t, J=j), the probability of experiencing event type j by time t in the presence of competing risks. Correctly accounts for competing events (unlike 1-KM).',
    category: 'Competing Risks',
    relatedTerms: ['Competing Risks', 'Subdistribution Hazard'],
  },
  {
    term: 'Cause-Specific Hazard',
    definition: 'The hazard of event type j among those still at risk (no event yet). Treats competing events as censored. Used in etiologic research.',
    category: 'Competing Risks',
    relatedTerms: ['Competing Risks', 'Subdistribution Hazard'],
  },
  {
    term: 'Subdistribution Hazard',
    definition: 'The hazard for the cumulative incidence function. Keeps subjects who experienced competing events in the risk set. Used in Fine-Gray model for prediction.',
    category: 'Competing Risks',
    relatedTerms: ['CIF', 'Fine-Gray Model'],
  },
  {
    term: 'Fine-Gray Model',
    definition: 'Regression model for subdistribution hazard in competing risks: h*ⱼ(t|X) = h*₀ⱼ(t)exp(βᵀX). Allows covariate-adjusted estimation of CIF.',
    category: 'Competing Risks',
    relatedTerms: ['Competing Risks', 'Subdistribution Hazard'],
  },
  {
    term: 'Landmark Analysis',
    definition: 'Survival analysis from a specific time point (landmark), including only subjects who survived to that point. Addresses guarantee-time bias and allows dynamic prediction.',
    category: 'Advanced',
    relatedTerms: ['Guarantee-Time Bias', 'Time-Dependent Covariates'],
  },
  {
    term: 'Multi-State Model',
    definition: 'Extension of survival analysis to multiple states and transitions. Models complex disease trajectories with intermediate states between baseline and terminal events.',
    category: 'Advanced',
    relatedTerms: ['Transition Intensities', 'Illness-Death Model'],
  },
  {
    term: 'C-Index',
    definition: 'Concordance index: probability that predictions are correctly ordered for random pairs. Generalizes AUC to censored survival data. Range: 0.5 (random) to 1.0 (perfect).',
    category: 'Validation',
    relatedTerms: ['Time-Dependent AUC', 'Brier Score'],
  },
  {
    term: 'Brier Score',
    definition: 'Mean squared error between predicted survival probabilities and actual outcomes: BS(t) = (1/n)Σ[S(t|X) - I(T>t)]². Lower is better. Assesses calibration and discrimination.',
    category: 'Validation',
    relatedTerms: ['C-Index', 'Calibration'],
  },
  {
    term: 'Calibration',
    definition: 'Agreement between predicted and observed probabilities. A well-calibrated model\'s predictions match observed outcomes on average. Assessed via calibration plots.',
    category: 'Validation',
    relatedTerms: ['Brier Score', 'Discrimination'],
  },
  {
    term: 'Random Survival Forests',
    definition: 'Machine learning ensemble method extending random forests to survival data. Can capture non-linear effects and interactions automatically.',
    category: 'ML',
    relatedTerms: ['CoxNet', 'DeepSurv'],
  },
  {
    term: 'CoxNet',
    definition: 'Penalized Cox model with elastic net regularization (L1 + L2 penalties). Performs variable selection and handles high-dimensional data (p > n).',
    category: 'ML',
    relatedTerms: ['Cox Model', 'Lasso'],
  },
]

export const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = ['All', ...Array.from(new Set(glossaryTerms.map(t => t.category)))]

  const filteredTerms = glossaryTerms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || term.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Survival Analysis Glossary</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive definitions of key terms and concepts
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {filteredTerms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No terms found matching your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTerms.map((item, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-xl">{item.term}</CardTitle>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{item.definition}</p>

                {item.relatedTerms && item.relatedTerms.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Related terms:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.relatedTerms.map((related, ridx) => (
                        <Badge key={ridx} variant="outline" className="text-xs">
                          {related}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
