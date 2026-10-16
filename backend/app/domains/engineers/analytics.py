import pandas as pd

from app.domains.service_calls.utilization_analytics import WORKING_DAYS_PER_MONTH
from app.shared.employee_mapping_service import load_employee_mapping

SERVICE_DETAIL_COLS = [
    "call_date", "customer", "state", "status", "visit_type", "service_type",
    "employee_name", "eng_code", "dealer_code", "dealer_name", "city", "remarks",
]


def _clean_code(eng_code: str) -> str:
    return str(eng_code).strip()


def _engineer_rows(df: pd.DataFrame, eng_code: str) -> pd.DataFrame:
    d = df[df["eng_code"].astype(str).str.strip() == _clean_code(eng_code)]
    return d.dropna(subset=["call_date"]).copy()


def _engineer_name(eng_code: str, rows: pd.DataFrame) -> str:
    name = load_employee_mapping().get(_clean_code(eng_code))
    if name:
        return name
    if "employee_name" in rows.columns and not rows.empty:
        return str(rows["employee_name"].iloc[0])
    return ""


def _daily_quota(rows: pd.DataFrame) -> pd.DataFrame:
    """One source's days: call_day + whether THIS source alone met the quota
    (2+ local jobs, or 1+ upcountry/remote job, that day)."""
    d = rows.copy()
    d["call_day"] = d["call_date"].dt.normalize()
    d["bucket"] = d["loc_up_rem"].apply(lambda v: "Local" if v == "Local" else "Upcountry")
    daily = (
        d.groupby(["call_day", "bucket"])
        .size()
        .unstack("bucket", fill_value=0)
        .reset_index()
    )
    for col in ("Local", "Upcountry"):
        if col not in daily.columns:
            daily[col] = 0
    daily["quota_met"] = (daily["Local"] >= 2) | (daily["Upcountry"] >= 1)
    return daily[["call_day", "quota_met"]]


def _visit_split(rows: pd.DataFrame) -> dict:
    """{year_month: {"local": n, "upcountry": n}} (upcountry includes remote)."""
    if rows.empty:
        return {}
    d = rows.copy()
    d["year_month"] = d["call_date"].dt.strftime("%Y-%m")
    d["bucket"] = d["loc_up_rem"].apply(lambda v: "local" if v == "Local" else "upcountry")
    g = d.groupby(["year_month", "bucket"]).size().unstack("bucket", fill_value=0)
    for col in ("local", "upcountry"):
        if col not in g.columns:
            g[col] = 0
    return {
        ym: {"local": int(r["local"]), "upcountry": int(r["upcountry"])}
        for ym, r in g.iterrows()
    }


def compute_engineer_monthly(df: pd.DataFrame, eng_code: str, source: str) -> dict:
    """Per-month activity for one engineer.

    Daily quota: 2 local jobs, or 1 upcountry/remote job.
    - service: count = all calls, negative_count = repeat machines that month
    - pm:      count = closed PMs (PM Done), negative_count = open PMs (Dispute)
    """
    base = {"source": source, "engCode": eng_code, "workingDaysPerMonth": WORKING_DAYS_PER_MONTH}
    empty_totals = {"daysQuotaMet": 0, "totalWorkingDays": 0, "utilizationPct": 0.0,
                    "count": 0, "negativeCount": 0}

    rows = _engineer_rows(df, eng_code)
    if rows.empty:
        return {**base, "months": [], "totals": empty_totals}

    rows["year_month"] = rows["call_date"].dt.strftime("%Y-%m")
    all_months = sorted(rows["year_month"].unique())

    if source == "pm":
        closed = rows["is_closed"] if "is_closed" in rows.columns else pd.Series(True, index=rows.index)
        d = rows[closed]
        negative = rows[~closed].groupby("year_month").size()
    else:
        d = rows
        reps = d.groupby(["year_month", "machine_no"]).size().reset_index(name="cnt")
        negative = reps[reps["cnt"] > 1].groupby("year_month").size()

    out = pd.DataFrame(
        {"count": 0, "days_active": 0, "days_quota_met": 0, "negative_count": 0},
        index=all_months,
    )

    if not d.empty:
        d = d.copy()
        daily = _daily_quota(d)
        daily["year_month"] = daily["call_day"].dt.strftime("%Y-%m")
        per_month = daily.groupby("year_month").agg(
            days_active=("call_day", "count"),
            days_quota_met=("quota_met", "sum"),
        )
        out.loc[per_month.index, "days_active"] = per_month["days_active"]
        out.loc[per_month.index, "days_quota_met"] = per_month["days_quota_met"]
        counts = d.groupby("year_month").size()
        out.loc[counts.index, "count"] = counts

    if len(negative):
        out.loc[negative.index, "negative_count"] = negative

    out["utilization_pct"] = (
        out["days_quota_met"] / WORKING_DAYS_PER_MONTH * 100
    ).clip(upper=100).round(1)
    out = out.reset_index().rename(columns={"index": "year_month"})

    months = [
        {
            "year_month": r["year_month"],
            "count": int(r["count"]),
            "negative_count": int(r["negative_count"]),
            "days_active": int(r["days_active"]),
            "days_quota_met": int(r["days_quota_met"]),
            "utilization_pct": float(r["utilization_pct"]),
        }
        for r in out.to_dict("records")
    ]

    total_days = int(out["days_quota_met"].sum())
    total_wd = WORKING_DAYS_PER_MONTH * len(out)
    totals = {
        "daysQuotaMet": total_days,
        "totalWorkingDays": total_wd,
        "utilizationPct": round(min(total_days / total_wd * 100, 100), 1) if total_wd else 0.0,
        "count": int(out["count"].sum()),
        "negativeCount": int(out["negative_count"].sum()),
    }
    return {**base, "months": months, "totals": totals}


