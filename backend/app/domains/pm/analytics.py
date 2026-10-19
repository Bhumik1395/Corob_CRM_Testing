import pandas as pd


def _trend(df: pd.DataFrame, period_col: str) -> list[dict]:
    if df.empty:
        return []
    g = (
        df.groupby(period_col)
        .agg(pm_count=("ticket_no", "count"), done_count=("is_closed", "sum"))
        .reset_index()
        .sort_values(period_col)
    )
    g["pm_count"] = g["pm_count"].astype(int)
    g["done_count"] = g["done_count"].astype(int)
    g["dispute_count"] = g["pm_count"] - g["done_count"]
    return g.to_dict("records")


def compute_pm_dashboard(
    df: pd.DataFrame,
    year: int | None = None,
    state: str | None = None,
    overall_month: str | None = None,
    month: str | None = None,
    dealer_code: str | None = None,
    detail_state: str | None = None,
    detail_month: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    if year is not None:
        df = df[df["call_date"].dt.year == year]

    filtered = df
    if state:
        filtered = filtered[filtered["state"] == state]

    total_pms = len(filtered)
    closed_pms = int(filtered["is_closed"].sum())

    state_grouped = filtered.groupby("state").agg(
        total_pms=("ticket_no", "count"),
        closed_pms=("is_closed", "sum"),
    ).reset_index()
    state_grouped["open_pms"] = state_grouped["total_pms"] - state_grouped["closed_pms"]

    state_region_map = filtered.groupby("state")["region"].agg(
        lambda s: s.mode().iloc[0] if not s.mode().empty else s.iloc[0]
    ).reset_index()
    state_grouped = state_grouped.merge(state_region_map, on="state", how="left")

    region_grouped = filtered.groupby("region").agg(
        total_pms=("ticket_no", "count"),
        closed_pms=("is_closed", "sum"),
    ).reset_index()
    region_grouped["open_pms"] = region_grouped["total_pms"] - region_grouped["closed_pms"]
    region_grouped = region_grouped.sort_values("total_pms", ascending=False)

    region_breakdown = []
    for _, region_row in region_grouped.iterrows():
        region_name = region_row["region"]
        states_in_region_df = state_grouped[state_grouped["region"] == region_name].sort_values(
            "total_pms", ascending=False
        )
        states_in_region = [
            {
                "state": r["state"],
                "total_pms": int(r["total_pms"]),
                "closed_pms": int(r["closed_pms"]),
                "open_pms": int(r["open_pms"]),
            }
            for _, r in states_in_region_df.iterrows()
        ]
        region_breakdown.append({
            "region": region_name,
            "total_pms": int(region_row["total_pms"]),
            "closed_pms": int(region_row["closed_pms"]),
            "open_pms": int(region_row["open_pms"]),
            "states": states_in_region,
        })

    monthly = filtered.copy()
    monthly["year_month"] = monthly["call_date"].dt.strftime("%Y-%m")
    monthly_trend_list = _trend(monthly, "year_month")

    available_months = sorted(monthly["year_month"].unique().tolist())
    weekly_month = month or (available_months[-1] if available_months else None)

    weekly_source = filtered
    if weekly_month:
        weekly_source = filtered[filtered["call_date"].dt.strftime("%Y-%m") == weekly_month]

    weekly = weekly_source.copy()
    weekly["year_week"] = weekly["call_date"].dt.strftime("%G-W%V")
    weekly_trend_list = _trend(weekly, "year_week")

    detail_source = df
    if detail_state:
        detail_source = detail_source[detail_source["state"] == detail_state]
    if detail_month:
        detail_source = detail_source[
            detail_source["call_date"].dt.strftime("%Y-%m") == detail_month
        ]
    if dealer_code and "dealer_code" in detail_source.columns:
        detail_source = detail_source[
            detail_source["dealer_code"].str.contains(dealer_code, case=False, na=False, regex=False)
        ]

    detail_cols = ["ticket_no", "company", "dealer_code", "dealer_name", "call_date", "remarks"]
    available_detail_cols = [c for c in detail_cols if c in detail_source.columns]
    total_detail_rows = len(detail_source)
    start = (page - 1) * page_size
    page_rows = (
        detail_source[available_detail_cols]
        .sort_values("call_date", ascending=False)
        .iloc[start:start + page_size]
        .copy()
    )
    if "call_date" in page_rows.columns:
        page_rows["call_date"] = page_rows["call_date"].dt.strftime("%Y-%m-%d")

    return {
        "kpis": {
            "totalPms": total_pms,
            "pmDone": closed_pms,
            "pmNotDone": total_pms - closed_pms,
        },
        "regionBreakdown": region_breakdown,
        "monthlyTrend": monthly_trend_list,
        "weeklyTrend": weekly_trend_list,
        "weeklyTrendMonth": weekly_month,
        "availableMonths": available_months,
        "pmDetailTable": {
            "rows": page_rows.to_dict("records"),
            "page": page,
            "pageSize": page_size,
            "totalRows": total_detail_rows,
        },
    }


def compute_pm_filter_options(df: pd.DataFrame, year: int | None = None) -> dict:
    years: list[int] = []
    if "call_date" in df.columns:
        years = sorted(int(y) for y in df["call_date"].dropna().dt.year.unique())

    scoped = df[df["call_date"].dt.year == year] if year is not None else df

    months: list[str] = []
    if "call_date" in scoped.columns:
        months = sorted(scoped["call_date"].dropna().dt.strftime("%Y-%m").unique().tolist())
    states = sorted(scoped["state"].dropna().unique().tolist()) if "state" in scoped.columns else []
    return {"years": years, "states": states, "months": months}