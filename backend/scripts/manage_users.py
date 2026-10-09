#!/usr/bin/env python3
"""User administration for Corob Service Analytics. Run ON THE SERVER.

    cd backend
    set -a && source .env && set +a          # loads the MySQL settings
    python scripts/manage_users.py <command> ...

Commands
    add            --email E --role customer|corob_employee [--company "Name"]
    list
    passwd         --email E                      reset a password
    deactivate     --email E                      block login (keeps the record)
    activate       --email E
    unlock         --email E                      clear a "too many attempts" lockout
    add-company    --name "Name" --domain example.com
    list-companies

Passwords are typed at a hidden prompt, never on the command line, so they don't
end up in shell history or `ps`. They're stored as bcrypt hashes only.
"""
from __future__ import annotations

import argparse
import getpass
import re
import sys
from pathlib import Path

import bcrypt
import pymysql

# make `app` importable when run as `python scripts/manage_users.py`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.core.db import get_connection  # noqa: E402

MIN_PASSWORD_LEN = 10
MAX_PASSWORD_BYTES = 72  # bcrypt ignores everything past 72 bytes
ROLES = ("customer", "corob_employee")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def prompt_password() -> str:
    pw = getpass.getpass("New password: ")
    if len(pw) < MIN_PASSWORD_LEN:
        die(f"password must be at least {MIN_PASSWORD_LEN} characters")
    if len(pw.encode("utf-8")) > MAX_PASSWORD_BYTES:
        die(f"password must be at most {MAX_PASSWORD_BYTES} bytes")
    if getpass.getpass("Repeat password: ") != pw:
        die("passwords did not match")
    return pw


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def norm_email(raw: str) -> str:
    email = raw.strip().lower()
    if not EMAIL_RE.match(email):
        die(f"'{raw}' is not a valid email address")
    return email


def find_user(cur, email: str):
    cur.execute("SELECT id, is_active FROM users WHERE email = %s", (email,))
    return cur.fetchone()


# ---------------------------------------------------------------- commands
def cmd_add(a):
    email = norm_email(a.email)
    company_id = None
    with get_connection() as conn, conn.cursor() as cur:
        if find_user(cur, email):
            die(f"{email} already exists (use 'passwd' to change the password)")

        if a.role == "customer":
            if not a.company:
                die("customers need --company \"Exact Company Name\"")
            cur.execute("SELECT id, name FROM companies WHERE LOWER(name) = LOWER(%s)", (a.company.strip(),))
            row = cur.fetchone()
            if not row:
                cur.execute("SELECT name FROM companies ORDER BY name")
                names = ", ".join(r["name"] for r in cur.fetchall()) or "(none yet)"
                die(f"no company named '{a.company}'. Known companies: {names}. "
                    f"Create it first with add-company.")
            company_id = row["id"]
            company_name = row["name"]
        elif a.company:
            die("corob_employee accounts must not have a company")

        pw = prompt_password()
        cur.execute(
            "INSERT INTO users (email, password_hash, role, company_id) VALUES (%s, %s, %s, %s)",
            (email, hash_pw(pw), a.role, company_id),
        )
    print(f"created {a.role} {email}" + (f" for {company_name}" if company_id else ""))


def cmd_list(_a):
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT u.id, u.email, u.role, COALESCE(c.name, '-') AS company, u.is_active
               FROM users u LEFT JOIN companies c ON c.id = u.company_id
               ORDER BY u.role, c.name, u.email"""
        )
        rows = cur.fetchall()
    if not rows:
        print("no users yet")
        return
    w = max(len(r["email"]) for r in rows)
    print(f"{'ID':>3}  {'EMAIL':<{w}}  {'ROLE':<15}  {'COMPANY':<22}  ACTIVE")
    for r in rows:
        print(f"{r['id']:>3}  {r['email']:<{w}}  {r['role']:<15}  {r['company']:<22}  {'yes' if r['is_active'] else 'NO'}")


def cmd_passwd(a):
    email = norm_email(a.email)
    with get_connection() as conn, conn.cursor() as cur:
        if not find_user(cur, email):
            die(f"no user {email}")
        pw = prompt_password()
        cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hash_pw(pw), email))
        cur.execute("DELETE FROM login_attempts WHERE device_ip_key = %s", (f"email:{email}",))
    print(f"password updated for {email}")


def _set_active(email_raw: str, active: bool):
    email = norm_email(email_raw)
    with get_connection() as conn, conn.cursor() as cur:
        if not find_user(cur, email):
            die(f"no user {email}")
        cur.execute("UPDATE users SET is_active = %s WHERE email = %s", (active, email))
    print(f"{email} is now {'active' if active else 'DEACTIVATED'}"
          + ("" if active else " (an existing login token stays valid until it expires)"))


def cmd_deactivate(a):
    _set_active(a.email, False)


def cmd_activate(a):
    _set_active(a.email, True)


def cmd_unlock(a):
    email = norm_email(a.email)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM login_attempts WHERE device_ip_key = %s", (f"email:{email}",))
    print(f"lockout cleared for {email}")


def cmd_add_company(a):
    domain = a.domain.strip().lower().lstrip("@")
    if "." not in domain:
        die("--domain should look like example.com")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM companies WHERE LOWER(name) = LOWER(%s) OR email_domain = %s", (a.name.strip(), domain))
        if cur.fetchone():
            die("a company with that name or domain already exists")
        cur.execute("INSERT INTO companies (name, email_domain) VALUES (%s, %s)", (a.name.strip(), domain))
    print(f"created company '{a.name.strip()}' ({domain})")
    print("Note: use this EXACT name as the 'Master Customer' value in the PM Excel files, "
          "otherwise that company's uploads won't match its users.")


def cmd_list_companies(_a):
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT name, email_domain FROM companies ORDER BY name")
        for r in cur.fetchall():
            print(f"{r['name']:<30} {r['email_domain']}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("add"); s.set_defaults(fn=cmd_add)
    s.add_argument("--email", required=True)
    s.add_argument("--role", required=True, choices=ROLES)
    s.add_argument("--company")

    sub.add_parser("list").set_defaults(fn=cmd_list)

    for name, fn in (("passwd", cmd_passwd), ("deactivate", cmd_deactivate),
                     ("activate", cmd_activate), ("unlock", cmd_unlock)):
        s = sub.add_parser(name); s.set_defaults(fn=fn)
        s.add_argument("--email", required=True)

    s = sub.add_parser("add-company"); s.set_defaults(fn=cmd_add_company)
    s.add_argument("--name", required=True)
    s.add_argument("--domain", required=True)

    sub.add_parser("list-companies").set_defaults(fn=cmd_list_companies)

    a = p.parse_args()
    try:
        a.fn(a)
    except pymysql.err.OperationalError as e:
        code = e.args[0] if e.args else "?"
        hint = {
            1045: "wrong MYSQL_USER / MYSQL_PASSWORD",
            1049: "that MYSQL_DATABASE does not exist — did you run sql/schema.sql?",
            2003: "cannot reach MySQL at MYSQL_HOST:MYSQL_PORT — is it running, and is the host right?",
        }.get(code, "check the MYSQL_* variables")
        die(f"database connection failed ({code}): {hint}\n"
            f"       Did you load the env first?  set -a && source .env && set +a")
    except pymysql.err.ProgrammingError as e:
        if e.args and e.args[0] == 1146:
            die("a table is missing — run sql/schema.sql against this database first")
        raise


if __name__ == "__main__":
    main()
