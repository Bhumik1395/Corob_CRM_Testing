import pandas as pd

UNASSIGNED = "Unassigned"
DETAIL_COLS = [
    "company", "dealer_code", "dealer_name", "master_model", "machine_no",
    "install_date", "ups_model", "ups_sn", "loc_up_rem", "zone", "state",
    "location", "eng_name", "supervisor",
]
SEARCH_COLS = ["dealer_code", "dealer_name", "machine_no", "ups_sn", "eng_name"]
TEXT_COLS = [
    "company", "dealer_code", "dealer_name", "master_model", "machine_no",
    "ups_model", "ups_sn", "loc_up_rem", "zone", "state", "location",
    "eng_code", "eng_name", "supervisor",
]
_BLANK_TEXT = {"nan": "", "None": "", "NaT": ""}


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    """Make every text column a clean string ("" = blank) so the filters,
    .str.contains search and JSON output can't trip over NaN or numbers."""
    d = df.copy()
    for c in TEXT_COLS:
        if c not in d.columns:
            d[c] = ""
        else:
            d[c] = d[c].fillna("").astype(str).str.strip().replace(_BLANK_TEXT)
    for c in ("eng_name", "supervisor"):
        d.loc[d[c] == "", c] = UNASSIGNED
    d["install_date"] = pd.to_datetime(d["install_date"], errors="coerce")
    return d


def _filter(df, company=None, zone=None, state=None, model=None, loc_up_rem=None,
            year=None, month=None, supervisor=None) -> pd.DataFrame:
    if company:
        df = df[df["company"] == company]
    if zone:
        df = df[df["zone"] == zone]
    if state:
        df = df[df["state"] == state]
    if model:
        df = df[df["master_model"] == model]
    if loc_up_rem:
        df = df[df["loc_up_rem"] == loc_up_rem]
    if supervisor:
        df = df[df["supervisor"] == supervisor]
    if year:
        df = df[df["install_date"].dt.year == year]
    if month:
        df = df[df["install_date"].dt.month == month]
    return df


def _count_by(df: pd.DataFrame, col: str, top: int | None = None) -> list[dict]:
    s = df[df[col] != ""].groupby(col).size().sort_values(ascending=False)
    if top:
        s = s.head(top)
    return [{"name": str(k), "count": int(v)} for k, v in s.items()]


def _mode(s: pd.Series) -> str:
    """Most common value, ignoring blanks and 'Unassigned'."""
    s = s[(s != "") & (s != UNASSIGNED)]
    return str(s.mode().iloc[0]) if not s.empty else ""


def _nunique_nonblank(s: pd.Series) -> int:
    return int(s[s != ""].nunique())


