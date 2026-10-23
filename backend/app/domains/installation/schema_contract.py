import re

HEADER_SCAN_ROWS = 15
MAX_ROWS = 200_000

REQUIRED_FIELDS = ["machine_no", "install_date"]

OUTPUT_COLUMNS = [
    "company", "dealer_code", "dealer_name", "model", "master_model",
    "machine_no", "install_date", "mc_status", "ups_model", "ups_sn",
    "loc_up_rem", "region", "zone", "state", "location",
    "eng_code", "eng_name", "supervisor",
]

HEADER_ALIASES = {
    "company":      ["master customer", "company", "customer name", "customer"],
    "dealer_code":  ["dealer code"],
    "dealer_name":  ["dealer name"],
    "model":        ["model", "machine model", "machine make model"],
    "master_model": ["master model"],
    "machine_no":   ["machine no", "machine s n", "machine sn",
                     "machine serial no", "machine serial number"],
    "install_date": ["installation date", "install date", "date of installation"],
    "mc_status":    ["mc status", "machine status"],
    "ups_model":    ["ups model"],
    "ups_sn":       ["ups s n", "ups sn", "ups serial no", "ups serial number"],
    "loc_up_rem":   ["loc up rem"],
    "region":       ["region"],
    "zone":         ["zone"],
    "state":        ["state", "zm state"],
    "location":     ["city location", "location", "city"],
    "eng_code":     ["eng code", "engineer code"],
    "eng_name":     ["eng name", "engineer name"],
    "supervisor":   ["name of supervisor", "supervisor"],
}


def _norm(s) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def map_headers(headers) -> dict:
    normed = {}
    for h in headers:
        if h is None:
            continue
        n = _norm(h)
        if n and n not in normed:
            normed[n] = h
    found = {}
    for field, aliases in HEADER_ALIASES.items():
        for a in aliases:
            if a in normed:
                found[field] = normed[a]
                break
    return found