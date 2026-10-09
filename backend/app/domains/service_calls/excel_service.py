import pandas as pd
from app.domains.service_calls.schema_contract import COLUMN_MAP


def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=COLUMN_MAP)
    df.columns = [
        c.strip().lower().replace(" ", "_").replace(".", "").replace("/", "_")
        for c in df.columns
    ]

    df["call_date"] = pd.to_datetime(df["call_date"], errors="coerce")

    df["eng_code"] = df["eng_code"].astype(str).str.strip()

    for col in [
        "customer", "state", "region", "status", "employee_name",
        "loc_up_rem", "supervisor", "dealer_code", "dealer_name", "city", "remarks",
    ]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": "", "None": ""})

    if "call_attended_date" in df.columns:
        df["call_attended_date"] = pd.to_datetime(df["call_attended_date"], errors="coerce")
        df["visit_type"] = df["call_attended_date"].notna().map({True: "Physical", False: "Online"})
    else:
        df["visit_type"] = "Unknown"

    if "service_type" in df.columns:
        df["service_type"] = df["service_type"].astype(str).str.strip().str.title()
        df["service_type"] = df["service_type"].replace({"Nan": "", "None": ""})
    else:
        df["service_type"] = ""

    df["under_norm"] = df["status"] == "Undernorm"

    df["loc_up_rem"] = df["loc_up_rem"].str.title()

    if "call_attended_date" in df.columns:
        time_to_attend = (df["call_attended_date"] - df["call_date"]).dt.total_seconds() / 3600
        df["time_to_attend_hours"] = time_to_attend.where(time_to_attend >= 0)

    if "call_close_date" in df.columns:
        df["call_close_date"] = pd.to_datetime(df["call_close_date"], errors="coerce")
        time_to_resolve = (df["call_close_date"] - df["call_date"]).dt.total_seconds() / 3600
        df["time_to_resolve_hours"] = time_to_resolve.where(time_to_resolve >= 0)

    df = df.dropna(subset=["call_date", "machine_no"])
    return df
