import csv
from pathlib import Path

_MAPPING_PATH = Path(__file__).resolve().parent.parent / "data" / "eng_code_supervisor_mapping.csv"

_name_cache: dict[str, str] | None = None
_supervisor_cache: dict[str, str] | None = None


def _load():
    global _name_cache, _supervisor_cache
    if _name_cache is None:
        name_map = {}
        supervisor_map = {}
        with open(_MAPPING_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row["eng_code"].strip()
                name_map[code] = row["employee_name"].strip()
                supervisor_map[code] = row["supervisor"].strip()
        _name_cache = name_map
        _supervisor_cache = supervisor_map
    return _name_cache, _supervisor_cache


def load_employee_mapping() -> dict[str, str]:
    names, _ = _load()
    return names


def load_supervisor_mapping() -> dict[str, str]:
    _, supervisors = _load()
    return supervisors