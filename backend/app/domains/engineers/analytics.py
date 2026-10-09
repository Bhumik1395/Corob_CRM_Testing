import pandas as pd

from app.domains.service_calls.utilization_analytics import WORKING_DAYS_PER_MONTH


def compute_engineer_monthly(df: pd.DataFrame, eng_code: str, source: str) -> dict:
    """Per-month activity for one engineer from Service Call or PM rows.

    Daily quota (both sources): 2 local jobs, or 1 upcountry/remote job.
    A "day" is the call_date's calendar day. For PM only closed PMs count as work done.
    """
    d = df[df["eng_code"].astype(str).str.strip() == eng_code.strip()]
    if source == "pm" and "is_closed" in d.columns:
        d = d[d["is_closed"]]
    d = d.dropna(subset=["call_date"])

    base = {"source": source, "engCode": eng_code, "workingDaysPerMonth": WORKING_DAYS_PER_MONTH}
    if d.empty:
        return {**base, "months": []}

    d = d.copy()
    d["year_month"] = d["call_date"].dt.strftime("%Y-%m")
    d["call_day"] = d["call_date"].dt.normalize()
    d["bucket"] = d["loc_up_rem"].apply(lambda v: "Local" if v == "Local" else "Upcountry")

    daily = (
        d.groupby(["year_month", "call_day", "bucket"])
        .size()
        .unstack("bucket", fill_value=0)
        .reset_index()
    )
    for col in ("Local", "Upcountry"):
        if col not in daily.columns:
            daily[col] = 0
    daily["quota_met"] = (daily["Local"] >= 2) | (daily["Upcountry"] >= 1)

    per_month = daily.groupby("year_month").agg(
        days_active=("call_day", "count"),
        days_quota_met=("quota_met", "sum"),
    )
    counts = d.groupby("year_month").size().rename("count")
    out = per_month.join(counts).reset_index().sort_values("year_month")
    out["utilization_pct"] = (
        out["days_quota_met"] / WORKING_DAYS_PER_MONTH * 100
    ).clip(upper=100).round(1)

    months = [
        {
            "year_month": r["year_month"],
            "count": int(r["count"]),
            "days_active": int(r["days_active"]),
            "days_quota_met": int(r["days_quota_met"]),
            "utilization_pct": float(r["utilization_pct"]),
        }
        for r in out.to_dict("records")
    ]
    return {**base, "months": months}