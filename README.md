# Préstamos Familia

[![Backend CI](https://github.com/att-22/prestamos-familia/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/att-22/prestamos-familia/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/att-22/prestamos-familia/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/att-22/prestamos-familia/actions/workflows/frontend-ci.yml)

A web app that shows what financing a purchase really costs compared with paying cash.

Retailers and lenders sell a monthly payment. Whether it is a car, an appliance
or a renovation, this app turns a financing offer into the numbers
that matter — total paid, real APR, and how much more it costs than cash — and
explains them in plain language for people with no financial background. The UI
is in Spanish because that is who it was built for.

![Analysis of a financing offer with a balloon payment: verdict, totals and breakdown](docs/analysis.png)

## What it does

- **Track purchases and offers.** Save what you are thinking of buying — a
  vehicle, something for the home, a renovation, electronics — and every
  financing offer you get for it.
- **Cash vs. financing.** Total cost of the offer (down payment, instalments,
  balloon payment, mandatory insurance and fees) against the cash price.
- **Offers side by side.** With two or more offers for the same purchase, a
  table ranks them by total cost and marks the cheapest and the one with the
  lowest instalment, which are often not the same.
- **A one-sentence verdict.** Every analysis opens with its conclusion in plain
  words, before any figures.
- **Amortisation schedule.** A chart and a table, by year or by month, of how
  each instalment splits between interest and principal.
- **"What if" simulator.** Sliders for the down payment and the term show how
  the instalment and the total cost would change at the same interest rate.
- **Effective APR.** Recomputes the APR (TAE) from the actual cash flows, so it
  can be checked against the rate the lender declares.
- **Plain-language alerts.** Around twenty rules flag things worth questioning
  before signing: a high APR, a gap between nominal rate and APR, opening or
  early-repayment fees, tied insurance, long terms, and a large final payment.
  What counts as a high APR or a long term depends on what is being bought: five
  years is normal for a car and far too long for a phone.
- **Personal affordability.** Optionally enter monthly income and savings to see
  the debt-to-income ratio and what is left after the down payment.
- **Shareable results.** Saved comparisons get a public link that shows the
  analysis without the income and savings figures.
- **PDF.** Any analysis, including a shared one, can be saved as a PDF: a print
  stylesheet leaves out navigation and controls.
- **Glossary.** Searchable definitions of the terms a lender will use.

## Screenshots

Three offers for the same car, ranked by what you end up paying:

![Offers for one purchase ranked by total cost](docs/offers.png)

How each instalment of the balloon offer splits between interest and principal:

![Amortisation chart and yearly table](docs/amortization.png)

The same offer with a larger down payment and a longer term:

![What-if simulator with the down payment and term changed](docs/simulator.png)

## How the numbers work

| Figure | Formula |
|--------|---------|
| Financed amount | `cash price − down payment` |
| Fees | `opening fee + financed amount × opening fee %` |
| Insurance | `yearly insurance × months / 12` |
| Total financing cost | `down payment + instalments + balloon payment + insurance + fees` |
| Extra cost vs. cash | `total financing cost − cash price` |
| Effective APR | Monthly rate `r` that solves `financed − fees = Σ (instalment + insurance/12)/(1+r)ⁿ + balloon/(1+r)ᴺ`, annualised as `(1+r)¹² − 1` |

The balloon payment (residual value) is counted as a cost because the comparison
is about *owning* what you bought: it is what must be paid at the end to keep it. All
money is handled as `Decimal` end to end, never as floats.

The logic lives in [`backend/app/services`](backend/app/services) and is covered
by unit tests.

## Tech stack

| Layer | Tools |
|-------|-------|
| Backend | FastAPI, SQLModel, PostgreSQL 16, Alembic, JWT auth with bcrypt passwords |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Hook Form + Zod |
| Quality | pytest, ruff, mypy · Vitest, Playwright, ESLint, `tsc` |
| Tooling | Docker Compose, GitHub Actions |

## Project structure

```
backend/
  app/
    api/routes/     HTTP endpoints (auth, admin, purchases, financing offers, comparisons)
    core/           settings, database session, JWT helpers
    models/         SQLModel tables
    schemas/        request/response models
    services/       cost calculation and alert rules (pure functions)
  alembic/          database migrations
  tests/            unit tests for the services, API tests against PostgreSQL
frontend/
  e2e/              Playwright end-to-end tests
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

Migrations run automatically when the backend container starts.

To get in, either use the demo buttons on the login screen (development only),
or create an account: by default any `@familia.com` address can register, no
registration code is needed and `admin@familia.com` is the administrator.

To use it for real, create a `.env` file next to `docker-compose.yml` with your
own address as administrator, restart with `docker compose up -d`, register with
that address and add everyone else from the **Administración** page:

```env
ADMIN_EMAIL=you@example.com
REGISTRATION_CODE=something-only-the-family-knows
ALLOWED_EMAILS=
```

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

### End-to-end tests

A Playwright suite in [`frontend/e2e`](frontend/e2e) drives the app in a real
browser: signing in, creating purchases and offers, checking the calculated
figures, saving a comparison and opening its public link as an anonymous visitor.
Each test signs in as a fresh user, so tests do not share data.

```bash
docker compose up -d                # the tests need the app running
cd frontend
npx playwright install chromium     # first time only
npm run test:e2e
```

After changing a model, generate a migration and review it before committing:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe the change"
docker compose exec backend alembic upgrade head
```

## CI/CD

Each half of the monorepo has its own GitHub Actions workflow, and a third one
runs the end-to-end tests. All of them run on every pull request; on pushes to
`main` the backend and frontend workflows only run when their directory changed.

| Workflow | Job | What it does |
|----------|-----|--------------|
| `backend-ci.yml` | `test` | Starts PostgreSQL as a service container, then runs ruff, mypy, the migrations and pytest with coverage |
| `backend-ci.yml` | `docker` | Builds the production image (multi-stage, runs as a non-root user), starts it against PostgreSQL with production settings and checks `/healthz`. On `main` it then publishes the image to GitHub Container Registry as `ghcr.io/att-22/prestamos-familia-backend`, tagged `latest` and `sha-<commit>` |
| `frontend-ci.yml` | `test` | ESLint, type check, Vitest and a production build |
| `frontend-ci.yml` | `deploy` | Deploys to Vercel — a preview for pull requests, production on `main` |
| `e2e.yml` | `e2e` | Starts PostgreSQL, the API and the production build of the frontend, then runs the Playwright suite against them. The report and traces are uploaded when a test fails |

The deploy job is skipped until the `VERCEL_TOKEN`, `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID` repository secrets are set.

Dependabot opens one grouped pull request a week per ecosystem (pip, npm and
GitHub Actions) for minor and patch releases, and a separate one for each major
version, so they go through the same checks as any other change.

## Deployment

Everything fits in free tiers:

| Part | Where | How it gets there |
|------|-------|-------------------|
| Frontend | [Vercel](https://vercel.com) | The `deploy` job of `frontend-ci.yml` |
| API | [Render](https://render.com), as a Docker web service | Render deploys `main` once its checks pass (`autoDeployTrigger: checksPass` in [`render.yaml`](render.yaml)) |
| Database | [Neon](https://neon.tech) PostgreSQL | Migrations run when the API container starts |

The database is not on Render because its free PostgreSQL is deleted after 30
days. The free API instance sleeps after 15 minutes without traffic, so the
first request after a pause takes about a minute.

To set it up:

1. **Neon** — create a project and copy its connection string.
2. **Render** — *New → Blueprint*, pick this repository and fill in the values
   it asks for: `DATABASE_URL` (from Neon), `ADMIN_EMAIL`, `REGISTRATION_CODE`
   and `CORS_ORIGINS` (the Vercel URL, once known). `JWT_SECRET` is generated.
3. **Vercel** — run `npx vercel link` inside `frontend/`, set `VITE_API_URL` to
   the Render URL in the project's environment variables, and add the three
   `VERCEL_*` secrets to this repository.

`/healthz` answers 503 when the database is unreachable, which is what Render
uses to decide whether a new deploy is healthy.

## Configuration

Docker Compose provides working defaults for local development. For other
environments:

**Backend**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs. At least 32 characters in production |
| `ADMIN_EMAIL` | Address of the administrator, who manages the allow-list from the app |
| `ALLOWED_EMAILS` | Optional fixed allow-list on top of the administrator's: comma-separated addresses or domains (`@example.org`) |
| `REGISTRATION_CODE` | Shared secret required to register. Mandatory in production |
| `ENVIRONMENT` | `development`, `test` or `production` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins |

**Frontend**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API |

## Accounts and access

The app is meant for a closed group, so there is no open sign-up:

- **Allow-list.** Only authorised addresses can create an account. The
  administrator manages the list from the **Administración** page inside the
  app, adding either an exact address or a whole domain (`@example.org`).
  Removing an entry blocks new registrations but leaves existing accounts alone.
- **Administrator.** The account whose address is set in `ADMIN_EMAIL`. It can
  always register, chooses its own password like everyone else, and gets the
  admin page. No administrator password is stored in configuration.
- **Registration code.** Registering also requires `REGISTRATION_CODE`, a shared
  secret handed out by whoever runs the app. Emails are not verified, so this is
  what stops a stranger from claiming an allowed address first. It is mandatory
  in production.
- **Passwords** are at least 10 characters and stored as bcrypt hashes. They
  can be changed from the account page, which asks for the current one.
- **Leaving.** Anyone can delete their own account, with everything saved in
  it, from the account page.
- **Brute force.** Five failed attempts for an address from the same IP block
  further attempts for 15 minutes, and so do twenty for an address from any IP:
  behind a proxy the client address comes from a header that can be forged. The
  counters are kept in memory, which is enough for a single backend instance.
- **Forgotten passwords.** There is no email service, so the administrator
  resets them from the admin page. That clears the password without the
  administrator ever knowing one: the person picks a new one through "Crea tu
  cuenta" with the registration code, and keeps their data. With shell access
  there is also a command that sets a password directly:

  ```bash
  docker compose exec backend python -m app.cli reset-password someone@example.com
  ```

`POST /auth/dev-token`, used by the demo buttons and the tests, signs in as any
address without a password and returns 404 when `ENVIRONMENT=production`.

---

This tool is not financial advice.
