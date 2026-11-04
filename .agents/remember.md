# remember.md — Corob CRM (running project context)

_Last updated: 2026-11-04_

## What the app is (from graphify graph, 930 nodes / 2511 edges)
- **Backend:** FastAPI (`backend/app`), pandas analytics, PyMySQL + DBUtils `PooledDB` (`core/db.py: get_connection`), JWT + bcrypt auth (`core/auth.py`), role guard `require_roles`.
- **Frontend:** React 19 + Vite + Tailwind 4, TanStack Query, ECharts. Pages: FocusMode, PmDashboard, InstallationDashboard, EngineerUtilization, EmployeeAnalysis, Upload pages.
- **Three data domains:** Service Calls, PM (preventive maintenance), Installation. Plus Engineers (cross-domain utilization).

## Current data flow (Excel-based)
1. Admin uploads → `api/combined_upload.py: upload_combined` (admin only, `rate_limit`, `read_capped`, `audit`).
2. Validate → `validate_excel` / `validate_pm_excel` / `find_installation_sheet` (+ `schema_contract.map_headers`).
3. Process → `process_dataframe` / `process_pm_dataframe` / `process_installation_dataframe`; `dedupe_pm_rows`; `resolve_engineers`; `learn_from_frame`.
4. Persist as HMAC-signed pickled DataFrame blobs in MySQL (`shared/blob_store.py dumps/loads`):
   `pm/cache.save_pm_data`, `installation/cache.save_installation_data`, `service_calls/session_cache.create_session`.
5. Read → `get_pm_data / get_all_pm_data / load_pm_frame`, `get_installation_data`, `get_session_data` → analytics → routers.

## Already in MySQL (do not rebuild)
users/auth, login throttle, audit, PM rules (`rules_store`), overrides (`overrides_store`), employee mapping, engineer directory, ticket images (`pm_images` uses pymysql directly).

## Legacy / dead code spotted
`core/mysql_auth.py` (duplicate of `auth.py`), `services/pm_cache_service.py`, `services/rate_limit_service.py` (dup of `shared/`), `service_calls/db_session_cache.py`, `core/supabase_auth_config.py`, `frontend/src/lib/supabaseClient.ts`, `keycloak-js`, `useSessionCleanup.ts` (orphan, degree 0), `domains/engineers/__init__`.

## DECISIONS (stated by user)
1. IT head creates a new server on the physical server, sqldumps the source tables, creates a user, gives access.
2. Backend moves from Excel-based to **MySQL-only**. Excel kept as **backup only**; upload stays in the admin dashboard for testing.
3. `main.py` updated to match.

## Plan summary (phases)
| # | Phase | Output |
|---|-------|--------|
| 0 | IT request checklist | Server, DB, user(s), TLS CA, firewall, dump scope/cadence |
| 1 | Schema discovery + column mapping | `docs/source_schema_map.md` (table.column → existing DataFrame columns) |
| 2 | Data access layer | `app/data/` repos returning the *same DataFrame shape* as `process_*` |
| 3 | Rewire loaders + `DATA_SOURCE` flag | `mysql` (default) / `excel` (backup) |
| 4 | `main.py` + `core/db.py` + config | Second read-only pool, health checks, gated upload router |
| 5 | Tests (parity + scoping) | Excel-vs-MySQL DataFrame equality, company isolation |
| 6 | Cutover + rollback + cleanup | Flag flip, remove dead code |

## OPEN QUESTIONS (need answers before Phase 2)
- Which source tables/columns exist for each domain? (graph shows no SQL schema)
- One-time dump or periodic refresh? How often, and who runs it?
- Is the new server MySQL or MariaDB, which version?
- Does the source have engineer names or codes for Installation (affects `resolve_engineers`)?
- Does the frontend pass a session id anywhere for Service Calls (graph can't show)?
- Same database as app tables, or separate schema/server for the dump?

## Preferences
- Every reply: include an updated `remember.md` alongside the answer.