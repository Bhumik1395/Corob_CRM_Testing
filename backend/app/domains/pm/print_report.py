from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.auth import CurrentUser, require_roles
from app.domains.pm.cache import load_pm_frame
from app.domains.pm.common import resolve_company
from app.domains.pm.outcome import apply_outcomes
from app.domains.pm.rules_store import get_learned_rules
from app.domains.pm.print_pdf import build_report_pdf

router = APIRouter()
any_user = require_roles("customer", "corob_employee")

UNKNOWN = "Unknown model"
TABLE_COLS = ["ticket_no", "dealer_code", "dealer_name", "machine_no", "call_date", "city", "region", "state"]


def _frame(company: str | None, user: CurrentUser):
    resolved = resolve_company(user, company)
    df = load_pm_frame(resolved)
    if df is None:
        raise HTTPException(404, {"error": "no_data", "message": f"No PM data uploaded yet for {resolved}."})
    return resolved, df


def _clean_models(df):
    if "machine_model" not in df.columns:
        df = df.copy()
        df["machine_model"] = UNKNOWN
        return df
    df = df.copy()
    df["machine_model"] = (
        df["machine_model"].fillna("").astype(str).str.strip()
        .replace({"": UNKNOWN, "nan": UNKNOWN, "None": UNKNOWN})
    )
    return df


@router.get("/api/pm/print/options")
def print_options(company: str | None = None, user: CurrentUser = Depends(any_user)):
    _, df = _frame(company, user)
    df = _clean_models(df)
    dates = df["call_date"].dropna()
    return {
        "periods": sorted(dates.dt.strftime("%Y-%m").unique().tolist()),
        "models": sorted(df["machine_model"].unique().tolist()),
    }


@router.get("/api/pm/print/pdf")
def print_pdf(
    year: int,
    month: int,
    company: str | None = None,
    model: str | None = None,
    user: CurrentUser = Depends(any_user),
):
    if not 1 <= month <= 12:
        raise HTTPException(400, {"error": "bad_month", "message": "Month must be between 1 and 12."})

    resolved, df = _frame(company, user)
    df = apply_outcomes(df, get_learned_rules())
    df = _clean_models(df).dropna(subset=["call_date"])

    year_df = df[df["call_date"].dt.year == year]
    if model:
        year_df = year_df[year_df["machine_model"] == model]
    month_df = year_df[year_df["call_date"].dt.month == month]

    if month_df.empty:
        raise HTTPException(404, {
            "error": "no_rows",
            "message": "No PM records match this model, month and year.",
        })

    sections = []
    for model_name in sorted(month_df["machine_model"].unique()):
        yearly = year_df[year_df["machine_model"] == model_name]
        by_month = yearly.groupby(yearly["call_date"].dt.month).agg(
            total=("is_closed", "size"), done=("is_closed", "sum")
        )
        done = [int(by_month["done"].get(m, 0)) for m in range(1, 13)]
        total = [int(by_month["total"].get(m, 0)) for m in range(1, 13)]
        dispute = [t - d for t, d in zip(total, done)]

        rows_df = (
            month_df[month_df["machine_model"] == model_name]
            .sort_values("call_date")
            .reindex(columns=TABLE_COLS + ["is_closed"])
        )
        is_done = rows_df["is_closed"].fillna(False).astype(bool)
        month_done = int(is_done.sum())

        rows_df = rows_df[TABLE_COLS].copy()
        rows_df["call_date"] = rows_df["call_date"].dt.strftime("%d-%m-%Y")
        rows_df["pm_status"] = is_done.map({True: "PM Done", False: "Dispute"})
        rows = rows_df.fillna("").astype(str).to_dict("records")

        sections.append({
            "model": model_name,
            "done": done,
            "dispute": dispute,
            "rows": rows,
            "month_total": len(rows),
            "month_done": month_done,
            "month_dispute": len(rows) - month_done,
        })

    pdf = build_report_pdf(resolved, year, month, sections)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="PM_Report_{year}-{month:02d}.pdf"'},
    )