# remember.md: Corob Service Analytics (running project context)

## What it is
Internal analytics for Corob: service calls, PM, installation, engineer utilization.
- Frontend: React + Vite + TypeScript + Tailwind, served as static files by Apache.
- Backend: FastAPI (uvicorn 127.0.0.1:8000, 2 workers), run by systemd (backend/deploy/).
- App server: 192.168.74.100 (Apache HTTPS, /api/ proxied to the backend).
- Database: company MySQL server. Two schemas: corob_app (writable, app tables) and corob_source (read-only views).

## Auth
- JWT (HS256, 15 min TTL, "stay signed in" refresh). Passwords in MySQL, bcrypt.
- Roles: customer (own company only), corob_employee, admin (upload).
- Login throttling per device+IP and per account (MySQL-backed).
- Accounts managed with backend/scripts/manage_users.py.

## Data source
- DATA_SOURCE=db (default): Service, PM, and Installation read from company source views. Nothing copied or stored.
- DATA_SOURCE=upload: earlier Excel flow (pickled blobs in MySQL). Kept as fallback.
- Source reads via backend/app/shared/source_repo.py (planned), with a short in-process TTL cache (~10 min).
- PM ticket images: separate read-only DB (PM_IMG_*), can point at the same server.

## Where config lives
- backend/.env on the app server (loaded by systemd EnvironmentFile). Permissions 600, owned by www-data. Never in git.
- Company MySQL server: schemas, users, grants, and views. Created by IT or admin.
- Frontend: only VITE_API_BASE_URL. No secrets in VITE_* variables.
- Variable names only (values never recorded here):
  - App: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_POOL_SIZE, MYSQL_SSL, MYSQL_SSL_CA
  - Source: SOURCE_DB_NAME, SOURCE_DB_USER, SOURCE_DB_PASSWORD, SOURCE_VIEW_SERVICE, SOURCE_VIEW_PM, SOURCE_VIEW_INSTALLATION, DATA_SOURCE
  - PM images: PM_IMG_DB_HOST, PM_IMG_DB_PORT, PM_IMG_DB_USER, PM_IMG_DB_PASSWORD, PM_IMG_DB_NAME, PM_IMG_TABLE, PM_IMG_TICKET_COL, PM_IMG_BLOB_COL, PM_IMG_ORDER_COL
  - Other: JWT_SECRET (32+ chars), ALLOWED_ORIGIN, ALLOWED_HOSTS, SESSION_TTL_SECONDS
- CA certificate on app server: TBD path (currently /etc/ssl/certs/company-mysql-ca.pem in the example), readable by www-data.

## Users and grants (company MySQL)
- corob_app: full DML and DDL on corob_app only, from 192.168.74.100. MAX_USER_CONNECTIONS 20. REQUIRE SSL.
- corob_readonly: SELECT on the three source views and PM image table only, from 192.168.74.100. MAX_USER_CONNECTIONS 10. REQUIRE SSL.
- Passwords: held by IT and in backend/.env. Not recorded here.

## Views (company MySQL, schema corob_source)
- v_service_calls, v_pm_tickets, v_installation: definitions TBD from IT (raw table names unknown). Column names must match Excel headers so existing process_* functions run unchanged.

## Migration (current MySQL to company server)
- Migrate: users, companies, pm_phrase_rules, pm_phrase_rule_log, pm_row_overrides, audit_log (optional), engineer_directory (if still used).
- Don't migrate: pm_data, installation_data, service_call_sessions.
- Dump old app schema as rollback before cutover.

## Open items
- IT: host/IP and port; TLS and CA file; raw table names and view definitions; date column types; company value match with companies table; engineer master source; PM image table columns; backup and maintenance windows; policy on storing password hashes on their server.
- Code: source_repo.py and TTL cache; DATA_SOURCE switch; keep upload path behind the switch; purge_expired.py updated for tables that remain.
- Cleanup: delete app/services/rate_limit_service.py, app/services/pm_cache_service.py, app/core/mysql_auth.py, hooks/useSessionCleanup.ts, db_session_cache.py if unused. Remove supabase and keycloak deps and the agentation import from App.tsx. Add echarts and echarts-for-react to frontend/package.json.
- Ops: www-data write access to backend/data; WeasyPrint system libs on the server; confirm backend/.env is in .gitignore.

## Working preferences
- Every reply includes an updated remember.md alongside the answer.