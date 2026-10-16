from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import CurrentUser, require_roles
from app.domains.pm.outcome import next_question, count_matches, DONE, DISPUTE
from app.domains.pm.rules_store import (get_learned_rules, save_rule, list_history, set_label, set_active)
from app.domains.pm.cache import load_pm_df

router = APIRouter()
employee_only = require_roles("corob_employee")


class Answer(BaseModel):
    phrase: str
    label: str


class NewLabel(BaseModel):
    label: str


def _check_label(label):
    if label not in (DONE, DISPUTE):
        raise HTTPException(400, {"error": "bad_label", "message": "Label must be 'PM Done' or 'Dispute'."})


@router.get("/api/pm/review/next")
def review_next(company: str | None = None, skip: str = "", user: CurrentUser = Depends(employee_only)):
    df = load_pm_df(user, company)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": "No PM data uploaded yet for this company."})
    return next_question(df, get_learned_rules(), skip=[s for s in skip.split("|") if s])


@router.post("/api/pm/review/answer")
def review_answer(body: Answer, user: CurrentUser = Depends(employee_only)):
    _check_label(body.label)
    try:
        save_rule(body.phrase, body.label, user.username)
    except ValueError:
        raise HTTPException(400, {"error": "bad_phrase", "message": "Phrase must have at least 2 words."})
    return {"saved": True}


@router.get("/api/pm/review/history")
def review_history(company: str | None = None, scope: str = "mine", user: CurrentUser = Depends(employee_only)):
    """scope=mine: rules this employee answered or changed. scope=all: every rule."""
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
    return {"changed": True}


@router.post("/api/pm/review/rules/{rule_id}/restore")
def review_restore(rule_id: int, user: CurrentUser = Depends(employee_only)):
    if not set_active(rule_id, True, user.username):
        raise HTTPException(404, {"error": "not_found", "message": "Rule not found."})
    return {"restored": True}


@router.delete("/api/pm/review/rules/{rule_id}")
def review_remove(rule_id: int, user: CurrentUser = Depends(employee_only)):
    if not set_active(rule_id, False, user.username):
        raise HTTPException(404, {"error": "not_found", "message": "Rule not found."})
    return {"removed": True}
