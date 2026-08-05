# Athena — Documentation

All project documentation lives here, grouped by purpose. Agent-instruction files
(`CLAUDE.md`, `AGENTS.md`, `backend/CLAUDE.md`), the root `README.md`, ingestion
fixtures (`backend/sample_docs/`), and the `gtm-engine/` sub-project keep their own
locations and are intentionally **not** filed here.

---

## planning/ — build plans, runbooks, roadmap

| Doc | What it is |
|---|---|
| [DEV-PATH.md](planning/DEV-PATH.md) | Current state of the build: what's shipped, what's partial, what's left, and the user-side verification checklist. **Start here.** |
| [ENTERPRISE-PIPELINE-PLAN.md](planning/ENTERPRISE-PIPELINE-PLAN.md) | The full ticketed plan (Epics A–E, Milestones 1–3) for hardening multitenancy + ingestion for real Workspace tenants. |
| [RESTORE-CLERK.md](planning/RESTORE-CLERK.md) | Playbook for restoring the Clerk auth/org/dashboard app from the pre-nuke commit (done on `staging`). |

## specs/ — feature & integration specs

| Doc | What it is |
|---|---|
| [auth-and-orgs-spec.md](specs/auth-and-orgs-spec.md) | Full auth + org + staff-management spec. |
| [google-workspace-spec.md](specs/google-workspace-spec.md) | Google Drive service-account (Path A) + OAuth Picker (deferred) connector spec. |
| [notion-oauth-spec.md](specs/notion-oauth-spec.md) | Notion OAuth Path B spec (post-MVP). |
| [file-upload-spec.md](specs/file-upload-spec.md) | File upload + text extraction pipeline spec. |
| [avalanche-audit-spec.md](specs/avalanche-audit-spec.md) | On-chain audit-trail spec (post-MVP). |

## design/ — design language & briefings

| Doc | What it is |
|---|---|
| [design-guide.md](design/design-guide.md) | Ryo Lu-inspired design language (spacing, type, restraint). |
| [mavuno-dsign.md](design/mavuno-dsign.md) | Mavuno design system — the applied ruleset (Vercel/Cursor/Linear aesthetic). |
| [HELLO-STITCH.md](design/HELLO-STITCH.md) | Design briefing: what the product is, every page/component, and where design could go. |

## product/ — positioning & pitch

| Doc | What it is |
|---|---|
| [athena-pitch.md](product/athena-pitch.md) | Pitch deck slides + speaker scripts. |