def _split(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    d["is_local"] = (d["loc_up_rem"] == "Local").astype(int)
    d["is_upcountry"] = (d["loc_up_rem"] == "Upcountry").astype(int)
    d["is_remote"] = (d["loc_up_rem"] == "Remote").astype(int)
    d["is_upcountry_remote"] = d["is_upcountry"] + d["is_remote"]
    return d


_SPLIT_AGG = dict(
    total=("machine_no", "size"),
    local=("is_local", "sum"),
    upcountry=("is_upcountry", "sum"),
    remote=("is_remote", "sum"),
)


def compute_installation_dashboard(
    df: pd.DataFrame,
    company=None, zone=None, state=None, model=None, loc_up_rem=None,
    year=None, month=None, supervisor=None, search=None,
    page: int = 1, page_size: int = 50,
) -> dict:
    f = _filter(_prepare(df), company, zone, state, model, loc_up_rem, year, month, supervisor)
    total = len(f)

    if total == 0:
        return {
            "kpis": {"totalInstallations": 0, "companies": 0, "dealers": 0, "engineers": 0,
                     "models": 0, "upsAttachPct": 0, "upcountryRemotePct": 0,
                     "unlinkedEngineerPct": 0},
            "monthlyTrend": [], "byCompany": [], "byModel": [], "locSplit": [],
            "upsModels": [], "zoneBreakdown": [], "topDealers": [], "engineers": [],
            "supervisors": [],
            "detailTable": {"rows": [], "page": page, "pageSize": page_size, "totalRows": 0},
        }

    d = _split(f)
    d["year_month"] = d["install_date"].dt.strftime("%Y-%m")
    d["install_day"] = d["install_date"].dt.normalize()

    named = d[d["eng_name"] != UNASSIGNED]
    has_ups = (d["ups_sn"] != "") | (d["ups_model"] != "")
    kpis = {
        "totalInstallations": total,
        "companies": _nunique_nonblank(d["company"]),
        "dealers": _nunique_nonblank(d["dealer_code"]),
        "engineers": int(named["eng_name"].nunique()),
        "models": _nunique_nonblank(d["master_model"]),
        "upsAttachPct": round(has_ups.mean() * 100, 1),
        "upcountryRemotePct": round(d["is_upcountry_remote"].mean() * 100, 1),
        # share of named-engineer rows we could not match to an engineer code
        "unlinkedEngineerPct": round((named["eng_code"] == "").mean() * 100, 1) if len(named) else 0,
    }

    monthly = (
        d.dropna(subset=["year_month"])
        .groupby("year_month").size().reset_index(name="count").sort_values("year_month")
    ).to_dict("records")

    loc_split = [
        {"name": k, "count": int(v)}
        for k, v in d["loc_up_rem"].replace("", "Unknown").value_counts().items()
    ]

    ups_series = d["ups_model"].where(d["ups_model"] != "", "No UPS recorded")
    ups_models = [{"name": k, "count": int(v)} for k, v in ups_series.value_counts().head(8).items()]

    # zone -> state
    state_g = d.groupby(["zone", "state"]).agg(**_SPLIT_AGG).reset_index()
    zone_g = d.groupby("zone").agg(**_SPLIT_AGG).reset_index().sort_values("total", ascending=False)
    zone_breakdown = []
    for _, z in zone_g.iterrows():
        states = state_g[state_g["zone"] == z["zone"]].sort_values("total", ascending=False)
        zone_breakdown.append({
            "zone": z["zone"] or "Unknown",
            "total": int(z["total"]), "local": int(z["local"]),
            "upcountry": int(z["upcountry"]), "remote": int(z["remote"]),
            "states": [
                {"state": r["state"] or "Unknown", "total": int(r["total"]),
                 "local": int(r["local"]), "upcountry": int(r["upcountry"]),
                 "remote": int(r["remote"])}
                for _, r in states.iterrows()
            ],
        })

    dealers = (
        d[d["dealer_code"] != ""]
        .groupby("dealer_code")
        .agg(dealer_name=("dealer_name", "first"), company=("company", "first"),
             state=("state", "first"), count=("machine_no", "size"))
        .reset_index().sort_values("count", ascending=False).head(10)
    ).to_dict("records")

    # One row per engineer NAME. The code is the most common non-blank one, so a
    # person whose code is missing on some rows is not listed twice.
    eng = (
        named.groupby("eng_name")
        .agg(
            eng_code=("eng_code", _mode),
            supervisor=("supervisor", _mode),
            installs=("machine_no", "size"),
            local=("is_local", "sum"),
            upcountry=("is_upcountry", "sum"),
            remote=("is_remote", "sum"),
            dealers=("dealer_code", _nunique_nonblank),
            days_active=("install_day", "nunique"),
        )
        .reset_index().sort_values("installs", ascending=False)
    )
    engineers = eng.to_dict("records")

    sup = (
        d[d["supervisor"] != UNASSIGNED]
        .groupby("supervisor")
        .agg(
            installs=("machine_no", "size"),
            engineers=("eng_name", lambda s: int(s[s != UNASSIGNED].nunique())),
            dealers=("dealer_code", _nunique_nonblank),
            upcountry_remote=("is_upcountry_remote", "sum"),
        )
        .reset_index().sort_values("installs", ascending=False)
    )
    supervisors = sup.to_dict("records")

    detail = f
    if search:
        q = search.strip()
        mask = pd.Series(False, index=detail.index)
        for c in SEARCH_COLS:
            mask |= detail[c].str.contains(q, case=False, na=False, regex=False)
        detail = detail[mask]
    detail = detail.sort_values("install_date", ascending=False)
    start = (page - 1) * page_size
    page_rows = detail[DETAIL_COLS].iloc[start:start + page_size].copy()
    page_rows["install_date"] = page_rows["install_date"].dt.strftime("%Y-%m-%d")
    page_rows = page_rows.fillna("")  # NaT/NaN would make the JSON response fail

    return {
        "kpis": kpis,
        "monthlyTrend": monthly,
        "byCompany": _count_by(d, "company", 10),
        "byModel": _count_by(d, "master_model", 10),
        "locSplit": loc_split,
        "upsModels": ups_models,
        "zoneBreakdown": zone_breakdown,
        "topDealers": dealers,
        "engineers": engineers,
        "supervisors": supervisors,
        "detailTable": {
            "rows": page_rows.to_dict("records"),
            "page": page, "pageSize": page_size, "totalRows": len(detail),
        },
    }


def compute_installation_filter_options(df: pd.DataFrame) -> dict:
    d = _prepare(df)

    def uniq(col):
        return sorted(v for v in d[col].unique().tolist() if v)

    return {
        "companies": uniq("company"),
        "zones": uniq("zone"),
        "states": uniq("state"),
        "models": uniq("master_model"),
        "locTypes": uniq("loc_up_rem"),
        "supervisors": [s for s in uniq("supervisor") if s != UNASSIGNED],
        "years": sorted(int(y) for y in d["install_date"].dt.year.dropna().unique()),
    }