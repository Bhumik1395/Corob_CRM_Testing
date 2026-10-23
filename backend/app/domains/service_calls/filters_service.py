import pandas as pd


def compute_filter_options(df: pd.DataFrame) -> dict:
    years = (
        sorted(df["call_date"].dropna().dt.year.astype(int).astype(str).unique().tolist())
        if "call_date" in df.columns
        else []
    )

    service_types: list[str] = []
    has_blank = False
    if "service_type" in df.columns:
        st = df["service_type"].fillna("").astype(str).str.strip()
        st = st[st != "Gdata"]  # Gdata rows are always excluded from the dashboard
        service_types = sorted(v for v in st.unique().tolist() if v)
        has_blank = bool((st == "").any())

    return {
        "customers": sorted(df["customer"].dropna().unique().tolist()),
        "states": sorted(df["state"].dropna().unique().tolist()),
        "machines": sorted(df["machine_no"].dropna().unique().tolist()),
        "statuses": sorted(df["status"].dropna().unique().tolist()),
        "years": years,
        "serviceTypes": service_types,
        "hasBlankServiceType": has_blank,
    }