def compute_engineer_combined(service_df, pm_df, eng_code: str) -> dict:
    """Utilization across sources. Each source is checked against the quota on its
    own (2 local or 1 upcountry/remote per day). A day counts as utilized if ANY
    source met its quota. Sources are NOT pooled together.
    Also returns, per month, how many local / upcountry visits each source had.
    Either frame may be None (not uploaded yet). Installation will be added here
    as one more source."""
    daily_frames = []
    sources = []
    splits = {}

    if service_df is not None:
        r = _engineer_rows(service_df, eng_code)
        sources.append("service")
        splits["service"] = _visit_split(r)
        if not r.empty:
            daily_frames.append(_daily_quota(r))

    if pm_df is not None:
        r = _engineer_rows(pm_df, eng_code)
        if "is_closed" in r.columns:
            r = r[r["is_closed"]]
        sources.append("pm")
        splits["pm"] = _visit_split(r)
        if not r.empty:
            daily_frames.append(_daily_quota(r))

    empty_totals = {"daysQuotaMet": 0, "totalWorkingDays": 0, "utilizationPct": 0.0}
    base = {"engCode": eng_code, "workingDaysPerMonth": WORKING_DAYS_PER_MONTH, "sources": sources}
    if not daily_frames:
        return {**base, "months": [], "totals": empty_totals}

    per_day = (
        pd.concat(daily_frames, ignore_index=True)
        .groupby("call_day", as_index=False)["quota_met"].max()
    )
    per_day["year_month"] = per_day["call_day"].dt.strftime("%Y-%m")

    per_month = (
        per_day.groupby("year_month")
        .agg(days_active=("call_day", "count"), days_quota_met=("quota_met", "sum"))
        .reset_index()
        .sort_values("year_month")
    )
    per_month["utilization_pct"] = (
        per_month["days_quota_met"] / WORKING_DAYS_PER_MONTH * 100
    ).clip(upper=100).round(1)

    months = []
    for r in per_month.to_dict("records"):
        ym = r["year_month"]
        visits = {
            src: splits[src].get(ym, {"local": 0, "upcountry": 0})
            for src in splits
        }
        months.append({
            "year_month": ym,
            "days_active": int(r["days_active"]),
            "days_quota_met": int(r["days_quota_met"]),
            "utilization_pct": float(r["utilization_pct"]),
            "visits": visits,
        })

    total_days = int(per_month["days_quota_met"].sum())
    total_wd = WORKING_DAYS_PER_MONTH * len(per_month)
    totals = {
        "daysQuotaMet": total_days,
        "totalWorkingDays": total_wd,
        "utilizationPct": round(min(total_days / total_wd * 100, 100), 1) if total_wd else 0.0,
    }
    return {**base, "months": months, "totals": totals}


def compute_engineer_visits(
    df: pd.DataFrame,
    eng_code: str,
    source: str,
    page: int = 1,
    page_size: int = 50,
    month: str = "",
) -> dict:
    """The visits behind the numbers, for THIS engineer and (if given) THIS month only.
    month is "YYYY-MM"; empty means all months.
    service -> machines this engineer visited more than once in that period, with their calls
    pm      -> every PM ticket of this engineer in that period, newest first, Done/Dispute
    """
    code = _clean_code(eng_code)
    d = _engineer_rows(df, code)
    if month:
        d = d[d["call_date"].dt.strftime("%Y-%m") == month]
    start = (page - 1) * page_size
    base = {
        "source": source,
        "page": page,
        "pageSize": page_size,
        "month": month,
        "engineer": {"eng_code": code, "name": _engineer_name(code, d)},
    }

    if source == "pm":
        cols = [c for c in ("ticket_no", "dealer_code", "dealer_name", "call_date", "remarks") if c in d.columns]
        d = d.sort_values("call_date", ascending=False)
        total = len(d)
        page_df = d.iloc[start:start + page_size].copy()
        if "is_closed" in page_df.columns:
            status = page_df["is_closed"].map({True: "PM Done", False: "Dispute"})
        else:
            status = "PM Done"
        page_df = page_df[cols].copy()
        page_df["status"] = status
        page_df["call_date"] = page_df["call_date"].dt.strftime("%Y-%m-%d")
        return {**base, "rows": page_df.to_dict("records"), "totalRows": total}

    counts = d.groupby("machine_no").size()
    repeat = counts[counts > 1].sort_values(ascending=False)
    cols = [c for c in SERVICE_DETAIL_COLS if c in d.columns]
    name_mapping = load_employee_mapping()
    rows = []
    for machine_no, n in repeat.iloc[start:start + page_size].items():
        mine = d[d["machine_no"] == machine_no]
        calls = mine[cols].sort_values("call_date").copy()
        if "employee_name" in calls.columns:
            calls["employee_name"] = calls["eng_code"].map(name_mapping).fillna(calls["employee_name"])
        calls["call_date"] = calls["call_date"].dt.strftime("%Y-%m-%d")
        rows.append({"machine_no": machine_no, "repeat_count": int(n), "calls": calls.to_dict("records")})
    return {**base, "rows": rows, "totalRows": len(repeat)}