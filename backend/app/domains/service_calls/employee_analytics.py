import pandas as pd
from app.shared.employee_mapping_service import load_employee_mapping


def compute_employees(df: pd.DataFrame, page: int = 1, page_size: int = 50, search: str = None) -> dict:
    mapping = load_employee_mapping()

    grouped = df.groupby("eng_code").agg(
        total_calls=("machine_no", "count"),
        under_norm_calls=("under_norm", "sum"),
        physical=("visit_type", lambda s: (s == "Physical").sum()),
        online=("visit_type", lambda s: (s == "Online").sum()),
        fallback_name=("employee_name", "first"),
    ).reset_index()

    grouped["employee_name"] = grouped["eng_code"].map(mapping).fillna(grouped["fallback_name"])
    grouped = grouped.drop(columns=["fallback_name"])

    grouped["under_norm_pct"] = (grouped["under_norm_calls"] / grouped["total_calls"] * 100).round(1)

    if search:
        q = search.strip().lower()
        mask = (
            grouped["eng_code"].str.lower().str.contains(q, na=False)
            | grouped["employee_name"].str.lower().str.contains(q, na=False)
        )
        grouped = grouped[mask]

    grouped = grouped.sort_values("total_calls", ascending=False)

    start = (page - 1) * page_size
    page_rows = grouped.iloc[start:start + page_size]

    return {
        "rows": page_rows.to_dict("records"),
        "page": page,
        "pageSize": page_size,
        "totalRows": len(grouped),
    }