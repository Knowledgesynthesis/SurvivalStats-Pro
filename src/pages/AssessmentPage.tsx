import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, XCircle, Award } from 'lucide-react'
import { useProgressStore } from '@/store/progressStore'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: string
}

const questions: Question[] = [
  {
    id: 'q1',
    question: 'What does censoring mean in survival analysis?',
    options: [
      'The event did not occur during the observation period',
      'The data was removed from the analysis',
      'The subject dropped out of the study',
      'The event time was measured incorrectly',
    ],
    correctAnswer: 0,
    explanation: 'Censoring occurs when we know a subject survived past a certain time, but we don\'t know their exact event time. This is most commonly right censoring, where the event hasn\'t occurred by the end of observation.',
    category: 'Foundations',
  },
  {
    id: 'q2',
    question: 'In a Kaplan-Meier curve, when does the survival probability decrease?',
    options: [
      'At regular time intervals',
      'Only at event times',
      'When subjects are censored',
      'Continuously over time',
    ],
    correctAnswer: 1,
    explanation: 'The KM curve is a step function that only drops at observed event times. The curve remains flat between events and when censoring occurs.',
    category: 'Kaplan-Meier',
  },
  {
    id: 'q3',
    question: 'A hazard ratio of 0.70 means:',
    options: [
      '70% reduction in mortality',
      '30% reduction in hazard',
      '70% survival probability',
      '30% increase in risk',
    ],
    correctAnswer: 1,
    explanation: 'HR = 0.70 means the hazard in the treatment group is 70% of the hazard in the control group, which is a 30% reduction in hazard. This is NOT the same as a 30% reduction in mortality risk.',
    category: 'Cox PH',
  },
  {
    id: 'q4',
    question: 'The proportional hazards assumption in Cox regression means:',
    options: [
      'The baseline hazard is constant over time',
      'The hazard ratio is constant over time',
      'Survival curves never cross',
      'Hazards are the same in all groups',
    ],
    correctAnswer: 1,
    explanation: 'The PH assumption states that the hazard ratio comparing groups is constant over time. This does NOT require the baseline hazard to be constant, and survival curves CAN cross while still satisfying PH.',
    category: 'Cox PH',
  },
  {
    id: 'q5',
    question: 'In competing risks analysis, why is 1 - KM incorrect for estimating cumulative incidence?',
    options: [
      'KM assumes informative censoring',
      'KM overestimates cumulative incidence by treating competing events as censored',
      'KM can only be used for binary outcomes',
      'KM requires proportional hazards',
    ],
    correctAnswer: 1,
    explanation: '1 - KM treats competing events as if those subjects could still experience the event of interest, thus overestimating the true cumulative incidence. The correct approach is to use the cumulative incidence function (CIF).',
    category: 'Competing Risks',
  },
  {
    id: 'q6',
    question: 'Which distribution assumes a constant hazard rate?',
    options: [
      'Weibull with k > 1',
      'Log-logistic',
      'Exponential',
      'Log-normal',
    ],
    correctAnswer: 2,
    explanation: 'The exponential distribution has a constant hazard rate (memoryless property). Weibull can have constant (k=1), increasing (k>1), or decreasing (k<1) hazards.',
    category: 'Parametric Models',
  },
  {
    id: 'q7',
    question: 'Landmark analysis is used to avoid:',
    options: [
      'Overfitting the model',
      'Guarantee-time (immortal time) bias',
      'Censoring',
      'Competing risks',
    ],
    correctAnswer: 1,
    explanation: 'Landmark analysis addresses guarantee-time bias that occurs when a covariate requires survival to a certain time. By setting a landmark time and only analyzing subjects who survived to that point, we avoid this bias.',
    category: 'Landmark Analysis',
  },
  {
    id: 'q8',
    question: 'What does the C-index measure in survival models?',
    options: [
      'Calibration of predicted probabilities',
      'Discrimination ability (concordance)',
      'Overall model fit',
      'Residual variance',
    ],
    correctAnswer: 1,
    explanation: 'The C-index (concordance index) measures discrimination — the probability that the model correctly ranks pairs of subjects according to their survival times. It generalizes AUC to survival data.',
    category: 'Model Evaluation',
  },
  {
    id: 'q9',
    question: 'Which is true about AFT (Accelerated Failure Time) models?',
    options: [
      'They model the effect on hazard ratios',
      'They model the effect on survival time',
      'They are always semi-parametric',
      'They require proportional hazards',
    ],
    correctAnswer: 1,
    explanation: 'AFT models assume covariates accelerate or decelerate the passage of time, modeling effects on survival time rather than hazard. This provides more intuitive interpretation (e.g., "treatment extends life by X months").',
    category: 'Parametric Models',
  },
  {
    id: 'q10',
    question: 'Random Survival Forests (RSF) are advantageous because they:',
    options: [
      'Always outperform Cox models',
      'Require no sample size requirements',
      'Can capture non-linear effects and interactions automatically',
      'Provide easily interpretable hazard ratios',
    ],
    correctAnswer: 2,
    explanation: 'RSF can automatically detect non-linear relationships and interactions without prior specification. However, they don\'t always outperform simpler methods, require adequate sample sizes, and are less interpretable than Cox models.',
    category: 'ML Methods',
  },
]

