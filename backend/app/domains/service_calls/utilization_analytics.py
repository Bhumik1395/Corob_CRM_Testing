import pandas as pd
from app.shared.employee_mapping_service import load_employee_mapping

WORKING_DAYS_PER_MONTH = 26
UNASSIGNED = "Unassigned"


def _most_common(s: pd.Series, default: str) -> str:
    """Most frequent non-blank value (an engineer's supervisor can vary by call)."""
    vals = s.dropna()
    vals = vals[vals.astype(str).str.strip() != ""]
    if vals.empty:
        return default
    return str(vals.mode().iloc[0])


def compute_utilization(
    df: pd.DataFrame,
    customer: str = None,
    year: int | None = None,
    month: int | None = None,
) -> dict:
    d = df.copy()
    if customer:
        d = d[d["customer"] == customer]
    d = d.dropna(subset=["call_date"])

    # Every month present for this customer, before the year/month filter, so the
    # pickers keep showing all options after one is chosen.
    periods = sorted(d["call_date"].dt.strftime("%Y-%m").unique().tolist())

    if year:
        d = d[d["call_date"].dt.year == year]
    if month:
        d = d[d["call_date"].dt.month == month]

    if d.empty:
        return {
            "distinctMonths": 0,
            "totalWorkingDays": 0,
            "periods": periods,
            "engineers": [],
            "supervisors": [],
        }

    d["call_day"] = d["call_date"].dt.date
    d["year_month"] = d["call_date"].dt.to_period("M")

    d["quota_bucket"] = d["loc_up_rem"].apply(
        lambda v: "Local" if v == "Local" else "Upcountry"
    )

    distinct_months = d["year_month"].nunique()
    total_working_days = WORKING_DAYS_PER_MONTH * max(distinct_months, 1)

    daily = (
        d.groupby(["eng_code", "call_day", "quota_bucket"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )
    if "Local" not in daily.columns:
        daily["Local"] = 0
    if "Upcountry" not in daily.columns:
        daily["Upcountry"] = 0

    daily["quota_met"] = (daily["Local"] >= 2) | (daily["Upcountry"] >= 1)

    eng_summary = daily.groupby("eng_code").agg(
        days_quota_met=("quota_met", "sum"),
    ).reset_index()

    call_counts = d.groupby("eng_code").size().reset_index(name="total_calls")
    eng_summary = eng_summary.merge(call_counts, on="eng_code", how="left")

    under_norm_counts = d.groupby("eng_code")["under_norm"].agg(["sum", "count"]).reset_index()
    under_norm_counts["under_norm_pct"] = (under_norm_counts["sum"] / under_norm_counts["count"] * 100).round(1)
    eng_summary = eng_summary.merge(
        under_norm_counts[["eng_code", "under_norm_pct"]], on="eng_code", how="left"
    )

    # Supervisor comes only from the "Call Forwarded to" column in the uploaded data.
    supervisor_by_eng = d.groupby("eng_code")["supervisor"].agg(lambda s: _most_common(s, UNASSIGNED))
    eng_summary["supervisor"] = eng_summary["eng_code"].map(supervisor_by_eng).fillna(UNASSIGNED)

    name_mapping = load_employee_mapping()
    fallback_name = d.groupby("eng_code")["employee_name"].agg(
        lambda s: s.mode().iloc[0] if not s.mode().empty else s.iloc[0]
    ).reset_index().rename(columns={"employee_name": "fallback_name"})
    eng_summary = eng_summary.merge(fallback_name, on="eng_code", how="left")
    eng_summary["employee_name"] = eng_summary["eng_code"].map(name_mapping).fillna(eng_summary["fallback_name"])
    eng_summary = eng_summary.drop(columns=["fallback_name"])

    eng_summary["utilization_pct"] = (
        eng_summary["days_quota_met"] / total_working_days * 100
    ).clip(upper=100).round(1)

    eng_summary = eng_summary.sort_values("utilization_pct", ascending=False)

    engineers = eng_summary[[
        "eng_code", "employee_name", "supervisor",
        "total_calls", "days_quota_met", "utilization_pct", "under_norm_pct",
    ]].to_dict("records")

    supervisor_summary = eng_summary.groupby("supervisor").agg(
        num_engineers=("eng_code", "nunique"),
        avg_utilization_pct=("utilization_pct", "mean"),
        avg_under_norm_pct=("under_norm_pct", "mean"),
        total_calls=("total_calls", "sum"),
    ).reset_index()
    supervisor_summary["avg_utilization_pct"] = supervisor_summary["avg_utilization_pct"].round(1)
    supervisor_summary["avg_under_norm_pct"] = supervisor_summary["avg_under_norm_pct"].round(1)
    supervisor_summary = supervisor_summary.sort_values("avg_utilization_pct", ascending=False)

    supervisors = supervisor_summary.to_dict("records")

    return {
        "distinctMonths": int(distinct_months),
        "totalWorkingDays": int(total_working_days),
        "periods": periods,
        "engineers": engineers,
        "supervisors": supervisors,
    }
# In frontend:
# You can show a "Total Working Days" card.
# The `totalWorkingDays` field is computed as `distinctMonths * 26`.
# So if `distinctMonths` is 0 (no data), `totalWorkingDays` will be 0.
# The frontend can simply multiply the selected number of months by 26, 
# or you can pass `distinctMonths` from the backend and compute it in the frontend.