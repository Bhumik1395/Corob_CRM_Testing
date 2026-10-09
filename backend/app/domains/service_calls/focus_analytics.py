import pandas as pd


def _build_breakdown(grouped: pd.DataFrame, filtered: pd.DataFrame, group_col: str) -> pd.DataFrame:
    grouped["over_norm_calls"] = grouped["total_calls"] - grouped["under_norm_calls"]
    grouped["under_norm_pct"] = (grouped["under_norm_calls"] / grouped["total_calls"] * 100).round(1)
    grouped["over_norm_pct"] = (grouped["over_norm_calls"] / grouped["total_calls"] * 100).round(1)

    repeat = filtered.groupby([group_col, "machine_no"]).size().reset_index(name="cnt")
    repeat = repeat[repeat["cnt"] > 1].groupby(group_col).size().reset_index(name="repeat_calls")
    grouped = grouped.merge(repeat, on=group_col, how="left")
    grouped["repeat_calls"] = grouped["repeat_calls"].fillna(0).astype(int)
    return grouped


def compute_focus(
    df: pd.DataFrame,
    customer=None, state=None, machine=None, status=None, service_type=None,
    page: int = 1, page_size: int = 50,
) -> dict:
    filtered = df
    if customer: filtered = filtered[filtered["customer"] == customer]
    if state: filtered = filtered[filtered["state"] == state]
    if machine: filtered = filtered[filtered["machine_no"] == machine]
    if status: filtered = filtered[filtered["status"] == status]

    if "service_type" in filtered.columns:
        filtered = filtered[filtered["service_type"] != "Gdata"]
        if service_type:
            filtered = filtered[filtered["service_type"] == service_type]

    total_calls = len(filtered)
    under_norm_calls = int(filtered["under_norm"].sum())
    repeat_counts = filtered.groupby("machine_no").size()
    repeat_calls = int((repeat_counts > 1).sum())

    avg_local_closure = None
    avg_upcountry_closure = None
    if "time_to_resolve_hours" in filtered.columns and "loc_up_rem" in filtered.columns:
        local_rows = filtered[filtered["loc_up_rem"] == "Local"]["time_to_resolve_hours"]
        upcountry_rows = filtered[filtered["loc_up_rem"].isin(["Upcountry", "Remote"])]["time_to_resolve_hours"]
        if local_rows.notna().any():
            avg_local_closure = round(local_rows.mean(), 1)
        if upcountry_rows.notna().any():
            avg_upcountry_closure = round(upcountry_rows.mean(), 1)

    region_visit = (
        filtered.groupby(["region", "visit_type"]).size()
        .unstack(fill_value=0)
        .reset_index()
    )
    for col in ["Physical", "Online", "Unknown"]:
        if col not in region_visit.columns:
            region_visit[col] = 0
    region_visit_type = region_visit[["region", "Physical", "Online", "Unknown"]].sort_values(
        "Physical", ascending=False
    ).to_dict("records")

    repeat_machines_chart = (
        repeat_counts[repeat_counts > 1]
        .sort_values(ascending=False)
        .head(10)
        .reset_index(name="calls")
        .rename(columns={"machine_no": "machine"})
        .to_dict("records")
    )

    state_grouped = filtered.groupby("state").agg(
        total_calls=("machine_no", "count"),
        under_norm_calls=("under_norm", "sum"),
    ).reset_index()
    state_grouped = _build_breakdown(state_grouped, filtered, "state")

    state_region_map = filtered.groupby("state")["region"].agg(
        lambda s: s.mode().iloc[0] if not s.mode().empty else s.iloc[0]
    ).reset_index()
    state_grouped = state_grouped.merge(state_region_map, on="state", how="left")

    region_grouped = filtered.groupby("region").agg(
        total_calls=("machine_no", "count"),
        under_norm_calls=("under_norm", "sum"),
    ).reset_index()
    region_grouped = _build_breakdown(region_grouped, filtered, "region")
    region_grouped = region_grouped.sort_values("total_calls", ascending=False)

    region_breakdown = []
    for _, region_row in region_grouped.iterrows():
        region_name = region_row["region"]
        states_in_region = (
            state_grouped[state_grouped["region"] == region_name]
            .sort_values("total_calls", ascending=False)
            [["state", "total_calls", "repeat_calls", "under_norm_calls", "under_norm_pct", "over_norm_calls", "over_norm_pct"]]
            .to_dict("records")
        )
        region_breakdown.append({
            "region": region_name,
            "total_calls": int(region_row["total_calls"]),
            "repeat_calls": int(region_row["repeat_calls"]),
            "under_norm_calls": int(region_row["under_norm_calls"]),
            "under_norm_pct": float(region_row["under_norm_pct"]),
            "over_norm_calls": int(region_row["over_norm_calls"]),
            "over_norm_pct": float(region_row["over_norm_pct"]),
            "states": states_in_region,
        })

    monthly = filtered.copy()
    monthly["year_month"] = monthly["call_date"].dt.strftime("%Y-%m")

    calls_per_month = monthly.groupby("year_month").size().reset_index(name="calls")

    under_norm_per_month = monthly.groupby("year_month")["under_norm"].agg(["sum", "count"]).reset_index()
    under_norm_per_month["under_norm_pct"] = (
        under_norm_per_month["sum"] / under_norm_per_month["count"] * 100
    ).round(1)

    repeat_per_month = monthly.groupby(["year_month", "machine_no"]).size().reset_index(name="cnt")
    repeat_per_month = (
        repeat_per_month[repeat_per_month["cnt"] > 1]
        .groupby("year_month").size().reset_index(name="repeat_calls")
    )

    monthly_trend = calls_per_month.merge(
        under_norm_per_month[["year_month", "under_norm_pct"]], on="year_month", how="left"
    )
    monthly_trend = monthly_trend.merge(repeat_per_month, on="year_month", how="left")
    monthly_trend["repeat_calls"] = monthly_trend["repeat_calls"].fillna(0).astype(int)
    monthly_trend = monthly_trend.sort_values("year_month")
    monthly_trend_list = monthly_trend.to_dict("records")

    repeat_machine_counts = repeat_counts[repeat_counts > 1].sort_values(ascending=False)
    total_repeat_machines = len(repeat_machine_counts)
    start = (page - 1) * page_size
    page_machine_ids = repeat_machine_counts.iloc[start:start + page_size]

    detail_cols = [
        "call_date", "customer", "state", "status", "visit_type", "service_type", "employee_name",
        "dealer_code", "dealer_name", "city", "remarks",
    ]
    available_detail_cols = [c for c in detail_cols if c in filtered.columns]

    repeat_machines_rows = []
    for machine_no, count in page_machine_ids.items():
        machine_calls = (
            filtered[filtered["machine_no"] == machine_no]
            [available_detail_cols]
            .sort_values("call_date")
            .copy()
        )
        machine_calls["call_date"] = machine_calls["call_date"].dt.strftime("%Y-%m-%d")
        repeat_machines_rows.append({
            "machine_no": machine_no,
            "repeat_count": int(count),
            "calls": machine_calls.to_dict("records"),
        })

    return {
        "kpis": {
            "totalMachines": int(filtered["machine_no"].nunique()),
            "totalCalls": total_calls,
            "underNormPct": round(under_norm_calls / total_calls * 100, 1) if total_calls else 0,
            "repeatCalls": repeat_calls,
            "avgLocalClosureHours": avg_local_closure,
            "avgUpcountryClosureHours": avg_upcountry_closure,
        },
        "regionBreakdown": region_breakdown,
        "monthlyTrend": monthly_trend_list,
        "charts": {
            "regionVisitType": region_visit_type,
            "repeatMachines": repeat_machines_chart,
        },
        "repeatMachinesTable": {
            "rows": repeat_machines_rows,
            "page": page,
            "pageSize": page_size,
            "totalRows": total_repeat_machines,
        },
    }
