# SurvivalStats Pro

A comprehensive, interactive survival analysis educational platform built with React, TypeScript, and modern web technologies.

## Overview

**SurvivalStats Pro: The Complete Time-to-Event Analysis Learning Lab**

An educational platform that teaches all major survival analysis methods through interactive visualizations, simulations, and hands-on exercises. Designed for medical students, residents, fellows, researchers, and anyone learning survival analysis.

## Features

### 🎓 Comprehensive Curriculum

- **Foundations of Survival Analysis** - Core concepts, censoring, survival & hazard functions
- **Kaplan-Meier Estimation** - KM curves, confidence intervals, log-rank tests
- **Cox Proportional Hazards Model** - Regression modeling, hazard ratios, PH diagnostics
- **Parametric Survival Models** - Exponential, Weibull, AFT models
- **Competing Risks Analysis** - CIF, Fine-Gray models, cause-specific vs subdistribution hazards
- **Landmark Analysis** - Dynamic prediction, handling time-dependent covariates
- **Multi-State Models** - Complex disease trajectories, transition intensities
- **Machine Learning for Survival** - RSF, CoxNet, DeepSurv concepts

### 🎮 Interactive Tools

- **KM Curve Builder** - Adjust parameters to see real-time curve changes
- **Hazard Function Explorer** - Visualize relationships between survival, hazard, and cumulative hazard
- **Cox PH Assumption Checker** - Log-log plots and Schoenfeld residual diagnostics
- **Competing Risks CIF Simulator** - Compare CIF vs incorrect 1-KM approach
- **Parametric Fit Playground** - Compare different parametric distributions
- **Landmark Visualizer** - Dynamic survival estimation from landmark times

### 📊 Educational Excellence

- **Statistically Rigorous** - All algorithms follow canonical textbook formulations
- **Synthetic Data Only** - 100% synthetic datasets for safe learning
- **Dark Mode Support** - Optimized for comfortable learning
- **Offline Capable** - PWA with service worker for offline access
- **Progress Tracking** - Save your learning progress locally
- **Assessment Hub** - Test your knowledge with curated MCQs

## Tech Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Zustand** - State management
- **React Router** - Client-side routing
- **PWA** - Offline capability with service workers

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   └── layout/         # Layout components (Header, Sidebar, etc.)
├── pages/              # Page components for each module
├── lib/                # Utility functions and core algorithms
│   ├── survivalAnalysis.ts  # Statistical calculations
│   ├── dataGenerators.ts    # Synthetic data generation
│   └── utils.ts             # Helper functions
├── store/              # State management
│   ├── themeStore.ts   # Dark mode state
│   └── progressStore.ts # Learning progress tracking
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## Key Statistical Implementations

All survival analysis methods are implemented following standard methodologies:

- **Kaplan-Meier**: Product-limit estimator with Greenwood's formula for confidence intervals
- **Nelson-Aalen**: Cumulative hazard estimation
- **Log-Rank Test**: Non-parametric comparison of survival curves
- **Cox Model**: Partial likelihood framework (conceptual demonstration)
- **Competing Risks**: Cumulative incidence function calculation
- **Parametric Models**: Exponential and Weibull distributions

## Educational Philosophy

1. **Interactive Learning** - Manipulate parameters and see immediate visual feedback
2. **Statistical Rigor** - Zero statistical hallucinations, all methods properly implemented
3. **Clinical Relevance** - Real-world examples and interpretation guidance
4. **Progressive Complexity** - Beginner to advanced topics with clear prerequisites
5. **Safe Environment** - Synthetic data only, no patient information

## Disclaimer

**FOR EDUCATIONAL USE ONLY**

This application is designed exclusively for learning and educational purposes. It is NOT intended for:
- Clinical decision support
- Real-world predictions or diagnoses
- Medical treatment decisions
- Research with actual patient data

All data in this application is completely synthetic and generated for educational purposes.

## License

This project is built for educational purposes as part of the SurvivalStats Pro learning platform.

## Contributing

This is an educational project. Contributions that improve statistical accuracy, add educational content, or enhance the learning experience are welcome.

## Acknowledgments

Built following best practices from canonical survival analysis textbooks:
- Collett, D. "Modelling Survival Data in Medical Research"
- Klein, J.P. & Moeschberger, M.L. "Survival Analysis: Techniques for Censored and Truncated Data"
- Therneau, T.M. & Grambsch, P.M. "Modeling Survival Data: Extending the Cox Model"

---

**Built with excellence for excellence in survival analysis education**
