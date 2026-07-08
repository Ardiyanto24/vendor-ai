# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**vendor-ai** is a TypeScript monorepo (pnpm workspaces) for an AI-assisted vendor selection system. It is one half of a two-service architecture:

- **vendor-ai** (this repo) — Next.js 14 frontend + BFF API routes + Supabase DB
- **vendor-ai-agent** (separate repo) — Python FastAPI service with AI agents, TOPSIS scoring, and RAG pipeline

## Commands

All commands run from the repo root unless noted.

```bash
# Development
pnpm dev:web          # Frontend on http://localhost:3000
pnpm dev:api          # BFF API on http://localhost:3001
pnpm dev              # Alias for dev:web only

# Build & lint
pnpm build            # Build all workspaces
pnpm lint             # Lint all workspaces

# Testing (run from workspace root or workspace dir)
pnpm test             # Run all tests
pnpm --filter web test          # Run web tests (Vitest)
pnpm --filter web test:watch    # Watch mode

# Single test file
cd apps/web && pnpm exec vitest run src/path/to/file.test.ts
```

## Architecture

### Monorepo Layout

```
apps/
  web/    Next.js 14 frontend (App Router, port 3000)
  api/    Next.js 14 BFF API routes (port 3001)
packages/
  types/  Shared TypeScript types between web and api
supabase/ PostgreSQL migrations and seed data
docs/     Specification documents (reference for requirements)
```

### Frontend (apps/web)

- **Routing:** Next.js App Router. Pages map to feature codes: P-01 login, P-02 dashboard, P-03 create evaluation (stepper), P-04 AI processing, P-05 results, P-06 history, P-07 approval, P-08 criteria settings.
- **State:** Zustand for global state (`authStore`, `chatStore`, `notificationStore`). React Query (TanStack) for server state with 1-minute staleTime and 2 retries.
- **API calls:** Use the `apiFetch()` wrapper in `lib/api/` — handles token injection, automatic token refresh with request queuing, and standard response parsing.
- **Forms:** React Hook Form + Zod validation schemas in `lib/validations/`.
- **Component layers:** `components/atomic/` → `components/composite/` → `components/feature/`. Layout components are in `components/layout/`.
- **Dev mocking:** MSW (Mock Service Worker) can be used for development before real backend endpoints exist.

### BFF API (apps/api)

- API routes under `app/api/v1/`. Each route validates with Zod, calls Supabase, and returns `{ success: true, data, meta }` or `{ success: false, error }`.
- Reads the user's JWT from cookies (server-side) or Authorization header.
- Key route groups: `/auth/`, `/users/me`, `/evaluasi/`, `/kategori-pengadaan/`, `/konfigurasi/kriteria`.

### Database (Supabase / PostgreSQL)

Ten core tables — all use UUID PKs and soft deletes (`deleted_at`):

| Table | Purpose |
|---|---|
| `user` | Staff and manager accounts |
| `evaluasi` | Vendor evaluation sessions |
| `vendor` | Vendor candidates per evaluation |
| `dokumen_upload` | Uploaded vendor documents |
| `dokumen_chunk` | RAG chunks with `vector(768)` embeddings |
| `agent_progress` | AI agent status (7 named agents) |
| `hasil_evaluasi` | Evaluation results with TOPSIS scores |
| `hasil_vendor` | Per-vendor scores and AI reasoning |
| `konfigurasi_kriteria` | Configurable scoring criteria (JSON columns) |
| `approval_log` | Manager approval decisions |

Row Level Security (RLS) is enabled. Migrations are in `supabase/migrations/`.

### AI Integration

The vendor-ai-agent FastAPI service is called from `apps/api` via HTTP. It runs 7 sequential AI agents and writes progress to `agent_progress`. The frontend polls this table to show real-time processing status on the P-04 page.

## Database Migration Rules

**Target environment for development is the Supabase cloud dev project (`vendor-ai-dev`), not a local Docker instance.**

### Running migrations in development

Always use `supabase db push` to apply migrations to the cloud dev project:

```bash
# Link to dev project (one-time setup)
supabase link --project-ref <project-ref-vendor-ai-dev>

# Apply all pending migrations to cloud dev
supabase db push
```

**Never run `supabase start` or `supabase db reset` for development** — these require Docker and are not the intended workflow for this project. The cloud dev project is the single source of truth for development database state.

### What is and is not allowed

