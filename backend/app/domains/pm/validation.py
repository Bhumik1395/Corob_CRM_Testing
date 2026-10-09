import io
import pandas as pd
from app.domains.pm.schema_contract import PM_SCHEMA_CONTRACT


class ValidationError(Exception):
    def __init__(self, reason: str, detail: str):
        self.reason = reason
        self.detail = detail


def validate_pm_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    try:
        df = pd.read_excel(
            io.BytesIO(file_bytes),
            sheet_name=PM_SCHEMA_CONTRACT["sheet_name"],
            engine="openpyxl",
            engine_kwargs={"read_only": True},
        )
    except ValueError:
        raise ValidationError(
            "invalid_sheet",
            f"'{filename}': expected sheet '{PM_SCHEMA_CONTRACT['sheet_name']}' not found.",
        )
    except Exception:
        raise ValidationError(
            "unreadable_file",
            f"'{filename}' could not be read. Please make sure it's a valid .xlsx file.",
        )

    missing = [c for c in PM_SCHEMA_CONTRACT["required_columns"] if c not in df.columns]
    if missing:
        raise ValidationError(
            "missing_column",
            f"'{filename}' is missing required column(s): {', '.join(missing)}",
        )

    if len(df) == 0:
        raise ValidationError("empty_file", f"'{filename}' has no data rows.")

    if len(df) > PM_SCHEMA_CONTRACT["max_rows"]:
        raise ValidationError(
            "too_many_rows",
            f"'{filename}' exceeds {PM_SCHEMA_CONTRACT['max_rows']} rows.",
        )

    return df
