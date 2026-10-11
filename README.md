# Préstamos Familia

[![Backend CI](https://github.com/att-22/prestamos-familia/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/att-22/prestamos-familia/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/att-22/prestamos-familia/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/att-22/prestamos-familia/actions/workflows/frontend-ci.yml)

A web app that shows what financing a purchase really costs compared with paying cash.

Retailers and lenders sell a monthly payment. Whether it is a car, an appliance
or a renovation, this app turns a financing offer into the numbers
that matter — total paid, real APR, and how much more it costs than cash — and
explains them in plain language for people with no financial background. The UI
is in Spanish because that is who it was built for.

![Analysis of a financing offer with a balloon payment](docs/screenshot.png)

## What it does

- **Track purchases and offers.** Save what you are thinking of buying — a
  vehicle, something for the home, a renovation, electronics — and every
  financing offer you get for it.
- **Cash vs. financing.** Total cost of the offer (down payment, instalments,
  balloon payment, mandatory insurance and fees) against the cash price.
- **Effective APR.** Recomputes the APR (TAE) from the actual cash flows, so it
  can be checked against the rate the lender declares.
- **Plain-language alerts.** Around twenty rules flag things worth questioning
  before signing: a high APR, a gap between nominal rate and APR, opening or
  early-repayment fees, tied insurance, long terms, and a large final payment.
- **Personal affordability.** Optionally enter monthly income and savings to see
  the debt-to-income ratio and what is left after the down payment.
- **Shareable results.** Saved comparisons get a public link that shows the
  analysis without the income and savings figures.
- **Glossary.** Searchable definitions of the terms a lender will use.

## How the numbers work

| Figure | Formula |
|--------|---------|
| Financed amount | `cash price − down payment` |
| Fees | `opening fee + financed amount × opening fee %` |
| Insurance | `yearly insurance × months / 12` |
| Total financing cost | `down payment + instalments + balloon payment + insurance + fees` |
| Extra cost vs. cash | `total financing cost − cash price` |
| Effective APR | Monthly rate `r` that solves `financed − fees = Σ instalment/(1+r)ⁿ + balloon/(1+r)ᴺ`, annualised as `(1+r)¹² − 1` |

The balloon payment (residual value) is counted as a cost because the comparison
is about *owning* what you bought: it is what must be paid at the end to keep it. All
money is handled as `Decimal` end to end, never as floats.

The logic lives in [`backend/app/services`](backend/app/services) and is covered
by unit tests.

## Tech stack

| Layer | Tools |
|-------|-------|
| Backend | FastAPI, SQLModel, PostgreSQL 16, Alembic, JWT auth |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form + Zod |
| Quality | pytest, ruff, mypy · Vitest, ESLint, `tsc` |
| Tooling | Docker Compose, GitHub Actions |

## Project structure

```
backend/
  app/
    api/routes/     HTTP endpoints (auth, purchases, financing offers, comparisons)
    core/           settings, database session, JWT helpers
    models/         SQLModel tables
    schemas/        request/response models
    services/       cost calculation and alert rules (pure functions)
  alembic/          database migrations
  tests/            unit tests for the services, API tests against PostgreSQL
frontend/
  src/
    components/     UI primitives, forms, comparison views, layout
    hooks/          auth context and TanStack Query hooks
    pages/          one component per route
    services/       typed API client
.github/workflows/  CI pipelines
docker-compose.yml  local development stack
```

## Running locally

Requires Docker.

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

Migrations run automatically when the backend container starts. In development
the login screen has shortcut buttons that sign in as demo users, so no account
setup is needed.

## Tests and checks

```bash
# Backend
docker compose exec backend pytest
docker compose exec backend ruff check app/ tests/
docker compose exec backend mypy app/

# Frontend
cd frontend
npm ci
npm run lint && npx tsc --noEmit && npm run test -- --run && npm run build
```

The API tests run against a real PostgreSQL database inside a transaction that
is rolled back after each test, so they leave no data behind.

After changing a model, generate a migration and review it before committing:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe the change"
docker compose exec backend alembic upgrade head
```

## CI/CD

Each half of the monorepo has its own GitHub Actions workflow, triggered only
when files under its directory change, on pushes to `main` and on pull requests.

| Workflow | Job | What it does |
|----------|-----|--------------|
| `backend-ci.yml` | `test` | Starts PostgreSQL as a service container, then runs ruff, mypy, the migrations and pytest with coverage |
| `backend-ci.yml` | `docker` | Builds the production image to make sure it still builds |
| `frontend-ci.yml` | `test` | ESLint, type check, Vitest and a production build |
| `frontend-ci.yml` | `deploy` | Deploys to Vercel — a preview for pull requests, production on `main` |

The deploy job is skipped until the `VERCEL_TOKEN`, `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` repository secrets are set.

## Configuration

Docker Compose provides working defaults for local development. For other
environments:

**Backend**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_JWT_SECRET` | Secret used to sign and verify JWTs |
| `SUPABASE_URL` | Supabase project URL |
| `ENVIRONMENT` | `development`, `test` or `production` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins |

**Frontend**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API |

## Status and roadmap

The app is fully usable locally. It is not deployed yet because sign-in currently
relies on a development-only endpoint (`POST /auth/dev-token`), which is disabled
when `ENVIRONMENT=production`.

Planned next:

- Production sign-in with email magic links
- Side-by-side comparison of several offers for the same purchase
- "What if" sliders to explore a larger down payment or a shorter term
- Including mandatory insurance in the effective APR

---

This tool is not financial advice.
