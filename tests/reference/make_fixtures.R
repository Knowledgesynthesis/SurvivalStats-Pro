# Generates reference datasets and R `survival` results used by the vitest suites.
# Run from the repo root:  Rscript tests/reference/make_fixtures.R
suppressPackageStartupMessages({ library(survival); library(jsonlite) })
set.seed(20260101)
out <- list(meta = list(R = R.version.string, survival = as.character(packageVersion("survival"))))

# ---- Freireich et al. (1963) 6-MP vs placebo remission times (Gehan 1965) ----
mp_t  <- c(6,6,6,7,10,13,16,22,23,6,9,10,11,17,19,20,25,32,32,34,35)
mp_s  <- c(1,1,1,1, 1, 1, 1, 1, 1,0,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
pl_t  <- c(1,1,2,2,3,4,4,5,5,8,8,8,8,11,11,12,12,15,17,22,23)
leuk <- data.frame(time = c(mp_t, pl_t), status = c(mp_s, rep(1, 21)), placebo = rep(c(0, 1), each = 21))
out$leuk <- leuk

kmrows <- function(fit) list(time = fit$time, n_risk = fit$n.risk, n_event = fit$n.event, surv = fit$surv,
                            std_err = fit$std.err, lower = fit$lower, upper = fit$upper, cumhaz = fit$cumhaz)
mp <- subset(leuk, placebo == 0)
out$km_leuk <- list(
  log = kmrows(survfit(Surv(time, status) ~ 1, data = mp, conf.type = "log")),
  loglog = kmrows(survfit(Surv(time, status) ~ 1, data = mp, conf.type = "log-log")),
  plain = kmrows(survfit(Surv(time, status) ~ 1, data = mp, conf.type = "plain")),
  median_mp = unname(summary(survfit(Surv(time, status) ~ 1, data = mp))$table[c("median", "0.95LCL", "0.95UCL")]),
  median_pl = unname(summary(survfit(Surv(time, status) ~ 1, data = subset(leuk, placebo == 1)))$table[c("median", "0.95LCL", "0.95UCL")]),
  rmean_mp = unname(summary(survfit(Surv(time, status) ~ 1, data = mp), rmean = 30)$table[c("rmean", "se(rmean)")]),
  rmean_pl = unname(summary(survfit(Surv(time, status) ~ 1, data = subset(leuk, placebo == 1)), rmean = 30)$table[c("rmean", "se(rmean)")])
)
sd0 <- survdiff(Surv(time, status) ~ placebo, data = leuk)
sd1 <- survdiff(Surv(time, status) ~ placebo, data = leuk, rho = 1)
out$logrank_leuk <- list(chisq = sd0$chisq, obs = sd0$obs, exp = sd0$exp, var = sd0$var, chisq_rho1 = sd1$chisq)
cox_summ <- function(fit) {
  s <- summary(fit)
  list(coef = unname(coef(fit)), se = unname(sqrt(diag(vcov(fit)))), loglik = fit$loglik,
       score = unname(fit$score), wald = unname(fit$wald.test), iter = fit$iter,
       concordance = unname(fit$concordance["concordance"]))
}
out$cox_leuk_efron <- cox_summ(coxph(Surv(time, status) ~ placebo, data = leuk, ties = "efron"))
out$cox_leuk_breslow <- cox_summ(coxph(Surv(time, status) ~ placebo, data = leuk, ties = "breslow"))

# ---- d1: 3 covariates, Weibull baseline, ties from rounding ----
n <- 160
d1 <- data.frame(x1 = round(rnorm(n), 3), x2 = rbinom(n, 1, 0.5), x3 = round(runif(n), 3))
lp <- 0.5 * d1$x1 - 0.7 * d1$x2 + 0.3 * d1$x3
tt <- (-log(runif(n)) / (0.08 * exp(lp)))^(1 / 1.3)
cc <- rexp(n, 0.04)
d1$time <- pmax(round(pmin(tt, cc), 1), 0.1)
d1$status <- as.integer(tt <= cc)
d1$g <- rep(c("a", "b", "c"), length.out = n)
out$d1 <- d1
for (ties in c("efron", "breslow")) {
  f <- coxph(Surv(time, status) ~ x1 + x2 + x3, data = d1, ties = ties)
  r <- cox_summ(f)
  bh <- basehaz(f, centered = TRUE)
  r$basehaz_time <- bh$time; r$basehaz <- bh$hazard
  sch <- residuals(f, "schoenfeld"); r$schoenfeld <- unname(as.matrix(sch)); r$sch_time <- as.numeric(rownames(as.matrix(sch)))
  r$scaledsch <- unname(as.matrix(residuals(f, "scaledsch")))
  r$martingale <- unname(residuals(f, "martingale"))
  # classic (survival < 3.0) Grambsch–Therneau test, km transform
  ndead <- nrow(as.matrix(sch)); vv <- f$var
  temp <- survfit(Surv(time, status) ~ 1, data = d1)
  t1 <- temp$surv[temp$n.event > 0]; t2 <- temp$n.event[temp$n.event > 0]
  km <- rep(c(1, t1), c(t2, 0)); xx <- (1 - km) - mean(1 - km)
  r2 <- as.matrix(sch) %*% vv * ndead
  test <- xx %*% r2
  r$zph_old_chisq <- c(test^2 / (diag(vv) * ndead * sum(xx^2)))
  tg <- c(xx %*% as.matrix(sch)); r$zph_old_global <- c(tg %*% vv %*% tg) * ndead / sum(xx^2)
  r$zph_new <- unname(cox.zph(f)$table[, "chisq"])
  out[[paste0("cox_d1_", ties)]] <- r
}
fr <- coxph(Surv(time, status) ~ ridge(x1, x2, x3, theta = 5, scale = FALSE), data = d1, ties = "breslow")
out$cox_d1_ridge5 <- list(coef = unname(coef(fr)))
fs <- coxph(Surv(time, status) ~ x1 + x2 + strata(g), data = d1)
out$cox_d1_strata <- cox_summ(fs)
out$logrank_d1_3grp <- list(chisq = survdiff(Surv(time, status) ~ g, data = d1)$chisq,
                            chisq_strat = survdiff(Surv(time, status) ~ x2 + strata(g), data = d1)$chisq)
f1 <- survfit(Surv(time, status) ~ 1, data = d1)
out$km_d1 <- list(median = unname(summary(f1)$table[c("median", "0.95LCL", "0.95UCL")]),
                  rmean = unname(summary(f1, rmean = 15)$table[c("rmean", "se(rmean)")]))
# left truncation
d1$entry <- round(pmin(runif(n, 0, 3), d1$time - 0.05), 2)
out$d1_entry <- d1$entry
ft <- survfit(Surv(entry, time, status) ~ 1, data = d1)
out$km_d1_trunc <- list(time = ft$time, n_risk = ft$n.risk, surv = ft$surv)

# ---- counting process with a time-varying covariate ----
m <- 120
sw <- rexp(m, 0.15); base <- rexp(m, 0.08)
rows <- list()
for (i in 1:m) {
  T0 <- base[i]; C <- runif(1, 5, 25)
  if (sw[i] < min(T0, C)) {
    # after switching, hazard multiplied by 0.5: residual time stretched by 2
    T <- sw[i] + (T0 - sw[i]) * 2
    stop2 <- min(T, C)
    rows[[length(rows) + 1]] <- data.frame(id = i, start = 0, stop = round(sw[i], 2), status = 0, z = 0)
    rows[[length(rows) + 1]] <- data.frame(id = i, start = round(sw[i], 2), stop = round(stop2, 2), status = as.integer(T <= C), z = 1)
  } else {
    rows[[length(rows) + 1]] <- data.frame(id = i, start = 0, stop = round(min(T0, C), 2), status = as.integer(T0 <= C), z = 0)
  }
}
cp <- do.call(rbind, rows); cp <- cp[cp$stop > cp$start, ]
out$cp <- cp
out$cox_cp <- cox_summ(coxph(Surv(start, stop, status) ~ z, data = cp))

# ---- recurrent events with gamma frailty (Andersen–Gill, robust SE) ----
k <- 80; rr <- list()
for (i in 1:k) {
  x <- rbinom(1, 1, 0.5); fr_i <- rgamma(1, shape = 1 / 0.8, scale = 0.8); fu <- runif(1, 4, 10)
  t <- 0; rate <- 0.4 * fr_i * exp(-0.5 * x)
  repeat {
    t2 <- t + rexp(1, rate)
    if (t2 >= fu) { rr[[length(rr) + 1]] <- data.frame(id = i, start = round(t, 3), stop = round(fu, 3), status = 0, x = x); break }
    rr[[length(rr) + 1]] <- data.frame(id = i, start = round(t, 3), stop = round(t2, 3), status = 1, x = x); t <- t2
  }
}
rec <- do.call(rbind, rr); rec <- rec[rec$stop > rec$start, ]
out$rec <- rec
fag <- coxph(Surv(start, stop, status) ~ x + cluster(id), data = rec, ties = "breslow")
out$cox_rec <- list(coef = unname(coef(fag)), se_naive = unname(sqrt(diag(fag$naive.var))), se_robust = unname(sqrt(diag(vcov(fag)))))

# ---- competing risks ----
N <- 220
z1 <- rbinom(N, 1, 0.5); z2 <- round(rnorm(N), 3)
t1 <- rexp(N, 0.05 * exp(0.6 * z1 + 0.3 * z2)); t2 <- rexp(N, 0.04 * exp(-0.4 * z1)); cz <- rexp(N, 0.02)
tm <- pmin(t1, t2, cz)
cause <- ifelse(tm == cz, 0, ifelse(tm == t1, 1, 2))
cr <- data.frame(id = 1:N, time = round(tm, 2), cause = cause, z1 = z1, z2 = z2)
cr$time[cr$time == 0] <- 0.01
out$cr <- cr
aj <- survfit(Surv(time, factor(cause, 0:2)) ~ 1, data = cr)
out$cif_cr <- list(time = aj$time, pstate = unname(aj$pstate), states = aj$states)
fg <- finegray(Surv(time, factor(cause, 0:2)) ~ z1 + z2 + id, data = cr, etype = "1")
ffg <- coxph(Surv(fgstart, fgstop, fgstatus) ~ z1 + z2, weights = fgwt, data = fg)
ffg_r <- coxph(Surv(fgstart, fgstop, fgstatus) ~ z1 + z2 + cluster(id), weights = fgwt, data = fg)
out$finegray_cr <- list(coef = unname(coef(ffg)), se = unname(sqrt(diag(ffg_r$naive.var))), se_robust = unname(sqrt(diag(vcov(ffg_r)))), nrow = nrow(fg))
fcs <- coxph(Surv(time, cause == 1) ~ z1 + z2, data = cr)
out$cscox_cr <- list(coef = unname(coef(fcs)), se = unname(sqrt(diag(vcov(fcs)))))

# ---- illness–death multi-state ----
M <- 200; ms <- list()
for (i in 1:M) {
  c0 <- runif(1, 3, 15); a <- rexp(1, 0.15); b <- rexp(1, 0.07)
  if (min(a, b) >= c0) { ms[[length(ms) + 1]] <- data.frame(id = i, start = 0, stop = round(c0, 2), from = "healthy", to = "censor"); next }
  if (b < a) { ms[[length(ms) + 1]] <- data.frame(id = i, start = 0, stop = round(b, 2), from = "healthy", to = "dead"); next }
  ms[[length(ms) + 1]] <- data.frame(id = i, start = 0, stop = round(a, 2), from = "healthy", to = "ill")
  d <- a + rexp(1, 0.25)
  if (d < c0) ms[[length(ms) + 1]] <- data.frame(id = i, start = round(a, 2), stop = round(d, 2), from = "ill", to = "dead")
  else ms[[length(ms) + 1]] <- data.frame(id = i, start = round(a, 2), stop = round(c0, 2), from = "ill", to = "censor")
}
ms <- do.call(rbind, ms); ms <- ms[ms$stop > ms$start, ]
out$ms <- ms
fms <- survfit(Surv(start, stop, factor(to, c("censor", "ill", "dead"))) ~ 1, data = ms, id = id,
               istate = factor(from, c("healthy", "ill", "dead")))
out$aj_ms <- list(time = fms$time, pstate = unname(fms$pstate), states = fms$states)

# ---- parametric fits ----
P <- 150
pt <- rweibull(P, shape = 1.5, scale = 10); pc <- runif(P, 2, 20)
par <- data.frame(time = round(pmin(pt, pc), 3), status = as.integer(pt <= pc))
out$par <- par
sr <- function(dist) { f <- survreg(Surv(time, status) ~ 1, data = par, dist = dist); list(coef = unname(coef(f)), scale = f$scale, loglik = f$loglik[1]) }
out$survreg <- list(exponential = sr("exponential"), weibull = sr("weibull"), lognormal = sr("lognormal"), loglogistic = sr("loglogistic"))
gll <- function(th) { a <- exp(th[2]); b <- th[1]; H <- (a / b) * (exp(b * par$time) - 1); -sum(par$status * (log(a) + b * par$time) - H) }
og <- optim(c(0.05, log(0.05)), gll, method = "BFGS", control = list(reltol = 1e-14, maxit = 1000))
out$gompertz <- list(shape = og$par[1], rate = exp(og$par[2]), loglik = -og$value)

# ---- special functions & smoother ----
zs <- c(-8, -3.2, -1.96, -0.5, 0, 0.7, 1.644853626951, 2.5, 6)
ps <- c(1e-10, 0.001, 0.025, 0.3, 0.5, 0.8, 0.975, 0.999999)
out$special <- list(z = zs, pnorm = pnorm(zs), p = ps, qnorm = qnorm(ps),
                    chisq_x = c(0.1, 3.84, 16.79, 40, 120), chisq_df = c(1, 1, 2, 5, 3),
                    pchisq_upper = pchisq(c(0.1, 3.84, 16.79, 40, 120), c(1, 1, 2, 5, 3), lower.tail = FALSE),
                    lgamma_x = c(0.3, 1, 2.5, 10, 101.7), lgamma = lgamma(c(0.3, 1, 2.5, 10, 101.7)))
lx <- round(runif(60, 0, 10), 3); ly <- round(sin(lx) + rnorm(60, 0, 0.3), 4)
lw <- lowess(lx, ly)
out$lowess <- list(x = lx, y = ly, fx = lw$x, fy = lw$y)

write_json(out, "tests/fixtures/r_reference.json", digits = NA, auto_unbox = TRUE, dataframe = "columns", matrix = "rowmajor")
cat("wrote tests/fixtures/r_reference.json\n")
