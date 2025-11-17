# **SurvivalStats Pro — OPTIMIZED MASTER PROMPT FOR EDUCATIONAL APP GENERATION**  
A clinically rigorous, evidence-based master prompt for generating a **mobile-first, offline-capable, dark-mode educational app** that teaches clinicians, biostatisticians-in-training, and researchers *everything* about time-to-event (survival) analysis — from foundational concepts → hazard functions → Kaplan-Meier → Cox PH models → competing risks → recurrent events → landmarking → time-dependent covariates → machine-learning–based survival models → and beyond.

---

# **MASTER PROMPT — SurvivalStats Pro Educational App Generator (SPECIALIZED VERSION)**

## **Role & Mission**
You are a cross-functional team (PM + Staff Engineer + Senior Instructional Designer + Biostatistics SME + Clinical Epidemiology SME + Survival Analysis Specialist + UX Writer + QA).  
Your mission is to design an **interactive survival-analysis training platform** that teaches:

**SurvivalStats Pro: The Complete Time-to-Event Analysis Learning Lab**  
—A comprehensive, deeply visual, simulation-driven environment that explains *all statistical methods relating to survival/time-to-event analysis*, from beginner to advanced, using only synthetic datasets.

This app must:
- Serve **all learner levels:** MS2 → MS4 → residents → fellows → researchers → clinician-scientists  
- Cover **all major survival analysis methods** in clinical research  
- Use **synthetic time-to-event data only**  
- Include **interactive curves, hazard plots, PH assumption diagnostics, landmarking, competing-risk diagrams, multi-state transition models, dynamic prediction models**, etc.  
- Be **mobile-first, offline-ready, dark-mode optimized**  
- Maintain strict statistical correctness (no hallucinated tests/models)  
- Explain all prerequisites and concepts step-by-step

---

## **Inputs (Fill These)**
- **Primary Topic(s):**  
  Always centered on **time-to-event analysis**, including:  
  - Survival functions, censoring, truncation  
  - Kaplan–Meier, life tables  
  - Log-rank tests  
  - Hazard, cumulative hazard  
  - Cox proportional hazards model  
  - PH assumptions & diagnostics (Schoenfeld residuals, log(-log) curves)  
  - Time-dependent covariates  
  - Competing risk models (CIF, Fine-Gray)  
  - Multi-state models  
  - Recurrent event analysis  
  - Landmark analysis  
  - Time-varying effects  
  - Parametric survival models (exponential, Weibull, Gompertz, log-logistic)  
  - Flexible survival models (splines, Royston-Parmar)  
  - Dynamic prediction  
  - Machine-learning survival models (RSF, CoxNet, DeepSurv — conceptual only)  
  - Model validation (calibration, discrimination, Brier score, C-index)  
  - Clinical interpretation of hazard ratios  
- **Target Learner Levels:** {{LEVELS}}  
- **Learner Context:** {{CONTEXT}}  
- **Learning Outcomes:** {{LEARNING_OBJECTIVES}}  
- **Constraints:**  
  Always include:  
  - *Mobile-first; dark mode; offline-ready; synthetic data only; statistically orthodox; no real-world predictions*  
- **References/Standards:** {{REFERENCES}}  
  - e.g., “Collett, Klein & Moeschberger, Therneau, Royston-Parmar papers, TRIPOD guidelines”
- **Brand/Voice:** {{VOICE_TONE}}  
- **Localization:** {{LOCALE}}

---

# **Required Deliverables (Produce All)**

---

## **1. Executive Summary**
- Describe why survival methods are difficult: censoring, hazards, assumptions, model diagnostics.  
- Introduce SurvivalStats Pro as the **Survival Analysis Simulation Lab + Visual Methods Guide + Clinical Interpretation Engine**.  
- Provide 2–3 alternate names + value propositions.

---

## **2. Learner Personas & Use Cases**
Examples:
- Oncology fellow analyzing time to relapse  
- Cardiology resident interpreting hazard ratios in a trial  
- Epidemiology student learning survival curves  
- Researcher modeling time-varying risk  
Use cases: exam prep, clinical trial interpretation, prediction model development.

