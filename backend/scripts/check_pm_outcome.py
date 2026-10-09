import argparse, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def report(df, learned, apply_outcomes):
    print(f"rows: {len(df)}")
    print(f"columns: {list(df.columns)}\n")
    if "remarks" not in df.columns:
        print("PROBLEM 1: there is no 'remarks' column in the stored data.")
        print("  The Excel header must be exactly 'Remarks/Solution Provided'. Check the file, then re-upload.")
        print("  (Until then the dashboard falls back to Call Status, which is why everything looks PM Done.)")
        return
    blank = (df["remarks"].fillna("").astype(str).str.strip() == "").sum()
    print(f"remarks: {len(df) - blank} filled, {blank} blank")
    if "call_status" in df.columns:
        print("\nCall Status (the OLD logic):"); print(df["call_status"].value_counts().to_string())
    out = apply_outcomes(df, learned)
    print("\nNEW logic (from remarks):"); print(out["pm_outcome"].value_counts().to_string())
    print(f"unresolved (counted as Dispute until answered): {(~out['pm_resolved']).sum()}")
    for label in ("PM Done", "Dispute"):
        sample = out[out["pm_outcome"] == label]["remarks"].astype(str).str.slice(0, 90).drop_duplicates().head(8)
        print(f"\nsample '{label}' remarks:"); [print("  -", x) for x in sample]
    if (out["pm_outcome"] == "Dispute").sum() == 0:
        print("\nPROBLEM 2: the rules found no Dispute at all. Read the PM Done samples above:")
        print("  if real disputes are in there, send me 10 of them and I will fix the rules.")
    else:
        print("\nThe rules work on this data. If the web page still shows everything as PM Done, the running")
        print("backend is not using them: restart it (sudo systemctl restart corob-backend) and check that")
        print("dashboard.py contains:  df = apply_outcomes(df, get_learned_rules())   (assigned back to df).")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--company"); ap.add_argument("--xlsx")
    a = ap.parse_args()
    from app.domains.pm.outcome import apply_outcomes
    from app.domains.pm.rules_store import get_learned_rules
    if a.xlsx:
        from app.domains.pm.validation import validate_pm_excel
        from app.domains.pm.excel_service import process_pm_dataframe
        df = process_pm_dataframe(validate_pm_excel(Path(a.xlsx).read_bytes(), a.xlsx))
    elif a.company:
        from app.domains.pm.cache import get_pm_data
        df = get_pm_data(a.company)
        if df is None: sys.exit("no PM data stored for that company")
    else:
        sys.exit("pass --company or --xlsx")
    report(df, get_learned_rules(), apply_outcomes)