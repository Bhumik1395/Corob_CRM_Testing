import pandas as pd
from app.domains.pm.schema_contract import PM_COLUMN_MAP


def process_pm_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=PM_COLUMN_MAP)
    df.columns = [
        c.strip().lower().replace(" ", "_").replace(".", "").replace("/", "_")
        for c in df.columns
    ]

    df["call_date"] = pd.to_datetime(df["call_date"], errors="coerce")

    df["eng_code"] = df["eng_code"].astype(str).str.strip()
    df["ticket_no"] = df["ticket_no"].astype(str).str.strip()

    for col in [
        "company", "customer_name", "state", "region", "call_status",
        "employee_name", "loc_up_rem", "supervisor", "dealer_code",
        "dealer_name", "city", "remarks", "satisfaction_status", "feedback",
    ]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"nan": "", "None": ""})

    df["loc_up_rem"] = df["loc_up_rem"].str.title()

    df["call_status"] = df["call_status"].str.title()
    df["is_closed"] = df["call_status"].str.lower() == "closed"

    if "call_attended_date" in df.columns:
        df["call_attended_date"] = pd.to_datetime(df["call_attended_date"], errors="coerce")

    if "call_close_date" in df.columns:
        df["call_close_date"] = pd.to_datetime(df["call_close_date"], errors="coerce")
        closure_hours = (df["call_close_date"] - df["call_date"]).dt.total_seconds() / 3600
        df["closure_hours"] = closure_hours.where(closure_hours >= 0)

    if "satisfaction_status" in df.columns:
        df["satisfaction_status"] = df["satisfaction_status"].replace({"": "Not Recorded"})

    df = df.dropna(subset=["call_date", "company"])
    df = df[df["company"] != ""]

    return df


def dedupe_pm_rows(df: pd.DataFrame) -> pd.DataFrame:
    if "ticket_no" not in df.columns:
        return df
    return df.drop_duplicates(subset=["ticket_no"], keep="last")
