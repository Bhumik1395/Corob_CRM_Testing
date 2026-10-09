import pandas as pd


def compute_filter_options(df: pd.DataFrame) -> dict:
    return {
        "customers": sorted(df["customer"].dropna().unique().tolist()),
        "states": sorted(df["state"].dropna().unique().tolist()),
        "machines": sorted(df["machine_no"].dropna().unique().tolist()),
        "statuses": sorted(df["status"].dropna().unique().tolist()),
    }