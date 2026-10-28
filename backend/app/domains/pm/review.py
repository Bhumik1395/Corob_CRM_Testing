from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import CurrentUser, require_roles
from app.domains.pm.outcome import (next_question, count_matches, list_remarks,
                                    rows_for_remark, tickets_for_remark, DONE, DISPUTE)
from app.domains.pm.overrides_store import set_overrides, clear_overrides
from app.domains.pm.rules_store import (get_learned_rules, save_rule, list_history, set_label, set_active)
from app.domains.pm.cache import load_pm_df
from app.domains.pm.label_log import log_label

router = APIRouter()
employee_only = require_roles("corob_employee")


class Answer(BaseModel):
    phrase: str
    label: str


class NewLabel(BaseModel):
    label: str


class TicketRef(BaseModel):
    company: str
    ticket_no: str


class RowMark(BaseModel):
    company: str | None = None
    remark_key: str
    label: str | None = None          # None = clear the override (back to the remark's rule)
    tickets: list[TicketRef] = []
    all_rows: bool = False            # True = every row with this remark, across all pages


def _check_label(label):
    if label not in (DONE, DISPUTE):
        raise HTTPException(400, {"error": "bad_label", "message": "Label must be 'PM Done' or 'Dispute'."})


@router.get("/api/pm/review/next")
def review_next(company: str | None = None, skip: str = "", user: CurrentUser = Depends(employee_only)):
    df = load_pm_df(user, company)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet for this company."})
    return next_question(df, get_learned_rules(), skip=[s for s in skip.split("|") if s])


@router.get("/api/pm/review/remarks")
def review_remarks(
    company: str | None = None,
    status: str = "all",
    search: str = "",
    page: int = 1,
    page_size: int = 25,
    user: CurrentUser = Depends(employee_only),
):
    df = load_pm_df(user, company)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet for this company."})
    return list_remarks(df, get_learned_rules(), status=status, search=search, page=max(page, 1), page_size=min(max(page_size, 1), 100))


@router.post("/api/pm/review/answer")
def review_answer(body: Answer, user: CurrentUser = Depends(employee_only)):
    _check_label(body.label)
    try:
        save_rule(body.phrase, body.label, user.username)
    except ValueError:
        raise HTTPException(400, {"error": "bad_phrase", "message": "Phrase must be 1 to 255 characters."})
    log_label("phrase_answer", user.username, body.label, phrase=body.phrase)
    return {"saved": True}


@router.get("/api/pm/review/history")
def review_history(company: str | None = None, scope: str = "mine", user: CurrentUser = Depends(employee_only)):
    rules = list_history(None if scope == "all" else user.username)
    counts = {}
    if company:
        df = load_pm_df(user, company)
        if df is not None:
            counts = count_matches(df, [r["phrase"] for r in rules])
    for r in rules:
        r["rowsAffected"] = counts.get(r["phrase"]) if counts else None
    return {"rules": rules}


@router.post("/api/pm/review/rules/{rule_id}/label")
def review_change(rule_id: int, body: NewLabel, user: CurrentUser = Depends(employee_only)):
    _check_label(body.label)
    if not set_label(rule_id, body.label, user.username):
        raise HTTPException(404, {"error": "not_found", "message": "Rule not found."})
    log_label("rule_change", user.username, body.label, rule_id=rule_id)
    return {"changed": True}


@router.post("/api/pm/review/rules/{rule_id}/restore")
def review_restore(rule_id: int, user: CurrentUser = Depends(employee_only)):
    if not set_active(rule_id, True, user.username):
        raise HTTPException(404, {"error": "not_found", "message": "Rule not found."})
    log_label("rule_restore", user.username, None, rule_id=rule_id)
    return {"restored": True}


@router.delete("/api/pm/review/rules/{rule_id}")
def review_remove(rule_id: int, user: CurrentUser = Depends(employee_only)):
    if not set_active(rule_id, False, user.username):
        raise HTTPException(404, {"error": "not_found", "message": "Rule not found."})
    log_label("rule_remove", user.username, None, rule_id=rule_id)
    return {"removed": True}


@router.get("/api/pm/review/rows")
def review_rows(
    key: str,
    company: str | None = None,
    page: int = 1,
    page_size: int = 25,
    user: CurrentUser = Depends(employee_only),
):
    df = load_pm_df(user, company)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet for this company."})
    return rows_for_remark(df, get_learned_rules(), key, max(page, 1), min(max(page_size, 1), 100))


@router.post("/api/pm/review/rows/mark")
def review_rows_mark(body: RowMark, user: CurrentUser = Depends(employee_only)):
    if body.label is not None:
        _check_label(body.label)
    if body.all_rows:
        df = load_pm_df(user, body.company)
        if df is None:
            raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet for this company."})
        pairs = tickets_for_remark(df, body.remark_key)
    else:
        if len(body.tickets) > 5000:
            raise HTTPException(400, {"error": "too_many", "message": "Select at most 5000 rows at once."})
        pairs = [(t.company, t.ticket_no.strip()) for t in body.tickets]
    if not pairs:
        raise HTTPException(400, {"error": "nothing_selected", "message": "No rows selected."})
    if body.label is None:
        clear_overrides(pairs)
    else:
        set_overrides(pairs, body.label, user.username)
    log_label(
        "row_reset" if body.label is None else "row_mark",
        user.username, body.label,
        remark_key=body.remark_key,
        company=body.company,
        all_rows=body.all_rows,
        ticket_count=len(pairs),
        tickets=[{"company": c, "ticket_no": t} for c, t in pairs[:5000]],
    )
    return {"updated": len(pairs)}