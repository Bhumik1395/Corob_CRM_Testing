from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd
from app.core.audit import audit
from app.core.auth import CurrentUser, require_roles
from app.core.upload_limits import read_capped
from app.core.rate_limit import rate_limit
from app.domains.pm.validation import validate_pm_excel, ValidationError
from app.domains.pm.excel_service import process_pm_dataframe
from app.domains.pm.cache import save_pm_data, delete_pm_data, delete_all_pm_data
from app.domains.pm.common import resolve_company, ALL_COMPANIES

router = APIRouter()
MAX_FILES = 10


@router.post("/api/pm/upload", dependencies=[Depends(rate_limit("upload", 10, 600))])
def upload_pm_data(
    files: list[UploadFile] = File(...),
    user: CurrentUser = Depends(require_roles("customer", "corob_employee")),
):
    if not files:
        raise HTTPException(400, {"error": "no_files", "message": "No files were uploaded."})
    if len(files) > MAX_FILES:
        raise HTTPException(400, {"error": "too_many_files", "message": f"Upload at most {MAX_FILES} files at a time."})

    parsed_frames: list[pd.DataFrame] = []
    per_file_results = []

    for f in files:
        if not f.filename.endswith(".xlsx"):
            raise HTTPException(400, {
                "error": "unsupported_format",
                "message": f"'{f.filename}' is not a .xlsx file.",
            })
        contents = read_capped(f)
        try:
            raw_df = validate_pm_excel(contents, f.filename)
        except ValidationError as e:
            raise HTTPException(400, {"error": e.reason, "message": e.detail})

        df = process_pm_dataframe(raw_df)

        if user.is_customer:
            before = len(df)
            df = df[df["company"].str.strip().str.lower() == user.company.strip().lower()]
            if len(df) == 0:
                raise HTTPException(400, {
                    "error": "no_matching_rows",
                    "message": f"'{f.filename}' has no rows for {user.company} (checked {before} rows).",
                })

        parsed_frames.append(df)
        per_file_results.append({"filename": f.filename, "row_count": len(df)})

    combined = pd.concat(parsed_frames, ignore_index=True)

    if user.is_customer:
        companies_touched = {user.company: combined}
    else:
        companies_touched = {
            company: group for company, group in combined.groupby("company") if company
        }

    saved = {company: save_pm_data(company, group) for company, group in companies_touched.items()}

    audit(user.username, "pm_upload", f"{len(files)} files, {sum(r['row_count'] for r in per_file_results)} rows")
    
    return {
        "files": per_file_results,
        "companies": [{"company": c, "total_rows_stored": n} for c, n in saved.items()],
    }


@router.delete("/api/pm/data")
def end_pm_session(
    company: str | None = None,
    user: CurrentUser = Depends(require_roles("customer", "corob_employee")),
):
    """Deletes stored PM data. Customers can only ever target their own company.
    Corob employees may pass ?company=__all__ to wipe every company."""
    if user.is_corob_employee and company == ALL_COMPANIES:
        count = delete_all_pm_data()
        audit(user.username, "pm_delete", ALL_COMPANIES)
        return {"company": ALL_COMPANIES, "deleted": count > 0}

    resolved_company = resolve_company(user, company)
    had_data = delete_pm_data(resolved_company)
    audit(user.username, "pm_delete", resolved_company)
    return {"company": resolved_company, "deleted": had_data}
