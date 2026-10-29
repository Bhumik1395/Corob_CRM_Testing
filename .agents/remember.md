# remember.md — Corob Service Analytics

_Last updated: 29 Oct 2026 (v2). Paste this at the start of a new chat for context._

## Stack
- **Frontend:** React 19 + TypeScript + Vite, Tailwind v4, TanStack Query, ECharts (`echarts-for-react`), lucide-react, react-router-dom.
- **Backend:** FastAPI (Python), pandas, openpyxl, WeasyPrint (PDFs), MySQL via PyMySQL + DBUtils.
- **Auth:** own JWT (HS256) in `app/core/auth.py`; roles `customer`, `corob_employee`, `admin`. Login throttling in MySQL (`app/shared/rate_limit_service.py`).
- **Deploy:** Apache (TLS, serves `frontend/dist`, proxies `/api/` to uvicorn on 127.0.0.1:8000), systemd units in `backend/deploy/`.

## Data model (in MySQL as signed pickled DataFrames)
- **Service calls:** per-user session (`service_call_sessions`, 1h TTL, cookie `session_id`). Sheet "Service Data".
- **PM:** `pm_data` per company, permanent. Sheet "PM Data". Deduped by `ticket_no`.
- **Installation:** `installation_data` single row. Recognised by headers, not sheet name.
- **Engineer directory:** `engineer_directory` (eng_code → name, supervisor), learned from uploads.
- Uploads: admin only, `POST /api/upload/combined`, auto-detects file type.

## PM outcome logic
- `app/domains/pm/rules.py` regex tiers → `outcome.py` `apply_outcomes` gives `PM Done` / `Dispute`; unresolved remarks count as Dispute until answered.
- Learned phrase rules in `pm_phrase_rules`; per-ticket manual overrides in `pm_row_overrides`.
- Review UI: `PmRemarkReview.tsx` (every remark, expand to rows, bulk mark), `PmRuleHistory.tsx`.

## Pages
- Employee/admin: `/dashboard/focus`, `/pm`, `/installation`, `/utilization`, `/pm/print`, `/upload` (admin).
- Customer: `/customer/pm`, `/customer/pm/print`.

## Current work: Export Excel on "Review every remark" (/dashboard/pm)
Button exports what the panel filter (All / Unresolved / PM Done / Dispute, plus search) shows.
Columns: **Ticket, Dealer, Employee name, Supervisor name, Date, Remark** (one row per ticket).

Done (untested):
- `outcome.py`: `export_rows(df, learned, status, search)`.
- `review.py`: `GET /api/pm/review/export`.
- `src/api/pm.ts`: `downloadRemarksExcel(...)`.
- `PmRemarkReview.tsx`: Export Excel button beside the search box.

**v2 change:** first export was plain cells with truncated columns. `review_export` now builds a normal (not write-only) openpyxl workbook with a real Excel Table (`TableStyleMedium7`, filter buttons, banded rows), set column widths, wrapped Remark column, frozen header row, real date cells. `_cell`/`WriteOnlyCell` removed.

Notes: Dealer is `Name (Code)` in one column. Supervisor comes from "Call Forwarded to", falling back to the engineer directory. Export filters by the remark's label, not per-ticket manual marks.

## Open items
- Test export (all four filters, search, "All companies") and confirm columns now display fully in Excel.
- Confirm `export_rows` exists at the bottom of `outcome.py`.

## Preferences
- Give an updated `remember.md` with every reply.
- Wants full-file code when asked.