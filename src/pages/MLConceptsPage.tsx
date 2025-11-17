import React, { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useProgressStore } from '@/store/progressStore'
import { Brain, GitBranch, Layers } from 'lucide-react'

const MODULE_ID = 'ml-concepts'

export const MLConceptsPage: React.FC = () => {
  const { updateLastAccessed, markModuleComplete } = useProgressStore()

  useEffect(() => {
    updateLastAccessed(MODULE_ID)
  }, [])

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Machine Learning for Survival Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Conceptual overview of modern ML approaches to time-to-event analysis.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ML Survival Analysis: Conceptual Overview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Why Machine Learning for Survival?</h3>
              <p>
                Traditional survival methods (Cox models, parametric models) have limitations:
              </p>
              <ul>
                <li>Assume linear effects of covariates</li>
                <li>May miss complex interactions</li>
                <li>Limited capacity for high-dimensional data</li>
                <li>Proportional hazards or other restrictive assumptions</li>
              </ul>

              <p>
                Machine learning methods can potentially:
              </p>
              <ul>
                <li>Capture non-linear relationships</li>
                <li>Automatically detect interactions</li>
                <li>Handle high-dimensional predictors</li>
                <li>Adapt to complex hazard shapes</li>
              </ul>

              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded not-prose">
                <h4 className="font-semibold mb-2">Important Caveat</h4>
                <p className="text-sm">
                  ML methods are NOT always better! They require larger sample sizes, are harder to
                  interpret, and may overfit. Always compare performance to standard Cox models
                  and validate carefully.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <GitBranch className="h-6 w-6 text-primary" />
                  <CardTitle>Random Survival Forests (RSF)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h4>How RSF Works</h4>
                <p>
                  Extension of random forests to survival data. Builds many survival trees,
                  each trained on a bootstrap sample, and averages predictions.
                </p>

                <h4>Key Features</h4>
                <ul className="text-sm">
                  <li>Handles non-linear effects and interactions automatically</li>
                  <li>Variable importance measures</li>
                  <li>No parametric assumptions</li>
                  <li>Resistant to overfitting (via bootstrapping)</li>
                </ul>

                <h4>Limitations</h4>
                <ul className="text-sm">
                  <li>Black box — hard to interpret individual predictions</li>
                  <li>Computational intensive</li>
                  <li>May not outperform Cox in simple settings</li>
                </ul>

                <div className="bg-muted p-3 rounded not-prose text-xs">
                  <strong>Software:</strong> R (randomForestSRC), Python (scikit-survival)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-primary" />
                  <CardTitle>Penalized Cox (CoxNet)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h4>How CoxNet Works</h4>
                <p>
                  Cox model with L1 (lasso) and/or L2 (ridge) penalties. Performs variable
                  selection and shrinkage simultaneously.
                </p>

                <h4>Key Features</h4>
                <ul className="text-sm">
                  <li>Handles high-dimensional data (p &gt; n)</li>
                  <li>Automatic variable selection with lasso</li>
                  <li>Reduces overfitting via regularization</li>
                  <li>Still interpretable (hazard ratios)</li>
                </ul>

                <h4>When to Use</h4>
                <ul className="text-sm">
                  <li>Many predictors relative to sample size</li>
                  <li>Genomic/biomarker studies</li>
                  <li>Want both prediction and interpretation</li>
                </ul>

                <div className="bg-muted p-3 rounded not-prose text-xs">
                  <strong>Software:</strong> R (glmnet), Python (scikit-survival)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  <CardTitle>DeepSurv & Neural Networks</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h4>How Deep Learning Works for Survival</h4>
                <p>
                  Neural networks that output a hazard function or risk score. Can use Cox
                  partial likelihood as loss function.
                </p>

                <h4>Key Features</h4>
                <ul className="text-sm">
                  <li>Can learn extremely complex patterns</li>
                  <li>Handles high-dimensional inputs (images, sequences)</li>
                  <li>Can incorporate different data modalities</li>
                </ul>

                <h4>Challenges</h4>
                <ul className="text-sm">
                  <li>Requires very large datasets</li>
                  <li>Complete black box</li>
                  <li>Risk of overfitting without careful regularization</li>
                  <li>Computationally expensive</li>
                </ul>

                <div className="bg-muted p-3 rounded not-prose text-xs">
                  <strong>Software:</strong> Python (pycox, DeepSurv, scikit-survival)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gradient Boosting Machines</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h4>How Boosting Works</h4>
                <p>
                  Builds ensemble of weak learners (usually trees) sequentially,
                  each correcting errors of previous models.
                </p>

                <h4>Survival Adaptations</h4>
                <ul className="text-sm">
                  <li>XGBoost survival (AFT or Cox loss)</li>
                  <li>LightGBM with survival objectives</li>
                  <li>Gradient boosting with custom survival loss</li>
                </ul>

                <h4>Advantages</h4>
                <ul className="text-sm">
                  <li>Often best predictive performance</li>
                  <li>Handles mixed data types well</li>
                  <li>Partial dependence plots for interpretation</li>
                </ul>

                <div className="bg-muted p-3 rounded not-prose text-xs">
                  <strong>Software:</strong> Python (xgboost, lightgbm), R (xgboost)
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evaluating ML Survival Models</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Key Metrics</h3>

              <h4>1. C-Index (Concordance Index)</h4>
              <p>
                Probability that, for a random pair of subjects where one experienced the event before the other,
                the model assigns a higher risk to the subject with shorter survival time.
              </p>
              <div className="bg-muted p-3 rounded not-prose">
                <p className="text-sm">• Range: 0.5 (random) to 1.0 (perfect)</p>
                <p className="text-sm">• Generalization of AUC to survival data</p>
                <p className="text-sm">• C-index &gt; 0.7 often considered good</p>
              </div>

              <h4>2. Time-Dependent AUC</h4>
              <p>
                AUC calculated at specific time points (e.g., "Can the model discriminate who will
                die within 5 years?").
              </p>

              <h4>3. Brier Score</h4>
              <p>
                Mean squared error between predicted survival probabilities and actual outcomes.
                Lower is better.
              </p>
              <div className="bg-muted p-3 rounded not-prose">
                <p className="text-sm font-mono">BS(t) = (1/n) Σ[S(t|X) - I(T &gt; t)]²</p>
              </div>

              <h4>4. Calibration</h4>
              <p>
                Agreement between predicted and observed survival probabilities. Assessed via
                calibration plots (predicted vs observed).
              </p>

              <h3>Best Practices</h3>
              <ul>
                <li><strong>Cross-validation:</strong> Use k-fold CV or repeated holdout</li>
                <li><strong>Independent test set:</strong> Never evaluate on training data</li>
                <li><strong>Compare to Cox baseline:</strong> ML should beat standard methods</li>
                <li><strong>Check calibration:</strong> Not just discrimination</li>
                <li><strong>External validation:</strong> Test on different cohort if possible</li>
              </ul>

              <h3>Interpretation Challenges</h3>
              <p>
                ML models are often "black boxes." Methods for interpretation:
              </p>
              <ul>
                <li><strong>Variable importance:</strong> Which features matter most?</li>
                <li><strong>Partial dependence plots:</strong> Effect of one variable holding others constant</li>
                <li><strong>SHAP values:</strong> Individual prediction explanations</li>
                <li><strong>Individual conditional expectations:</strong> Feature effects for specific subjects</li>
              </ul>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded not-prose">
                <h4 className="font-semibold mb-2">Key Takeaway</h4>
                <p className="text-sm">
                  Machine learning for survival is a powerful tool but not a panacea. Always start
                  with standard methods, validate rigorously, and prioritize interpretability
                  in clinical applications. The best model is one that is both accurate AND
                  trustworthy.
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