---

## **3. Curriculum Map & Knowledge Graph**
Everything must connect **biostatistics ↔ clinical research ↔ modeling ↔ interpretation**.

### **Prerequisites**
- Probability distributions  
- Censoring definitions  
- Regression basics  

### **Modules**

1. **Foundations of Survival Analysis**
   - Time, event, censoring  
   - Survival function, PDF, hazard function  
   - Cumulative hazard  

2. **Kaplan–Meier Estimation**
   - Constructing KM curves  
   - Confidence bands  
   - Life tables  
   - Log-rank test  

3. **Hazard Ratios & Interpretation**
   - Instantaneous risk  
   - Proportional vs non-proportional hazards  
   - Misinterpretations to avoid  

4. **Cox Proportional Hazards Model**
   - Partial likelihood concept  
   - Linear predictor  
   - Adjusted HRs  
   - PH diagnostics:  
     - Schoenfeld residuals  
     - Scaled Schoenfeld  
     - log(-log) curves  
     - Time-interaction terms  

5. **Parametric Survival Models**
   - Exponential, Weibull, Gompertz  
   - Accelerated failure time (AFT) framework  
   - Comparing parametric vs Cox  

6. **Time-Dependent Covariates**
   - Internal vs external time dependence  
   - Counting-process notation (conceptual)  

7. **Competing Risks**
   - Cumulative incidence function  
   - Cause-specific hazard  
   - Subdistribution hazard (Fine-Gray)  
   - Pitfalls comparing CIF vs Kaplan–Meier  

8. **Recurrent Events**
   - Andersen-Gill  
   - Prentice, Williams, Peterson (PWP)  
   - Gap vs total time  

9. **Landmark Analysis & Dynamic Prediction**
   - Purpose of landmarking  
   - Updating predictions  
   - Comparison to time-dependent Cox  

10. **Multi-State Models**
    - Transition intensities  
    - Illness–death models  
    - Visual state diagrams  

11. **Machine Learning Survival Models (Conceptual Only)**
    - Random Survival Forests (RSF)  
    - CoxNet (penalized Cox)  
    - DeepSurv (neural network hazard modeling)  
    - Strengths + limitations  

12. **Model Evaluation & Validation**
    - C-statistic, time-dependent AUC  
    - Brier score  
    - Calibration: survival calibration curves  
    - Overfitting & optimism correction  

13. **Integrated Survival Analysis Sandbox**
    - Build curves, models, parametric fits, CIFs, and multi-state diagrams  
    - Compare HRs, survival probabilities, predictions  

Each module: micro-concepts, prerequisites, Bloom levels.

---

## **4. Interactives (SurvivalStats Pro–Specific)**

### **Examples**

- **KM Curve Builder**
  - Drag time/event data → auto-generate KM curve  
  - Slider for censoring percentage → observe curve distortion  

- **Hazard Function Explorer**
  - Show hazard vs cumulative hazard vs survival  
  - Switch between exponential/Weibull shapes  

- **Cox PH Assumption Checker**
  - Visualize Schoenfeld residual plots  
  - Show violations → recommend fixes (interaction term, stratification)  

- **Landmark Analysis Visualizer**
  - Select landmark time → recalculate KM/Cox subsets  

- **Competing Risks CIF Simulator**
  - Show how cause-specific vs subdistribution hazards differ  

- **Recurrent Events Timeline Simulator**
  - Visualize multiple event times per patient  

- **Multi-State Diagram Builder**
  - Drag states/nodes → define transitions → simulate trajectories  

- **Parametric Fit Playground**
  - Compare exponential vs Weibull curves  
  - Observe fit differences with sliders  

- **ML Survival Explorer (Conceptual)**
  - Visual RSF tree summaries  
  - Risk ranking vs hazard prediction  

- **Calibration & C-Index Lab**
  - Plot predicted vs observed survival  
  - Adjust model → see calibration change  

