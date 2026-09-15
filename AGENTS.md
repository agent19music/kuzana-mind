<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent notes — Athena / Kuzana

Product and history: `CLAUDE.md`. Backend internals: `backend/CLAUDE.md`. This file is how to operate the repo without using the wrong host or local workflow.

## Hosting (current)

**Production backend is Render**, not Cloud Run.

| Piece | Where |
|---|---|
| Backend web service | Render Docker service `kuzana-mind` (`srv-dacg4b95efls73eamjfg`), repo root dir `backend/`, `https://kuzana-mind.onrender.com` |
| Production Postgres | Render Postgres `athena-db` (Frankfurt, pgvector) |
| Frontend | Separate Next.js apps (`apps/app`, `apps/marketing`) — not this Render service |
| Local backend | **Always Docker** (`docker compose up` / `docker compose up --build backend`). Do not `pip install` on the host. |

Render Dashboard env vars are the source of truth for production secrets. Do not put Discord webhooks or other secrets in git. The Cloud Run job in CI is a **legacy fallback**, not the live path.

## Deploy toggle

Workflow: `.github/workflows/deploy-backend.yml`  
Triggers: push to `main` that touches `backend/**` or the workflow file, plus `workflow_dispatch`.

Repo **Actions variable** `DEPLOY_TARGET` (not a secret) picks the job:

```bash
gh variable set DEPLOY_TARGET --body render   # current production
gh variable set DEPLOY_TARGET --body gcloud   # legacy Cloud Run path
```

| `DEPLOY_TARGET` | Job | What it does |
|---|---|---|
| `render` | `deploy-render` | POST Render API deploy for `RENDER_SERVICE_ID`. Cloud Run is skipped. |
| anything else / unset | `deploy-gcloud` | Build/push Artifact Registry image, Alembic via Cloud Run job, `gcloud run deploy`. |

Render job secrets (GitHub Actions):

- `RENDER_API_KEY`
- `RENDER_SERVICE_ID` (production: `srv-dacg4b95efls73eamjfg`)

The Render service has **auto-deploy off**. GitHub Actions is what ships backend changes. Env-only changes on Render (Dashboard or API) apply without a code push; Sentry/Discord **code** still needs a `main` deploy.

PRs that touch Alembic / `database.py` / `requirements.txt` run `.github/workflows/backend-migrations-check.yml` against a throwaway pgvector Postgres — not production.

## Billing (Paddle)

Plans are billed via **Paddle Billing** (USD cards, per-seat quantity locked to the org member count). Catalog (monthly): **Starter $10/user**, **Pro $40/user**, **Advanced $120/user** (yearly prices in the same catalog). Starter is a paid plan. Promo entitlements live in Postgres (`org_subscriptions`, `promo_codes`).

In-app billing and marketing (when the visitor is an org admin) create a server-side Paddle transaction, open the overlay with that `transaction_id`, and call `/billing/lock-checkout` so seat quantity cannot be edited in the overlay. Anonymous marketing visitors are sent to app register instead of an unlocked checkout.

Env on Render + local `backend/.env`:

| Variable | Notes |
|---|---|
| `PADDLE_API_KEY` | Server secret |
| `PADDLE_WEBHOOK_SECRET` | Endpoint secret for `Paddle-Signature` |
| `PADDLE_PRICE_ID_PRO` | Optional override for Pro monthly (`pri_…`); defaults live in `backend/paddle.py` |
| `PADDLE_PRICE_ID_ADVANCED` / `PADDLE_PRICE_ID_PLUS` | Optional override for Advanced monthly (`pri_…`) |
| `PADDLE_CLIENT_TOKEN` | Client token for Paddle.js overlay (also expose as `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`) |
| `PADDLE_ENVIRONMENT` | `sandbox` or `production` |

Webhook URL: `POST https://<backend>/billing/webhooks/paddle`. Seed promo `ATHENA-EARLY` grants 30 days of Pro with no card.

## Observability

Sentry Python SDK initializes in `backend/main.py` **after** `load_dotenv()` and **before** `FastAPI()`. FastAPI integration is automatic if `SENTRY_DSN` is set; if unset, Sentry is a no-op.

Discord’s native Sentry integration is **paid**. We forward errors ourselves: `backend/discord_alerts.py` is `before_send` — posts an embed to `DISCORD_WEBHOOK_URL`, then returns the event so Sentry still records it.

| Variable | Where | Notes |
|---|---|---|
| `SENTRY_DSN` | Render env + local `backend/.env` | Required to enable Sentry |
| `SENTRY_ENVIRONMENT` | Render: `production`; local: `development` | |
| `DISCORD_WEBHOOK_URL` | Render env + local `backend/.env` | Incoming webhook; never commit |
| `SENTRY_DEBUG_ROUTE` | Local `.env` only | If `true`, exposes `GET /sentry-debug`. Keep **off** in production |
| `SENTRY_TRACES_SAMPLE_RATE` / `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | Optional | Default `1.0` |

`sentry-sdk[fastapi]` is in `backend/requirements.txt` (installed in the Docker image).

## Backend local loop

```bash
docker compose up --build backend
```

`docker-compose.yml` builds `./backend`, publishes `8000`, loads `backend/.env`, overrides `DATABASE_URL` to the compose Postgres. After Python or `requirements.txt` changes, rebuild the image — the container does not bind-mount source.

## Frontend

App lives under `apps/app/` (not the repo-root `app/` tree). Marketing is `apps/marketing/`. Verify with `pnpm build` in the relevant app. UI rules in `CLAUDE.md` (no bold, no uppercase, no heavy letter-spacing).

## Do not

- Assume production is Cloud Run, Secret Manager, or `gcloud run deploy` unless `DEPLOY_TARGET` is explicitly not `render`.
- Install backend deps with host `pip` (Arch / PEP 668; the runtime is the Docker image).
- Enable `/sentry-debug` on Render.
- Commit `.env*`, Discord webhook URLs, or DSNs as “documentation.”
