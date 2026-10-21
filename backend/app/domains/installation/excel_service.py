import io
import re

import openpyxl
import pandas as pd

from app.domains.installation.schema_contract import (
    HEADER_SCAN_ROWS, MAX_ROWS, OUTPUT_COLUMNS, REQUIRED_FIELDS, map_headers,
)


class ValidationError(Exception):
    def __init__(self, reason: str, detail: str):
        self.reason = reason
        self.detail = detail


def _scan(contents: bytes) -> list[tuple[str, int, list]]:
    wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True)
    out = []
    try:
        for ws in wb.worksheets:
            rows = ws.iter_rows(min_row=1, max_row=HEADER_SCAN_ROWS, values_only=True)
            for idx, row in enumerate(rows):
                out.append((ws.title, idx, list(row)))
    finally:
        wb.close()
    return out


def find_installation_sheet(contents: bytes):
    """(sheet name, header row index) of the first sheet that has the required
    installation columns, or None."""
    for sheet, idx, row in _scan(contents):
        mapping = map_headers(row)
        if all(f in mapping for f in REQUIRED_FIELDS):
            return sheet, idx
    return None


def describe_sheets(contents: bytes) -> str:
    """Short 'Sheet X: header, header...' text to show in 'unrecognized' errors."""
    try:
        parts = []
        for sheet, idx, row in _scan(contents):
            if idx == 0:
                heads = [str(h) for h in row if h not in (None, "")][:25]
                parts.append(f"sheet '{sheet}' has columns: {', '.join(heads) or '(empty)'}")
        return "; ".join(parts)
    except Exception:
        return ""


def load_installation_excel(contents: bytes, filename: str, found) -> pd.DataFrame:
    sheet, header_idx = found
    try:
        df = pd.read_excel(
            io.BytesIO(contents), sheet_name=sheet, header=header_idx,
            engine="openpyxl", engine_kwargs={"read_only": True}, dtype=object,
        )
    except Exception:
        raise ValidationError("unreadable_file", f"'{filename}' could not be read. Please make sure it's a valid .xlsx file.")
    if len(df) == 0:
        raise ValidationError("empty_file", f"'{filename}' has no data rows.")
    if len(df) > MAX_ROWS:
        raise ValidationError("too_many_rows", f"'{filename}' exceeds {MAX_ROWS} rows.")
    return df


_ID_COLS = ("machine_no", "ups_sn", "eng_code", "dealer_code")


def _loc(v: str) -> str:
    t = v.strip().lower()
    if t.startswith("loc"):
        return "Local"
    if t.startswith("up"):
        return "Upcountry"
    if t.startswith("rem"):
        return "Remote"
    return v.strip().title()


def process_installation_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    mapping = map_headers(list(df.columns))
    out = pd.DataFrame(index=df.index)
    for field in OUTPUT_COLUMNS:
        out[field] = df[mapping[field]] if field in mapping else ""

    for c in OUTPUT_COLUMNS:
        if c == "install_date":
            continue
        out[c] = out[c].fillna("").astype(str).str.strip().replace({"nan": "", "None": "", "NaT": ""})
    for c in _ID_COLS:  # Excel numbers arrive as "123.0"
        out[c] = out[c].str.replace(r"^(\d+)\.0$", r"\1", regex=True)

    out["loc_up_rem"] = out["loc_up_rem"].map(_loc)
    out["install_date"] = pd.to_datetime(out["install_date"], errors="coerce")

    out = out.dropna(subset=["install_date"])
    out = out[out["machine_no"] != ""]
    return out.reset_index(drop=True)