export const AssessmentPage: React.FC = () => {
  const { setAssessmentScore } = useProgressStore()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({})
  const [showResults, setShowResults] = useState(false)

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleSubmit = () => {
    const score = questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctAnswer ? 1 : 0)
    }, 0)

    const percentage = (score / questions.length) * 100
    setAssessmentScore('assessment', 'main', percentage)
    setShowResults(true)
  }

  const handleReset = () => {
    setSelectedAnswers({})
    setShowResults(false)
    setCurrentQuestion(0)
  }

  const question = questions[currentQuestion]
  const isAnswered = selectedAnswers[question.id] !== undefined
  const isCorrect = selectedAnswers[question.id] === question.correctAnswer

  if (showResults) {
    const score = questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctAnswer ? 1 : 0)
    }, 0)
    const percentage = (score / questions.length) * 100

    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Award className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-3xl">Assessment Complete!</CardTitle>
            <CardDescription>Here are your results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{percentage.toFixed(0)}%</p>
              <p className="text-muted-foreground mt-2">
                {score} out of {questions.length} correct
              </p>
            </div>

            {percentage >= 80 && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="font-semibold">Excellent work!</p>
                <p className="text-sm text-muted-foreground">
                  You have a strong understanding of survival analysis concepts.
                </p>
              </div>
            )}

            {percentage >= 60 && percentage < 80 && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="font-semibold">Good job!</p>
                <p className="text-sm text-muted-foreground">
                  You have a solid grasp of the fundamentals. Review missed questions to strengthen your knowledge.
                </p>
              </div>
            )}

            {percentage < 60 && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                <p className="font-semibold">Keep learning!</p>
                <p className="text-sm text-muted-foreground">
                  Review the modules and try the interactive exercises to build your understanding.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Review Your Answers</h3>
              {questions.map((q, idx) => {
                const userAnswer = selectedAnswers[q.id]
                const correct = userAnswer === q.correctAnswer

                return (
                  <div key={q.id} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      {correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">Question {idx + 1}: {q.question}</p>
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={correct ? 'text-green-500' : 'text-red-500'}>
                            {q.options[userAnswer]}
                          </span>
                        </p>
                        {!correct && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-500">{q.options[q.correctAnswer]}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={handleReset}>
                Take Assessment Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Hub</h1>
        <p className="text-muted-foreground mt-2">
          Test your understanding of survival analysis concepts
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">{question.category}</Badge>
            {isAnswered && (
              isCorrect ? (
                <Badge variant="success">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Correct
                </Badge>
              ) : (
                <Badge variant="warning">
                  <XCircle className="mr-1 h-3 w-3" />
                  Incorrect
                </Badge>
              )
            )}
          </div>
          <CardTitle className="mt-4">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswers[question.id] === idx
              const isCorrectOption = idx === question.correctAnswer
              const showCorrect = isAnswered && isCorrectOption
              const showIncorrect = isAnswered && isSelected && !isCorrect

              return (
                <button
                  key={idx}
                  onClick={() => !isAnswered && handleAnswer(question.id, idx)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                    ${showCorrect ? 'border-green-500 bg-green-500/10' : ''}
                    ${showIncorrect ? 'border-red-500 bg-red-500/10' : ''}
                    ${isAnswered ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}
                      ${showCorrect ? 'border-green-500 bg-green-500' : ''}
                      ${showIncorrect ? 'border-red-500 bg-red-500' : ''}
                    `}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                      {showCorrect && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                      {showIncorrect && (
                        <XCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {isAnswered && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-semibold mb-2">Explanation:</p>
              <p className="text-sm">{question.explanation}</p>
            </div>
          )}

          <div className="flex justify-between gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            {currentQuestion < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                disabled={!isAnswered}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(selectedAnswers).length !== questions.length}
              >
                Submit Assessment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