| Action | Allowed | Notes |
|---|---|---|
| `supabase db push` to cloud dev | ✅ | Primary migration method for development |
| SQL Editor (Supabase dashboard) for schema changes | ✅ | Allowed in dev only, but migration file must still be created and committed first — SQL Editor is just a runner |
| SQL Editor for read/diagnostic queries | ✅ | EXPLAIN ANALYZE, RLS verification, manual checks |
| SQL Editor for rollback commands | ✅ | As per DB-02 section 9.2 |
| `supabase start` / `supabase db reset` | ❌ | Requires Docker; not used in this project |
| Schema changes without a migration file | ❌ | Every schema change must have a file in `supabase/migrations/` |
| Editing a migration file that has already been run | ❌ | Create a new migration instead |

### Migration file conventions

Every migration file in `supabase/migrations/` must follow this format:

```sql
-- Migration: brief description of change
-- Rollback: SQL command to undo this migration

-- ... SQL statements ...
```

File naming: `YYYYMMDDHHMMSS_short_description.sql`

## Key Conventions

- **Feature branches:** `feature/F-XX-short-name` where F-XX matches spec document codes (F-01 auth, F-02 layout, F-03 criteria config, etc.)
- **Commit messages:** `feat(scope): implement F-XX description` — scope is `web`, `api`, or `db`.
- **Env vars:** Copy `.env.example` to `.env.local` in each app. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FASTAPI_BASE_URL`.
- **TypeScript:** Strict mode enabled. Shared types live in `packages/types` — add new cross-app types there, not in app-local files.
- **Soft deletes:** Never hard-delete rows. Set `deleted_at = now()` and filter `WHERE deleted_at IS NULL` in queries.

## Specification Documents

All spec files are in `docs/`. Read the relevant spec before implementing any feature. If a spec conflicts with code already in the repo, flag it — do not silently resolve it.

### SH — Shared / Cross-cutting

| File | What it covers |
|---|---|
| `SH-01_decision_log.md` | All Architecture Decision Records (ADRs) — why key technology and design choices were made. Read this first when unsure about a tech choice. |
| `SH-02_deployment_runbook.md` | Infrastructure overview, environment setup (dev/staging/production), branching strategy, CI/CD pipeline, deployment steps for Vercel and FastAPI hosting. |
| `SH-03_testing_strategy.md` | Testing layers across frontend, BFF API, and FastAPI. Tooling choices, what to test, and coverage expectations per layer. |
| `SH-04_cost_usage_guide.md` | API cost model for OpenRouter (LLM), Google Gemini (embedding), Tavily (web search), Supabase, and Vercel. Token budgets and cost controls. |

### BE — Backend (BFF API + FastAPI)

| File | What it covers |
|---|---|
| `BE-01_system_architecture.md` | End-to-end architecture: component diagram, data flow, technology stack, and MVP scope boundaries. Start here for any architectural question. |
| `BE-02_api_contract.md` | All REST API endpoints for the BFF (Next.js API Routes): URL, method, request/response shape, auth requirements, and error codes. |
| `BE-03_agent_orchestration.md` | How the 7 AI agents are orchestrated in FastAPI: agent sequence, state machine, error handling, and how progress is written to `agent_progress`. |
| `BE-04_prompt_library.md` | System and user prompts for all 7 agents and the AI Chat Panel. Prompt structure, versioning, and quality evaluation approach. |
| `BE-05_scoring_engine.md` | TOPSIS scoring algorithm: normalization, weighting, ideal solution calculation, threshold enforcement, and narrative reasoning generation. |
| `BE-06_auth_security.md` | Authentication flow (Supabase Auth + JWT), RBAC for staff vs manager roles, API security, and audit trail. |
| `BE-07_integration_spec.md` | External service integrations: Tavily API (web search), Supabase Storage (document upload), OpenRouter (LLM), Google Gemini (embedding). |
| `BE-08_rag_specification.md` | RAG pipeline for AI Chat Panel: document chunking strategy, embedding with Google Gemini text-embedding-004, hybrid search (vector + BM25 via RRF). |
| `BE-09_qualitative_analyzer_agent.md` | Qualitative Analyzer agent spec: what it analyzes, input/output format, its position in the orchestration flow (after FA/RA/PS, before PM). |
| `BE-10_preference_matcher_agent.md` | Preference Matcher agent spec: two output modes (neutral vs opinionated), conflict callout logic, input/output format. Last agent in the pipeline. |

> Note: `BE-03_auth_security.md` and `BE-04_integration_spec_fullstack.md` are superseded by `BE-06` and `BE-07` respectively. Refer to the higher-numbered versions.

### FE — Frontend

| File | What it covers |
|---|---|
| `FE-01_ui_architecture.md` | Frontend architecture: Next.js App Router setup, folder structure, routing conventions, rendering strategy (SSR vs CSR), and component hierarchy. |
| `FE-02_component_library.md` | All UI components: atomic, composite, feature-level, and layout. Includes design tokens, shadcn/ui usage, and component contract definitions. |
| `FE-03_page_and_user_flow.md` | Every page (P-01 to P-08): layout, content sections, user interactions, and state transitions. Also defines the core user flows end-to-end. |
| `FE-04_state_management.md` | Three-layer state model: Zustand stores (auth, chat, notifications), TanStack Query for server state, and local component state. Rules and anti-patterns. |
| `FE-05_api_integration.md` | How the frontend calls the BFF: `apiFetch()` wrapper, auth token handling, query patterns, mutation patterns, upload/polling, and Supabase Realtime. |
| `FE-06_testing_qa_frontend.md` | Frontend testing: Vitest for unit/component tests, integration tests, E2E with Playwright, accessibility, and visual regression. |

### DB — Database

| File | What it covers |
|---|---|
| `DB-01_data_model.md` | All 10 tables: column definitions, data types, constraints, RLS policies, enums, and the ERD. Source of truth for schema. |
| `DB-02_migration_strategy.md` | Migration tooling (Supabase CLI), file naming, table creation order, seed data, zero-downtime techniques, rollback plan, and rules per environment. |
| `DB-03_query_performance.md` | Query patterns, indexing strategy (B-tree, HNSW, GIN), caching, pagination, slow query monitoring, and P95 performance targets. |
| `DB-04_backup_retention.md` | Backup strategy (PITR on Supabase Pro), restore procedure, data retention policies, and scheduled cleanup jobs. |

### AI — AI Service (vendor-ai-agent repo)

> These specs are for the `vendor-ai-agent` Python/FastAPI repo. They are included here as reference for understanding what the AI service does and what it expects from / writes to the database.

| File | What it covers |
|---|---|
| `AI-01_agent_orchestration.md` | LangGraph orchestration of 7 agents: flow, state machine, error resilience, and database writes. AI-side counterpart to BE-03. |
| `AI-02_prompt_library.md` | Prompts used in the AI service. AI-side counterpart to BE-04. |
| `AI-03_scoring_engine.md` | TOPSIS implementation in Python. AI-side counterpart to BE-05. |
| `AI-04_integration_spec.md` | External API integrations from the AI service: Tavily, OpenRouter, Google Gemini. AI-side counterpart to BE-07. |
| `AI-05_rag_specification.md` | RAG pipeline implementation in the AI service: indexing, chunking, retrieval. AI-side counterpart to BE-08. |
| `AI-06_qualitative_analyzer_agent.md` | Qualitative Analyzer agent implementation detail. AI-side counterpart to BE-09. |
| `AI-07_preference_matcher_agent.md` | Preference Matcher agent implementation detail. AI-side counterpart to BE-10. |

### GUIDE — Role-specific Implementation Guides

| File | What it covers |
|---|---|
| `GUIDE_DATABASE_ENGINEER.md` | Task-by-task database work per feature (F-00 to F-14): what migrations to write, order of table creation, done criteria checklists. |
| `GUIDE_BACKEND_ENGINEER.md` | Task-by-task backend work per feature: BFF API routes to implement, Supabase queries, integration points, done criteria checklists. |
| `GUIDE_FRONTEND_ENGINEER.md` | Task-by-task frontend work per feature: pages and components to build, MSW mocks, Zustand/Query wiring, done criteria checklists. |
| `GUIDE_AI_ENGINEER.md` | Task-by-task AI service work per feature: agent implementation, RAG pipeline, TOPSIS wiring, done criteria checklists. |
| `GUIDE_FULLSTACK.md` | Combined guide for a single developer doing all layers (DB → BE → FE sequentially per feature). |

### Planning & Structure

| File | What it covers |
|---|---|
| `MILESTONE_PLAN.md` | 15 features (F-00 to F-14) across 4 dependency tiers. Feature descriptions, prerequisites, and inter-feature dependencies. |
| `REPOSITORY_STRUCTURE.md` | Folder structure for both `vendor-ai` and `vendor-ai-agent` repos, file ownership per role, and naming conventions. |