For each interactive:
- purpose  
- inputs/controls  
- outputs  
- visuals  
- preset synthetic datasets  
- guardrails ensuring statistical correctness

---

## **5. Assessment & Mastery**
Include:
- MCQs  
- Curve interpretation exercises  
- “Does this violate PH assumption?”  
- Competing-risk judgment calls  
- Model comparison problems  
- Recurrent vs competing-risk differentiation  
- Hazard ratio interpretation  
Provide **10–20 items** with thorough rationales.

---

## **6. Survival Analysis Reasoning Framework**
Teach stepwise reasoning:

1. Define event & time origin  
2. Identify censoring patterns  
3. Choose modeling approach (KM, Cox, parametric, competing risks, recurrent events)  
4. Fit model appropriately  
5. Check assumptions  
6. Consider multi-state structure  
7. Evaluate discrimination & calibration  
8. Use dynamic prediction if applicable  
9. Interpret with clinical relevance  

Pitfalls:
- Misinterpreting HR as relative risk  
- Using KM in competing-risk settings  
- Ignoring PH violations  
- Overtrust in RSF or neural nets  
- Misusing time-dependent covariates  

---

## **7. Accessibility & Safety**
- WCAG 2.2 AA  
- No real patient data  
- Clear statistical disclaimers  
- Educational-only, not real CDS  
- Canonical formulas only  

---

## **8. Tech Architecture (Mobile-First, Offline)**
- React/TypeScript  
- Tailwind + shadcn/ui  
- Recharts/D3 for curves, hazards, CIFs  
- IndexedDB + Service Worker for offline  
- Lightweight simulation engines  
- Zustand/Redux for state management  
- SVG visual diagram builders

---

## **9. Data Schemas (JSON)**
Schemas for:
- survival times  
- event indicators  
- covariate structures (baseline & time-dependent)  
- competing-risk datasets  
- multi-state transition definitions  
- model outputs  
- calibration metrics  
- glossary entries  
Include example JSON blocks.

---

## **10. Screen Specs & Text Wireframes**
Screens:
- Home  
- Survival Foundations  
- KM Lab  
- Cox PH Explorer  
- PH Assumption Checker  
- Parametric Models Lab  
- Competing Risks Module  
- Recurrent Events Module  
- Landmarking & Dynamic Prediction  
- Multi-State Models  
- ML Survival Concepts  
- Calibration & Validation Lab  
- Integrated Analysis Sandbox  
- Assessment Hub  
- Glossary  
- Settings  

Provide text-based wireframes for each.

---

## **11. Copy & Content Kit**
Include:
- Microcopy (“Hazard ≠ risk”, “When CIF matters”, “Landmarking vs time-dependent covariates”)  
- Diagrams for hazard vs survival  
- Glossary definitions  
- Two full lessons + one integrated advanced case  

---

## **12. Analytics & A/B Plan**
UI-only:
- PH checker visualization modes  
- CIF versus KM display toggles  
- Multi-state diagram styles  

---

## **13. QA Checklist**
- All formulas align with survival textbook standards  
- PH diagnostics correctly represented  
- CIF vs cause-specific hazard distinctions accurate  
- No contradictions across modules  
- Advanced models represented conceptually but correctly  

---

## **14. Roadmap**
Prototype → Pilot → Expanded Multi-State Suite → ML Survival Deep Dive → Personalized Learning Tracks  
Include milestones, risks, acceptance criteria.

---

# **Style & Rigor Requirements**
- Advanced yet intuitive  
- Visual-first, clinically relevant  
- Strictly evidence-based & methodologically correct  
- Zero hallucinated statistics  
- Pathoma-like clarity for survival methods  

---

# **Acceptance Criteria**
- Learners accurately interpret & use survival analysis methods  
- Content is internally consistent & statistically correct  
- App reinforces a unified **SurvivalStats Pro Time-to-Event Systems Map**

---

# **Now Generate**
Using the inputs above, produce all deliverables in the required order.  
If any input is missing, make biostatistically sound assumptions and label them as defaults.
