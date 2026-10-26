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


def _daily_quota(d: pd.DataFrame) -> pd.DataFrame:
    """One source, all engineers: (eng_code, call_day, quota_met) where quota_met
    means THIS source alone had 2+ local or 1+ upcountry/remote jobs that day."""
    d = d.dropna(subset=["call_date"]).copy()
    d["eng_code"] = d["eng_code"].fillna("").astype(str).str.strip()
    d = d[d["eng_code"] != ""]
    if d.empty:
        return pd.DataFrame(columns=["eng_code", "call_day", "quota_met"])
    d["call_day"] = d["call_date"].dt.normalize()
    d["bucket"] = d["loc_up_rem"].eq("Local").map({True: "Local", False: "Upcountry"})
    daily = (
        d.groupby(["eng_code", "call_day", "bucket"]).size()
        .unstack("bucket", fill_value=0).reset_index()
    )
    for col in ("Local", "Upcountry"):
        if col not in daily.columns:
            daily[col] = 0
    daily["quota_met"] = (daily["Local"] >= 2) | (daily["Upcountry"] >= 1)
    return daily[["eng_code", "call_day", "quota_met"]]


def compute_utilization(
    df: pd.DataFrame,
    customer: str = None,
    year: int | None = None,
    month: int | None = None,
    pm_df: pd.DataFrame | None = None,            # closed (PM Done) rows only
    installation_df: pd.DataFrame | None = None,  # output of prepare_installation()
) -> dict:
    """Same rule as the engineer panel: each source is checked against the quota
    on its own, and a day counts if ANY source met it."""
    svc = df.copy()
    if customer:
        svc = svc[svc["customer"] == customer]

    sources = [(svc, "employee_name")]
    for extra, name_col in ((pm_df, "employee_name"), (installation_df, "eng_name")):
        if extra is None:
            continue
        if customer and "company" in extra.columns:
            extra = extra[extra["company"] == customer]
        sources.append((extra, name_col))
    sources = [(f.dropna(subset=["call_date"]), n) for f, n in sources]

    periods = sorted({p for f, _ in sources for p in f["call_date"].dt.strftime("%Y-%m")})

    def in_period(f):
        if year:
            f = f[f["call_date"].dt.year == year]
        if month:
            f = f[f["call_date"].dt.month == month]
        return f

    scoped = [(in_period(f), n) for f, n in sources]

    empty = {"distinctMonths": 0, "totalWorkingDays": 0, "periods": periods,
             "engineers": [], "supervisors": []}

    daily_frames = [q for q in (_daily_quota(f) for f, _ in scoped) if not q.empty]
    if not daily_frames:
        return empty

    per_day = (
        pd.concat(daily_frames, ignore_index=True)
        .groupby(["eng_code", "call_day"], as_index=False)["quota_met"].max()
    )
    per_day["year_month"] = per_day["call_day"].dt.to_period("M")

    distinct_months = per_day["year_month"].nunique()
    total_working_days = WORKING_DAYS_PER_MONTH * max(distinct_months, 1)

    eng_summary = per_day.groupby("eng_code").agg(
        days_quota_met=("quota_met", "sum"),
    ).reset_index()

    # Service-only stats (calls and under-norm only exist for service calls)
    svc_scoped = scoped[0][0]
    call_counts = svc_scoped.groupby("eng_code").size()
    eng_summary["total_calls"] = eng_summary["eng_code"].map(call_counts).fillna(0).astype(int)

    un = svc_scoped.groupby("eng_code")["under_norm"].agg(["sum", "count"])
    un_pct = (un["sum"] / un["count"] * 100).round(1)
    eng_summary["under_norm_pct"] = eng_summary["eng_code"].map(un_pct)  # NaN = no service calls

    # Name + supervisor from whichever source has them
    ident = pd.concat(
        [
            pd.DataFrame({
                "eng_code": f["eng_code"].astype(str).str.strip(),
                "name": f[n] if n in f.columns else "",
                "supervisor": f["supervisor"] if "supervisor" in f.columns else "",
            })
            for f, n in scoped if not f.empty
        ],
        ignore_index=True,
    )
    supervisor_by_eng = ident.groupby("eng_code")["supervisor"].agg(lambda s: _most_common(s, UNASSIGNED))
    name_by_eng = ident.groupby("eng_code")["name"].agg(lambda s: _most_common(s, ""))
    eng_summary["supervisor"] = eng_summary["eng_code"].map(supervisor_by_eng).fillna(UNASSIGNED)
    eng_summary["employee_name"] = (
        eng_summary["eng_code"].map(load_employee_mapping())
        .fillna(eng_summary["eng_code"].map(name_by_eng))
        .fillna("")
    )

    eng_summary["utilization_pct"] = (
        eng_summary["days_quota_met"] / total_working_days * 100
    ).clip(upper=100).round(1)
    eng_summary = eng_summary.sort_values("utilization_pct", ascending=False)

    supervisor_summary = eng_summary.groupby("supervisor").agg(
        num_engineers=("eng_code", "nunique"),
        avg_utilization_pct=("utilization_pct", "mean"),
        avg_under_norm_pct=("under_norm_pct", "mean"),  # skips engineers with no service calls
        total_calls=("total_calls", "sum"),
    ).reset_index()
    supervisor_summary["avg_utilization_pct"] = supervisor_summary["avg_utilization_pct"].round(1)
    supervisor_summary["avg_under_norm_pct"] = supervisor_summary["avg_under_norm_pct"].round(1).fillna(0)
    supervisor_summary = supervisor_summary.sort_values("avg_utilization_pct", ascending=False)

    eng_summary["under_norm_pct"] = eng_summary["under_norm_pct"].fillna(0)
    engineers = eng_summary[[
        "eng_code", "employee_name", "supervisor",
        "total_calls", "days_quota_met", "utilization_pct", "under_norm_pct",
    ]].to_dict("records")

    return {
        "distinctMonths": int(distinct_months),
        "totalWorkingDays": int(total_working_days),
        "periods": periods,
        "engineers": engineers,
        "supervisors": supervisor_summary.to_dict("records"),
    }