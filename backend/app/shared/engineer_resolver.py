"""Link installation engineer NAMES to engineer codes using engineer_directory
(learned from Service / PM uploads). Never guesses: if a name could belong to
two codes it stays unlinked. A code that comes with the file is always kept."""
import re

import pandas as pd

from app.shared.employee_mapping_service import load_employee_mapping, load_supervisor_mapping


def _norm_name(n) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(n).lower()).strip()


def resolve_engineers(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    names = load_employee_mapping()
    supervisors = load_supervisor_mapping()

    by_name: dict[str, set[str]] = {}
    for code, name in names.items():
        by_name.setdefault(_norm_name(name), set()).add(code)
    unique = {n: next(iter(c)) for n, c in by_name.items() if n and len(c) == 1}

    missing = d["eng_code"] == ""
    d.loc[missing, "eng_code"] = d.loc[missing, "eng_name"].map(lambda n: unique.get(_norm_name(n), ""))

    known = d["eng_code"] != ""
    d.loc[known, "eng_name"] = d.loc[known, "eng_code"].map(names).fillna(d.loc[known, "eng_name"])

    no_sup = known & (d["supervisor"] == "")
    d.loc[no_sup, "supervisor"] = d.loc[no_sup, "eng_code"].map(supervisors).fillna("")
    return d