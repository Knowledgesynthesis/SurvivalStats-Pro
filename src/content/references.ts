/**
 * Bibliography. Every factual or methodological claim in the course that is not
 * standard textbook material points to one of these. DOIs were checked at time of writing.
 */
export interface Reference {
  short: string
  authors: string
  year: number | string
  title: string
  venue: string
  doi?: string
  url?: string
  topic: 'Textbook' | 'Foundations' | 'Comparing groups' | 'Cox & PH' | 'Parametric' | 'Competing risks' | 'Time-dependent' | 'Recurrent & multi-state' | 'Prediction' | 'Reporting & design' | 'Software'
}

const REFS = {
  // ---- textbooks ----
  collett: { short: 'Collett 2023', authors: 'Collett D', year: 2023, title: 'Modelling Survival Data in Medical Research (4th ed.)', venue: 'Chapman & Hall/CRC', topic: 'Textbook' },
  klein: { short: 'Klein & Moeschberger 2003', authors: 'Klein JP, Moeschberger ML', year: 2003, title: 'Survival Analysis: Techniques for Censored and Truncated Data (2nd ed.)', venue: 'Springer', topic: 'Textbook' },
  therneau: { short: 'Therneau & Grambsch 2000', authors: 'Therneau TM, Grambsch PM', year: 2000, title: 'Modeling Survival Data: Extending the Cox Model', venue: 'Springer', doi: '10.1007/978-1-4757-3294-8', topic: 'Textbook' },
  kalbfleisch: { short: 'Kalbfleisch & Prentice 2002', authors: 'Kalbfleisch JD, Prentice RL', year: 2002, title: 'The Statistical Analysis of Failure Time Data (2nd ed.)', venue: 'Wiley', doi: '10.1002/9781118032985', topic: 'Textbook' },
  abgk: { short: 'Andersen et al. 1993', authors: 'Andersen PK, Borgan Ø, Gill RD, Keiding N', year: 1993, title: 'Statistical Models Based on Counting Processes', venue: 'Springer', doi: '10.1007/978-1-4612-4348-9', topic: 'Textbook' },
  beyersmann: { short: 'Beyersmann et al. 2012', authors: 'Beyersmann J, Allignol A, Schumacher M', year: 2012, title: 'Competing Risks and Multistate Models with R', venue: 'Springer', doi: '10.1007/978-1-4614-2035-4', topic: 'Textbook' },
  cookLawless: { short: 'Cook & Lawless 2007', authors: 'Cook RJ, Lawless JF', year: 2007, title: 'The Statistical Analysis of Recurrent Events', venue: 'Springer', doi: '10.1007/978-0-387-69810-6', topic: 'Textbook' },
  roystonLambert: { short: 'Royston & Lambert 2011', authors: 'Royston P, Lambert PC', year: 2011, title: 'Flexible Parametric Survival Analysis Using Stata: Beyond the Cox Model', venue: 'Stata Press', topic: 'Textbook' },
  steyerberg: { short: 'Steyerberg 2019', authors: 'Steyerberg EW', year: 2019, title: 'Clinical Prediction Models (2nd ed.)', venue: 'Springer', doi: '10.1007/978-3-030-16399-0', topic: 'Textbook' },
  harrellRMS: { short: 'Harrell 2015', authors: 'Harrell FE Jr', year: 2015, title: 'Regression Modeling Strategies (2nd ed.)', venue: 'Springer', doi: '10.1007/978-3-319-19425-7', topic: 'Textbook' },

  // ---- foundations & estimation ----
  kaplanMeier: { short: 'Kaplan & Meier 1958', authors: 'Kaplan EL, Meier P', year: 1958, title: 'Nonparametric estimation from incomplete observations', venue: 'J Am Stat Assoc 53:457–481', doi: '10.1080/01621459.1958.10501452', topic: 'Foundations' },
  greenwood: { short: 'Greenwood 1926', authors: 'Greenwood M', year: 1926, title: 'The natural duration of cancer', venue: 'Reports on Public Health and Medical Subjects 33:1–26 (HMSO)', topic: 'Foundations' },
  freireich: { short: 'Freireich et al. 1963', authors: 'Freireich EJ, Gehan E, Frei E III, et al.', year: 1963, title: 'The effect of 6-mercaptopurine on the duration of steroid-induced remissions in acute leukemia', venue: 'Blood 21:699–716', doi: '10.1182/blood.V21.6.699.699', topic: 'Foundations' },
  clark2003: { short: 'Clark et al. 2003', authors: 'Clark TG, Bradburn MJ, Love SB, Altman DG', year: 2003, title: 'Survival analysis part I: basic concepts and first analyses', venue: 'Br J Cancer 89:232–238', doi: '10.1038/sj.bjc.6601118', topic: 'Foundations' },
  schemper: { short: 'Schemper & Smith 1996', authors: 'Schemper M, Smith TL', year: 1996, title: 'A note on quantifying follow-up in studies of failure time', venue: 'Control Clin Trials 17:343–346', doi: '10.1016/0197-2456(96)00075-X', topic: 'Foundations' },
  pocock2002: { short: 'Pocock et al. 2002', authors: 'Pocock SJ, Clayton TC, Altman DG', year: 2002, title: 'Survival plots of time-to-event outcomes in clinical trials: good practice and pitfalls', venue: 'Lancet 359:1686–1689', doi: '10.1016/S0140-6736(02)08594-X', topic: 'Reporting & design' },
  kmunicate: { short: 'Morris et al. 2019', authors: 'Morris TP, Jarvis CI, Cragg W, Phillips PPJ, Choodari-Oskooei B, Sydes MR', year: 2019, title: 'Proposals on Kaplan–Meier plots in medical research and a survey of stakeholder views: KMunicate', venue: 'BMJ Open 9:e030215', doi: '10.1136/bmjopen-2019-030215', topic: 'Reporting & design' },

  // ---- comparing groups ----
  mantel: { short: 'Mantel 1966', authors: 'Mantel N', year: 1966, title: 'Evaluation of survival data and two new rank order statistics arising in its consideration', venue: 'Cancer Chemother Rep 50:163–170', topic: 'Comparing groups' },
  petoPeto: { short: 'Peto & Peto 1972', authors: 'Peto R, Peto J', year: 1972, title: 'Asymptotically efficient rank invariant test procedures', venue: 'J R Stat Soc A 135:185–207', doi: '10.2307/2344317', topic: 'Comparing groups' },
  gehan: { short: 'Gehan 1965', authors: 'Gehan EA', year: 1965, title: 'A generalized Wilcoxon test for comparing arbitrarily singly-censored samples', venue: 'Biometrika 52:203–223', doi: '10.1093/biomet/52.1-2.203', topic: 'Comparing groups' },
  blandAltmanLogrank: { short: 'Bland & Altman 2004', authors: 'Bland JM, Altman DG', year: 2004, title: 'The logrank test', venue: 'BMJ 328:1073', doi: '10.1136/bmj.328.7447.1073', topic: 'Comparing groups' },
  roystonParmarRMST: { short: 'Royston & Parmar 2013', authors: 'Royston P, Parmar MKB', year: 2013, title: 'Restricted mean survival time: an alternative to the hazard ratio for the design and analysis of randomized trials with a time-to-event outcome', venue: 'BMC Med Res Methodol 13:152', doi: '10.1186/1471-2288-13-152', topic: 'Comparing groups' },
  uno2014: { short: 'Uno et al. 2014', authors: 'Uno H, Claggett B, Tian L, et al.', year: 2014, title: 'Moving beyond the hazard ratio in quantifying the between-group difference in survival analysis', venue: 'J Clin Oncol 32:2380–2385', doi: '10.1200/JCO.2014.55.2208', topic: 'Comparing groups' },
  linMaxCombo: { short: 'Lin et al. 2020', authors: 'Lin RS, Lin J, Roychoudhury S, et al.', year: 2020, title: 'Alternative analysis methods for time to event endpoints under nonproportional hazards: a comparative analysis', venue: 'Stat Biopharm Res 12:187–198', doi: '10.1080/19466315.2019.1697738', topic: 'Comparing groups' },
  schoenfeld1983: { short: 'Schoenfeld 1983', authors: 'Schoenfeld DA', year: 1983, title: 'Sample-size formula for the proportional-hazards regression model', venue: 'Biometrics 39:499–503', doi: '10.2307/2531021', topic: 'Reporting & design' },
  freedman1982: { short: 'Freedman 1982', authors: 'Freedman LS', year: 1982, title: 'Tables of the number of patients required in clinical trials using the logrank test', venue: 'Stat Med 1:121–129', doi: '10.1002/sim.4780010204', topic: 'Reporting & design' },

  // ---- Cox & PH ----
  cox1972: { short: 'Cox 1972', authors: 'Cox DR', year: 1972, title: 'Regression models and life-tables (with discussion)', venue: 'J R Stat Soc B 34:187–220', doi: '10.1111/j.2517-6161.1972.tb00899.x', topic: 'Cox & PH' },
  breslow1974: { short: 'Breslow 1974', authors: 'Breslow N', year: 1974, title: 'Covariance analysis of censored survival data', venue: 'Biometrics 30:89–99', doi: '10.2307/2529620', topic: 'Cox & PH' },
  efron1977: { short: 'Efron 1977', authors: 'Efron B', year: 1977, title: "The efficiency of Cox's likelihood function for censored data", venue: 'J Am Stat Assoc 72:557–565', doi: '10.1080/01621459.1977.10480613', topic: 'Cox & PH' },
  schoenfeld1982: { short: 'Schoenfeld 1982', authors: 'Schoenfeld D', year: 1982, title: 'Partial residuals for the proportional hazards regression model', venue: 'Biometrika 69:239–241', doi: '10.1093/biomet/69.1.239', topic: 'Cox & PH' },
  grambsch1994: { short: 'Grambsch & Therneau 1994', authors: 'Grambsch PM, Therneau TM', year: 1994, title: 'Proportional hazards tests and diagnostics based on weighted residuals', venue: 'Biometrika 81:515–526', doi: '10.1093/biomet/81.3.515', topic: 'Cox & PH' },
  hernan2010: { short: 'Hernán 2010', authors: 'Hernán MA', year: 2010, title: 'The hazards of hazard ratios', venue: 'Epidemiology 21:13–15', doi: '10.1097/EDE.0b013e3181c1ea43', topic: 'Cox & PH' },
  aalen2015: { short: 'Aalen et al. 2015', authors: 'Aalen OO, Cook RJ, Røysland K', year: 2015, title: 'Does Cox analysis of a randomized survival study yield a causal treatment effect?', venue: 'Lifetime Data Anal 21:579–593', doi: '10.1007/s10985-015-9335-y', topic: 'Cox & PH' },
  stensrud2020: { short: 'Stensrud & Hernán 2020', authors: 'Stensrud MJ, Hernán MA', year: 2020, title: 'Why test for proportional hazards?', venue: 'JAMA 323:1401–1402', doi: '10.1001/jama.2020.1267', topic: 'Cox & PH' },
  sjolander2024: { short: 'Sjölander & Dickman 2024', authors: 'Sjölander A, Dickman PW', year: 2024, title: 'Why test for proportional hazards—or any other model assumptions?', venue: 'Am J Epidemiol', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11579528/', topic: 'Cox & PH' },
  gail1984: { short: 'Gail et al. 1984', authors: 'Gail MH, Wieand S, Piantadosi S', year: 1984, title: 'Biased estimates of treatment effect in randomized experiments with nonlinear regressions and omitted covariates', venue: 'Biometrika 71:431–444', doi: '10.1093/biomet/71.3.431', topic: 'Cox & PH' },
  daniel2021: { short: 'Daniel et al. 2021', authors: 'Daniel R, Zhang J, Farewell D', year: 2021, title: 'Making apples from oranges: comparing noncollapsible effect estimators and their standard errors after adjustment for different covariate sets', venue: 'Biom J 63:528–557', doi: '10.1002/bimj.201900297', topic: 'Cox & PH' },
  fdaCovariate: { short: 'FDA 2023', authors: 'US Food and Drug Administration', year: 2023, title: 'Adjusting for Covariates in Randomized Clinical Trials for Drugs and Biological Products: Guidance for Industry', venue: 'FDA (final guidance, May 2023)', url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/adjusting-covariates-randomized-clinical-trials-drugs-and-biological-products', topic: 'Reporting & design' },
  linWei1989: { short: 'Lin & Wei 1989', authors: 'Lin DY, Wei LJ', year: 1989, title: 'The robust inference for the Cox proportional hazards model', venue: 'J Am Stat Assoc 84:1074–1078', doi: '10.1080/01621459.1989.10478874', topic: 'Cox & PH' },

  // ---- parametric ----
  roystonParmar2002: { short: 'Royston & Parmar 2002', authors: 'Royston P, Parmar MKB', year: 2002, title: 'Flexible parametric proportional-hazards and proportional-odds models for censored survival data, with application to prognostic modelling and estimation of treatment effects', venue: 'Stat Med 21:2175–2197', doi: '10.1002/sim.1203', topic: 'Parametric' },
  latimerTSD14: { short: 'Latimer 2013', authors: 'Latimer NR', year: '2011 (updated 2013)', title: 'NICE DSU Technical Support Document 14: Survival analysis for economic evaluations alongside clinical trials — extrapolation with patient-level data', venue: 'NICE Decision Support Unit', url: 'https://www.sheffield.ac.uk/nice-dsu/tsds/survival-analysis', topic: 'Parametric' },
  rutherfordTSD21: { short: 'Rutherford et al. 2020', authors: 'Rutherford MJ, Lambert PC, Sweeting MJ, et al.', year: 2020, title: 'NICE DSU Technical Support Document 21: Flexible methods for survival analysis', venue: 'NICE Decision Support Unit', url: 'https://www.sheffield.ac.uk/nice-dsu/tsds/flexible-methods-survival-analysis', topic: 'Parametric' },
  jackson2016: { short: 'Jackson 2016', authors: 'Jackson CH', year: 2016, title: 'flexsurv: a platform for parametric survival modeling in R', venue: 'J Stat Softw 70(8):1–33', doi: '10.18637/jss.v070.i08', topic: 'Software' },

  // ---- competing risks ----
  fineGray1999: { short: 'Fine & Gray 1999', authors: 'Fine JP, Gray RJ', year: 1999, title: 'A proportional hazards model for the subdistribution of a competing risk', venue: 'J Am Stat Assoc 94:496–509', doi: '10.1080/01621459.1999.10474144', topic: 'Competing risks' },
  gray1988: { short: 'Gray 1988', authors: 'Gray RJ', year: 1988, title: 'A class of K-sample tests for comparing the cumulative incidence of a competing risk', venue: 'Ann Stat 16:1141–1154', doi: '10.1214/aos/1176350951', topic: 'Competing risks' },
  aalenJohansen1978: { short: 'Aalen & Johansen 1978', authors: 'Aalen OO, Johansen S', year: 1978, title: 'An empirical transition matrix for non-homogeneous Markov chains based on censored observations', venue: 'Scand J Stat 5:141–150', topic: 'Competing risks' },
  putter2007: { short: 'Putter et al. 2007', authors: 'Putter H, Fiocco M, Geskus RB', year: 2007, title: 'Tutorial in biostatistics: competing risks and multi-state models', venue: 'Stat Med 26:2389–2430', doi: '10.1002/sim.2712', topic: 'Competing risks' },
  austin2016: { short: 'Austin et al. 2016', authors: 'Austin PC, Lee DS, Fine JP', year: 2016, title: 'Introduction to the analysis of survival data in the presence of competing risks', venue: 'Circulation 133:601–609', doi: '10.1161/CIRCULATIONAHA.115.017719', topic: 'Competing risks' },
  latouche2013: { short: 'Latouche et al. 2013', authors: 'Latouche A, Allignol A, Beyersmann J, Labopin M, Fine JP', year: 2013, title: 'A competing risks analysis should report results on all cause-specific hazards and cumulative incidence functions', venue: 'J Clin Epidemiol 66:648–653', doi: '10.1016/j.jclinepi.2012.09.017', topic: 'Competing risks' },
  andersenKeiding2012: { short: 'Andersen & Keiding 2012', authors: 'Andersen PK, Keiding N', year: 2012, title: 'Interpretability and importance of functionals in competing risks and multistate models', venue: 'Stat Med 31:1074–1088', doi: '10.1002/sim.4385', topic: 'Competing risks' },
  austin2021: { short: 'Austin et al. 2021', authors: 'Austin PC, Steyerberg EW, Putter H', year: 2021, title: 'Fine-Gray subdistribution hazard models to simultaneously estimate the absolute risk of different event types: cumulative total failure probability may exceed 1', venue: 'Stat Med 40:4200–4212', doi: '10.1002/sim.9023', topic: 'Competing risks' },

  // ---- time-dependent / landmark ----
  anderson1983: { short: 'Anderson et al. 1983', authors: 'Anderson JR, Cain KC, Gelber RD', year: 1983, title: 'Analysis of survival by tumor response', venue: 'J Clin Oncol 1:710–719', doi: '10.1200/JCO.1983.1.11.710', topic: 'Time-dependent' },
  suissa2008: { short: 'Suissa 2008', authors: 'Suissa S', year: 2008, title: 'Immortal time bias in pharmacoepidemiology', venue: 'Am J Epidemiol 167:492–499', doi: '10.1093/aje/kwm324', topic: 'Time-dependent' },
  levesque2010: { short: 'Lévesque et al. 2010', authors: 'Lévesque LE, Hanley JA, Kezouh A, Suissa S', year: 2010, title: 'Problem of immortal time bias in cohort studies: example using statins for preventing progression of diabetes', venue: 'BMJ 340:b5087', doi: '10.1136/bmj.b5087', topic: 'Time-dependent' },
  vanHouwelingen2007: { short: 'van Houwelingen 2007', authors: 'van Houwelingen HC', year: 2007, title: 'Dynamic prediction by landmarking in event history analysis', venue: 'Scand J Stat 34:70–85', doi: '10.1111/j.1467-9469.2006.00529.x', topic: 'Time-dependent' },
  hernanRobins2016: { short: 'Hernán & Robins 2016', authors: 'Hernán MA, Robins JM', year: 2016, title: 'Using big data to emulate a target trial when a randomized trial is not available', venue: 'Am J Epidemiol 183:758–764', doi: '10.1093/aje/kwv254', topic: 'Time-dependent' },

  // ---- recurrent & multi-state ----
  andersenGill1982: { short: 'Andersen & Gill 1982', authors: 'Andersen PK, Gill RD', year: 1982, title: "Cox's regression model for counting processes: a large sample study", venue: 'Ann Stat 10:1100–1120', doi: '10.1214/aos/1176345976', topic: 'Recurrent & multi-state' },
  pwp1981: { short: 'Prentice et al. 1981', authors: 'Prentice RL, Williams BJ, Peterson AV', year: 1981, title: 'On the regression analysis of multivariate failure time data', venue: 'Biometrika 68:373–379', doi: '10.1093/biomet/68.2.373', topic: 'Recurrent & multi-state' },
  wlw1989: { short: 'Wei et al. 1989', authors: 'Wei LJ, Lin DY, Weissfeld L', year: 1989, title: 'Regression analysis of multivariate incomplete failure time data by modeling marginal distributions', venue: 'J Am Stat Assoc 84:1065–1073', doi: '10.1080/01621459.1989.10478873', topic: 'Recurrent & multi-state' },
  ghoshLin2000: { short: 'Ghosh & Lin 2000', authors: 'Ghosh D, Lin DY', year: 2000, title: 'Nonparametric analysis of recurrent events and death', venue: 'Biometrics 56:554–562', doi: '10.1111/j.0006-341X.2000.00554.x', topic: 'Recurrent & multi-state' },
  amorim2015: { short: 'Amorim & Cai 2015', authors: 'Amorim LDAF, Cai J', year: 2015, title: 'Modelling recurrent events: a tutorial for analysis in epidemiology', venue: 'Int J Epidemiol 44:324–333', doi: '10.1093/ije/dyu222', topic: 'Recurrent & multi-state' },
  mstate: { short: 'de Wreede et al. 2011', authors: 'de Wreede LC, Fiocco M, Putter H', year: 2011, title: 'mstate: an R package for the analysis of competing risks and multi-state models', venue: 'J Stat Softw 38(7):1–30', doi: '10.18637/jss.v038.i07', topic: 'Software' },

  // ---- prediction ----
  harrell1982: { short: 'Harrell et al. 1982', authors: 'Harrell FE, Califf RM, Pryor DB, Lee KL, Rosati RA', year: 1982, title: 'Evaluating the yield of medical tests', venue: 'JAMA 247:2543–2546', doi: '10.1001/jama.1982.03320430047030', topic: 'Prediction' },
  uno2011: { short: 'Uno et al. 2011', authors: "Uno H, Cai T, Pencina MJ, D'Agostino RB, Wei LJ", year: 2011, title: 'On the C-statistics for evaluating overall adequacy of risk prediction procedures with censored survival data', venue: 'Stat Med 30:1105–1117', doi: '10.1002/sim.4154', topic: 'Prediction' },
  graf1999: { short: 'Graf et al. 1999', authors: 'Graf E, Schmoor C, Sauerbrei W, Schumacher M', year: 1999, title: 'Assessment and comparison of prognostic classification schemes for survival data', venue: 'Stat Med 18:2529–2545', doi: '10.1002/(SICI)1097-0258(19990915/30)18:17/18<2529::AID-SIM274>3.0.CO;2-5', topic: 'Prediction' },
  kattan2018: { short: 'Kattan & Gerds 2018', authors: 'Kattan MW, Gerds TA', year: 2018, title: 'The index of prediction accuracy: an intuitive measure useful for evaluating risk prediction models', venue: 'Diagn Progn Res 2:7', doi: '10.1186/s41512-018-0029-2', topic: 'Prediction' },
  vanCalster2019: { short: 'Van Calster et al. 2019', authors: 'Van Calster B, McLernon DJ, van Smeden M, Wynants L, Steyerberg EW', year: 2019, title: 'Calibration: the Achilles heel of predictive analytics', venue: 'BMC Med 17:230', doi: '10.1186/s12916-019-1466-7', topic: 'Prediction' },
  austin2020ici: { short: 'Austin et al. 2020', authors: 'Austin PC, Harrell FE Jr, van Klaveren D', year: 2020, title: 'Graphical calibration curves and the integrated calibration index (ICI) for survival models', venue: 'Stat Med 39:2714–2742', doi: '10.1002/sim.8570', topic: 'Prediction' },
  riley2019: { short: 'Riley et al. 2019', authors: 'Riley RD, Snell KIE, Ensor J, et al.', year: 2019, title: 'Minimum sample size for developing a multivariable prediction model: PART II — binary and time-to-event outcomes', venue: 'Stat Med 38:1276–1296', doi: '10.1002/sim.7992', topic: 'Prediction' },
  riley2024: { short: 'Riley et al. 2024', authors: 'Riley RD, Archer L, Snell KIE, et al.', year: 2024, title: 'Evaluation of clinical prediction models (part 2): how to undertake an external validation study', venue: 'BMJ 384:e074820', doi: '10.1136/bmj-2023-074820', topic: 'Prediction' },
  roystonAltman2013: { short: 'Royston & Altman 2013', authors: 'Royston P, Altman DG', year: 2013, title: 'External validation of a Cox prognostic model: principles and methods', venue: 'BMC Med Res Methodol 13:33', doi: '10.1186/1471-2288-13-33', topic: 'Prediction' },
  tripodAI: { short: 'Collins et al. 2024', authors: 'Collins GS, Moons KGM, Dhiman P, et al.', year: 2024, title: 'TRIPOD+AI statement: updated guidance for reporting clinical prediction models that use regression or machine learning methods', venue: 'BMJ 385:e078378', doi: '10.1136/bmj-2023-078378', topic: 'Reporting & design' },
  probastAI: { short: 'Moons et al. 2025', authors: 'Moons KGM, Damen JAA, Kaul T, et al.', year: 2025, title: 'PROBAST+AI: an updated quality, risk of bias, and applicability assessment tool for prediction models using regression or artificial intelligence methods', venue: 'BMJ 388:e082505', doi: '10.1136/bmj-2024-082505', topic: 'Reporting & design' },
  consort2025: { short: 'Hopewell et al. 2025', authors: 'Hopewell S, Chan AW, Collins GS, et al.', year: 2025, title: 'CONSORT 2025 statement: updated guideline for reporting randomised trials', venue: 'BMJ 389:e081123', doi: '10.1136/bmj-2024-081123', topic: 'Reporting & design' },
  ichE9R1: { short: 'ICH E9(R1) 2019', authors: 'International Council for Harmonisation', year: 2019, title: 'E9(R1) Addendum on estimands and sensitivity analysis in clinical trials', venue: 'ICH Harmonised Guideline (Step 4, Nov 2019)', url: 'https://database.ich.org/sites/default/files/E9-R1_Step4_Guideline_2019_1203.pdf', topic: 'Reporting & design' },
  wolbers2009: { short: 'Wolbers et al. 2009', authors: 'Wolbers M, Koller MT, Witteman JCM, Steyerberg EW', year: 2009, title: 'Prognostic models with competing risks: methods and application to coronary risk prediction', venue: 'Epidemiology 20:555–561', doi: '10.1097/EDE.0b013e3181a39056', topic: 'Prediction' },

  // ---- machine learning ----
  ishwaran2008: { short: 'Ishwaran et al. 2008', authors: 'Ishwaran H, Kogalur UB, Blackstone EH, Lauer MS', year: 2008, title: 'Random survival forests', venue: 'Ann Appl Stat 2:841–860', doi: '10.1214/08-AOAS169', topic: 'Prediction' },
  tibshirani1997: { short: 'Tibshirani 1997', authors: 'Tibshirani R', year: 1997, title: 'The lasso method for variable selection in the Cox model', venue: 'Stat Med 16:385–395', doi: '10.1002/(SICI)1097-0258(19970228)16:4<385::AID-SIM380>3.0.CO;2-3', topic: 'Prediction' },
  simon2011: { short: 'Simon et al. 2011', authors: 'Simon N, Friedman J, Hastie T, Tibshirani R', year: 2011, title: "Regularization paths for Cox's proportional hazards model via coordinate descent", venue: 'J Stat Softw 39(5):1–13', doi: '10.18637/jss.v039.i05', topic: 'Prediction' },
  katzman2018: { short: 'Katzman et al. 2018', authors: 'Katzman JL, Shaham U, Cloninger A, Bates J, Jiang T, Kluger Y', year: 2018, title: 'DeepSurv: personalized treatment recommender system using a Cox proportional hazards deep neural network', venue: 'BMC Med Res Methodol 18:24', doi: '10.1186/s12874-018-0482-1', topic: 'Prediction' },
  christodoulou2019: { short: 'Christodoulou et al. 2019', authors: 'Christodoulou E, Ma J, Collins GS, Steyerberg EW, Verbakel JY, Van Calster B', year: 2019, title: 'A systematic review shows no performance benefit of machine learning over logistic regression for clinical prediction models', venue: 'J Clin Epidemiol 110:12–22', doi: '10.1016/j.jclinepi.2019.02.004', topic: 'Prediction' },
  bhattacharya2025: { short: 'Bhattacharya & Bentley 2025', authors: 'Bhattacharya K, Bentley JP', year: 2025, title: 'Comparison of machine learning methods versus traditional Cox regression for survival prediction in cancer using real-world data: a systematic literature review and meta-analysis', venue: 'BMC Med Res Methodol 25', doi: '10.1186/s12874-025-02694-z', topic: 'Prediction' },

  // ---- software ----
  survivalR: { short: 'Therneau survival', authors: 'Therneau TM', year: 'current', title: 'survival: A Package for Survival Analysis in R', venue: 'CRAN', url: 'https://CRAN.R-project.org/package=survival', topic: 'Software' },
  lifelines: { short: 'Davidson-Pilon 2019', authors: 'Davidson-Pilon C', year: 2019, title: 'lifelines: survival analysis in Python', venue: 'J Open Source Softw 4(40):1317', doi: '10.21105/joss.01317', topic: 'Software' },
  sksurv: { short: 'Pölsterl 2020', authors: 'Pölsterl S', year: 2020, title: 'scikit-survival: a library for time-to-event analysis built on top of scikit-learn', venue: 'J Mach Learn Res 21(212):1–6', url: 'https://jmlr.org/papers/v21/20-729.html', topic: 'Software' },
} satisfies Record<string, Reference>

export type RefKey = keyof typeof REFS
export const REFERENCES: Record<RefKey, Reference> = REFS
