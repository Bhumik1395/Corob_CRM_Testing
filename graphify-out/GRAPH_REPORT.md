# Graph Report - Corob_CRM  (2026-11-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 930 nodes · 2511 edges · 47 communities (38 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c27d9b54`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pandas
- review.py
- pm.ts
- get_connection
- ticket_report.py
- login.py
- EngineerPanel.tsx
- App.tsx
- db.py
- frontend/package.json
- CurrentUser
- FocusMode.tsx
- PmDashboard.tsx
- mysql_auth.py
- employee_mapping_service.py
- InstallationDashboard.tsx
- installation/router.py
- compilerOptions
- lucide-react
- utilization.py
- compilerOptions
- package.json
- engineers/analytics.py
- palette.ts
- dependencies
- get_authorized_session_df
- dependencies
- Skeleton.tsx
- engineer.py
- test_account_status.py
- companies.py
- _issue_token
- roleAccess.test.mjs
- service_calls/router.py
- test_service_calls_auth.py
- vite.config.ts
- scripts
- echarts-for-react.d.ts
- @supabase/supabase-js
- tsconfig.json
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `CurrentUser` - 57 edges
2. `get_connection()` - 57 edges
3. `upload_combined()` - 27 edges
4. `useAuth()` - 27 edges
5. `PmDashboard()` - 20 edges
6. `lucide-react` - 19 edges
7. `apply_outcomes()` - 18 edges
8. `get_learned_rules()` - 18 edges
9. `FocusMode()` - 18 edges
10. `InstallationDashboard()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `upload_combined()` --uses--> `CurrentUser`  [INFERRED]
  backend/app/api/combined_upload.py → backend/app/core/auth.py
- `get_companies()` --uses--> `CurrentUser`  [INFERRED]
  backend/app/api/companies.py → backend/app/core/auth.py
- `engineer_monthly()` --uses--> `CurrentUser`  [INFERRED]
  backend/app/api/engineer.py → backend/app/core/auth.py
- `engineer_utilization()` --uses--> `CurrentUser`  [INFERRED]
  backend/app/api/engineer.py → backend/app/core/auth.py
- `engineer_visits()` --uses--> `CurrentUser`  [INFERRED]
  backend/app/api/engineer.py → backend/app/core/auth.py

## Import Cycles
- None detected.

## Communities (47 total, 9 thin omitted)

### Community 0 - "pandas"
Cohesion: 0.05
Nodes (43): _sheet_names(), upload_combined(), audit(), read_capped(), get_installation_data(), relink_installation_engineers(), save_installation_data(), _write() (+35 more)

### Community 1 - "review.py"
Cohesion: 0.06
Nodes (59): compute_pm_dashboard(), compute_pm_filter_options(), _trend(), get_all_pm_data(), get_pm_data(), load_pm_df(), load_pm_frame(), save_pm_data() (+51 more)

### Community 2 - "pm.ts"
Cohesion: 0.08
Nodes (49): answerReview(), authHeaders(), changeReviewLabel(), downloadRemarksExcel(), getPmDashboard(), getPmFilterOptions(), getPrintOptions(), getRemarkRows() (+41 more)

### Community 3 - "get_connection"
Cohesion: 0.10
Nodes (30): get_connection(), create_session(), delete_session(), get_session_data(), delete_session(), end_session(), clear_attempts(), _client_ip() (+22 more)

### Community 4 - "ticket_report.py"
Cohesion: 0.10
Nodes (17): fetch_ticket_images(), _ident(), _to_data_uri(), build_report_pdf(), _chart(), build_ticket_context(), _dt(), _pairs() (+9 more)

### Community 5 - "login.py"
Cohesion: 0.10
Nodes (25): login(), LoginRequest, refresh(), authenticate(), reissue_token(), get_pool(), _account_key(), _clear() (+17 more)

### Community 6 - "EngineerPanel.tsx"
Cohesion: 0.12
Nodes (26): EngineerMonthlyResponse, EngineerMonthRow, EngineerSource, EngineerUtilizationResponse, EngineerVisitsResponse, get(), getEngineerMonthly(), getEngineerUtilization() (+18 more)

### Community 7 - "App.tsx"
Cohesion: 0.17
Nodes (16): uploadPmFiles(), uploadCombined(), App(), queryClient, AuthContext, AuthContextValue, AuthProvider(), useAuth() (+8 more)

### Community 8 - "db.py"
Cohesion: 0.10
Nodes (6): CsrfOriginCheckMiddleware, SecurityHeadersMiddleware, health(), health_db(), test_api_responses_are_not_cacheable_but_health_is_untouched(), test_csrf_check_fails_closed_and_still_blocks_foreign_origins()

### Community 9 - "frontend/package.json"
Cohesion: 0.12
Nodes (25): devDependencies, agentation@^3.1.2, eslint@^10.9.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.4, globals@^17.11.0, postcss@^8.5.26 (+17 more)

### Community 10 - "CurrentUser"
Cohesion: 0.17
Nodes (11): me(), CurrentUser, _decode_token(), get_current_user(), require_roles(), test_authenticate_admin_user(), test_combined_upload_admin_only_guard(), test_current_user_properties() (+3 more)

### Community 11 - "FocusMode.tsx"
Cohesion: 0.13
Nodes (23): InstallationUploadResult, authHeaders(), CombinedUploadResponse, downloadPdfReport(), EmployeeDashboardResponse, EmployeeRow, FilterOptions, FocusDashboardResponse (+15 more)

### Community 12 - "PmDashboard.tsx"
Cohesion: 0.17
Nodes (18): downloadPmReport(), fetchTicketPdf(), getCompanies(), EngineerUtilizationRow, getUtilizationDashboard(), PmTrendChart(), PdfViewerModal(), Card() (+10 more)

### Community 13 - "mysql_auth.py"
Cohesion: 0.13
Nodes (8): create_user(), authenticate(), create_user(), CurrentUser, _decode_token(), get_current_user(), _issue_token(), require_roles()

### Community 14 - "employee_mapping_service.py"
Cohesion: 0.15
Nodes (9): compute_employees(), dashboard_employees(), invalidate_cache(), learn_from_frame(), _load(), load_employee_mapping(), load_supervisor_mapping(), _norm_name() (+1 more)

### Community 15 - "InstallationDashboard.tsx"
Cohesion: 0.16
Nodes (19): get(), getInstallationDashboard(), getInstallationFilters(), InstallationCount, InstallationDashboardResponse, InstallationDealerRow, InstallationDetailRow, InstallationFilterOptions (+11 more)

### Community 16 - "installation/router.py"
Cohesion: 0.20
Nodes (12): compute_installation_dashboard(), compute_installation_filter_options(), _count_by(), _filter(), _nunique_nonblank(), _prepare(), _split(), delete_installation_data() (+4 more)

### Community 17 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 18 - "lucide-react"
Cohesion: 0.17
Nodes (12): AppLayout(), NavItem, NavRow(), navItems, adminNavItems, DashboardShell(), DashboardShellInner(), employeeNavItems (+4 more)

### Community 19 - "utilization.py"
Cohesion: 0.17
Nodes (6): prepare_installation(), compute_utilization(), _daily_quota(), _most_common(), dashboard_utilization(), _pm_and_installation()

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 21 - "package.json"
Cohesion: 0.17
Nodes (15): autoprefixer@^10.5.4, tailwindcss@^4.3.3, @types/react@^19.2.18, @types/react-dom@^19.2.4, devDependencies, autoprefixer@^10.5.4, postcss@^8.5.26, tailwindcss@^4.3.3 (+7 more)

### Community 22 - "engineers/analytics.py"
Cohesion: 0.28
Nodes (8): _clean_code(), compute_engineer_combined(), compute_engineer_monthly(), compute_engineer_visits(), _daily_quota(), _engineer_name(), _engineer_rows(), _visit_split()

### Community 23 - "palette.ts"
Cohesion: 0.32
Nodes (6): MonthlyTrendRow, InstallTrendPoint, TrendPoint, COLORS, TOOLTIP, echarts-for-react

### Community 24 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @fontsource/poppins@^5.3.0, keycloak-js@^26.2.4, lucide-react@^1.37.0, react@^19.2.8, react-router-dom@^7.18.3, @tanstack/react-table@^8.21.3, react (+5 more)

### Community 25 - "get_authorized_session_df"
Cohesion: 0.20
Nodes (3): get_filters(), compute_filter_options(), get_authorized_session_df()

### Community 26 - "dependencies"
Cohesion: 0.17
Nodes (12): react-dom@^19.2.8, @tanstack/react-query@^5.102.8, dependencies, echarts@^6.1.0, echarts-for-react@^3.0.6, react@^19.2.8, react-dom@^19.2.8, @tanstack/react-query@^5.102.8 (+4 more)

### Community 27 - "Skeleton.tsx"
Cohesion: 0.38
Nodes (8): Skeleton(), SkeletonCard(), SkeletonPaginationBar(), SkeletonPanel(), SkeletonTableRows(), AuthInitSkeleton(), FocusModeSkeleton(), PmDashboardSkeleton()

### Community 28 - "engineer.py"
Cohesion: 0.44
Nodes (7): engineer_monthly(), engineer_utilization(), engineer_visits(), _installation_df_or_none(), _load_df(), _pm_df_or_none(), _service_df_or_none()

### Community 29 - "test_account_status.py"
Cohesion: 0.29
Nodes (6): active_user(), fake_db(), jwt(), test_deactivated_user_is_rejected_on_next_request(), test_refresh_reissues_for_active_user_and_refuses_disabled_or_missing_token(), x()

### Community 30 - "companies.py"
Cohesion: 0.33
Nodes (3): get_companies(), list_companies(), look_up_domain()

### Community 31 - "_issue_token"
Cohesion: 0.28
Nodes (6): _issue_token(), rate_limit(), jwt(), test_rate_limit_is_per_user(), x(), test_companies_api_role_check()

### Community 33 - "service_calls/router.py"
Cohesion: 0.39
Nodes (3): _build_breakdown(), compute_focus(), dashboard_focus()

### Community 34 - "test_service_calls_auth.py"
Cohesion: 0.50
Nodes (6): client(), jwt(), test_admin_has_access(), test_jwt_and_role_required(), test_session_is_bound_to_owner(), fake()

### Community 35 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.2.2, @vitejs/plugin-react@^6.1.0, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 36 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 37 - "echarts-for-react.d.ts"
Cohesion: 0.33
Nodes (3): echarts-for-react, EChartsReactProps, ReactECharts

### Community 38 - "@supabase/supabase-js"
Cohesion: 0.50
Nodes (3): @supabase/supabase-js@^2.116.0, supabase, @supabase/supabase-js

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `get_connection` to `pandas`, `review.py`, `login.py`, `db.py`, `CurrentUser`, `mysql_auth.py`, `employee_mapping_service.py`, `installation/router.py`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `CurrentUser` (e.g. with `upload_combined()` and `get_companies()`) actually correct?**
  _`CurrentUser` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Should `pandas` be split into smaller, more focused modules?**
  _Cohesion score 0.050087361677344205 - nodes in this community are weakly interconnected._
- **Why does `CurrentUser` connect `CurrentUser` to `pandas`, `review.py`, `ticket_report.py`, `login.py`, `installation/router.py`, `get_authorized_session_df`, `engineer.py`, `test_account_status.py`, `companies.py`, `_issue_token`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `review.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05757286192068801 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `pm.ts`, `App.tsx`, `frontend/package.json`, `FocusMode.tsx`, `PmDashboard.tsx`, `InstallationDashboard.tsx`, `dependencies`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `pm.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07864488808227466 - nodes in this community are weakly interconnected._