import logging
import re
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.auth import CurrentUser, require_roles
from app.core.rate_limit import rate_limit
from app.domains.pm.cache import load_pm_frame
from app.domains.pm.common import resolve_company
from app.domains.pm.outcome import apply_outcomes
from app.domains.pm.pm_images import fetch_ticket_images
from app.domains.pm.rules_store import get_learned_rules
from app.domains.service_calls.pdf_service import _data_uri_only_fetcher

log = logging.getLogger(__name__)

router = APIRouter()
any_user = require_roles("customer", "corob_employee", "admin")

_env = Environment(
    loader=FileSystemLoader(Path(__file__).resolve().parent / "templates"),
    autoescape=select_autoescape(["html", "xml"]),
)

_EMPTY = {"", "nan", "none", "nat"}


def _v(row: pd.Series, *keys: str) -> str:
    """First non-empty value among the given column names."""
    for k in keys:
        if k not in row.index:
            continue
        val = row[k]
        if val is None or (not isinstance(val, str) and pd.isna(val)):
            continue
        s = str(val).strip()
        if s.lower() not in _EMPTY:
            return s
    return ""


def _dt(val) -> str:
    if val is None or pd.isna(val):
        return ""
    return pd.Timestamp(val).strftime("%d %b %Y %I:%M %p").lstrip("0")


def _pairs(items: list[tuple[str, str]], always: set[str] = frozenset()) -> list[dict]:
    """Drop rows with no value, except labels in `always` (shown as a dash)."""
    out = []
    for label, value in items:
        if value:
            out.append({"label": label, "value": value})
        elif label in always:
            out.append({"label": label, "value": "—"})
    return out


def build_ticket_context(row: pd.Series) -> dict:
    ticket_no = _v(row, "ticket_no")
    engineer = _v(row, "employee_name")

    dealer_info = _pairs([
        ("Customer Name", _v(row, "company", "customer_name")),
        ("Dealer Name", _v(row, "dealer_name")),
        ("Dealer Code", _v(row, "dealer_code")),
        ("Contact No.", _v(row, "contact_no", "contact_number", "mobile_no")),
        ("Address", _v(row, "call_closure_address", "address", "dealer_address", "city")),
        ("City / Location", _v(row, "city") if _v(row, "call_closure_address", "address", "dealer_address") else ""),
        ("State", _v(row, "state")),
        ("Region", _v(row, "region")),
        ("Dealer Type", _v(row, "dealer_type")),
        ("Contact Person Name", _v(row, "contact_person_name", "contact_person")),
        ("Team Leader", _v(row, "supervisor", "team_leader")),
        ("Machine Serial No.", _v(row, "machine_no")),
    ], always={"Customer Name", "Dealer Name", "Machine Serial No."})

    complaint = _pairs([
        ("Complaint Ticket ID", ticket_no),
        ("Ticket Status", _v(row, "call_status")),
        ("PM Outcome", _v(row, "pm_outcome")),
        ("Service Engineer", engineer),
        ("Engineer Code", _v(row, "eng_code")),
        ("Issue", _v(row, "issue") or "To Do PM"),
    ], always={"Complaint Ticket ID", "Ticket Status", "Service Engineer"})

    track = []
    for label, col in (
        ("Call logged", "call_date"),
        ("Attended by SE", "call_attended_date"),
        ("Closed", "call_close_date"),
    ):
        when = _dt(row.get(col))
        if when:
            track.append({"title": f"{label} : {engineer}" if engineer else label, "when": when})

    closure = row.get("closure_hours")
    service = _pairs([
        ("Service Type", _v(row, "service_type") or "PM"),
        ("Corrective action", _v(row, "remarks")),
        ("Machine Details", _v(row, "machine_model")),
        ("Machine Location", _v(row, "loc_up_rem")),
        ("Time to close", f"{closure:.1f} hrs" if closure is not None and not pd.isna(closure) else ""),
        ("Feedback", _v(row, "feedback")),
    ], always={"Service Type", "Corrective action"})

    return {
        "ticket_no": ticket_no,
        "dealer_info": dealer_info,
        "complaint": complaint,
        "track": track,
        "service": service,
    }


@router.get("/api/pm/ticket/pdf", dependencies=[Depends(rate_limit("pdf", 20, 60))])
def ticket_pdf(
    ticket_no: str,
    company: str | None = None,
    user: CurrentUser = Depends(any_user),
):
    resolved = resolve_company(user, company, allow_all=True)
    df = load_pm_frame(resolved)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": f"No PM data uploaded yet for {resolved}."})

    df = apply_outcomes(df, get_learned_rules())
    match = df[df["ticket_no"].astype(str).str.strip() == ticket_no.strip()]
    if match.empty:
        raise HTTPException(404, {"error": "ticket_not_found", "message": f"Ticket {ticket_no} was not found."})
    row = match.iloc[0]

    ctx = build_ticket_context(row)
    images, image_note = fetch_ticket_images(ctx["ticket_no"])

    html = _env.get_template("pm_ticket.html").render(
        **ctx,
        images=images,
        image_note=image_note,
        generated_at=datetime.utcnow().strftime("%d %b %Y %H:%M UTC"),
    )

    from weasyprint import HTML
    pdf = HTML(string=html, url_fetcher=_data_uri_only_fetcher).write_pdf()

    safe = re.sub(r"[^A-Za-z0-9._-]", "_", ctx["ticket_no"])
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{safe}.pdf"'},
    )