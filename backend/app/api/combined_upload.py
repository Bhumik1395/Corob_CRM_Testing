import io
import logging

import openpyxl
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from app.core.audit import audit
from app.core.auth import CurrentUser, require_roles
from app.core.config import SESSION_TTL_SECONDS
from app.core.upload_limits import read_capped
from app.core.rate_limit import rate_limit
from app.domains.installation.cache import relink_installation_engineers, save_installation_data
from app.domains.installation.excel_service import (
    ValidationError as InstallValidationError,
    describe_sheets,
    find_installation_sheet,
    load_installation_excel,
    process_installation_dataframe,
)
from app.domains.pm.cache import save_pm_data
from app.domains.pm.excel_service import process_pm_dataframe
from app.domains.pm.schema_contract import PM_SCHEMA_CONTRACT
from app.domains.pm.validation import ValidationError as PmValidationError
from app.domains.pm.validation import validate_pm_excel
from app.domains.service_calls.excel_service import process_dataframe
from app.domains.service_calls.schema_contract import SCHEMA_CONTRACT
from app.domains.service_calls.session_cache import create_session
from app.domains.service_calls.validation import ValidationError as ServiceValidationError
from app.domains.service_calls.validation import validate_excel
from app.shared.engineer_resolver import resolve_engineers
from app.shared.employee_mapping_service import learn_from_frame

router = APIRouter()
log = logging.getLogger(__name__)

MAX_FILES = 10


def _sheet_names(file_bytes: bytes) -> set[str]:
    workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True)
    try:
        return set(workbook.sheetnames)
    finally:
        workbook.close()


@router.post("/api/upload/combined", dependencies=[Depends(rate_limit("upload", 10, 600))])
def upload_combined(
    request: Request,
    response: Response,
    files: list[UploadFile] = File(...),
    user: CurrentUser = Depends(require_roles("corob_employee")),
):
    if not files:
        raise HTTPException(400, {"error": "no_files", "message": "No files were uploaded."})
    if len(files) > MAX_FILES:
        raise HTTPException(400, {
            "error": "too_many_files",
            "message": f"Upload at most {MAX_FILES} files at a time.",
        })

    service_frames: list[pd.DataFrame] = []
    service_file_results = []

    pm_frames: list[pd.DataFrame] = []
    pm_file_results = []

    install_frames: list[pd.DataFrame] = []
    install_file_results = []

    unrecognized: list[str] = []

    for f in files:
        if not f.filename.endswith(".xlsx"):
            raise HTTPException(400, {
                "error": "unsupported_format",
                "message": f"The uploaded file '{f.filename}' is not supported. "
                           f"Please upload a valid .xlsx file.",
            })

        contents = read_capped(f)

        try:
            sheets = _sheet_names(contents)
        except Exception:
            raise HTTPException(400, {
                "error": "unreadable_file",
                "message": f"'{f.filename}' could not be read. Please make sure it's a valid .xlsx file.",
            })

        if SCHEMA_CONTRACT["sheet_name"] in sheets:
            try:
                df = validate_excel(contents)
            except ServiceValidationError as e:
                raise HTTPException(400, {"error": e.reason, "message": f"'{f.filename}': {e.detail}"})
            df = process_dataframe(df)
            service_frames.append(df)
            service_file_results.append({"filename": f.filename, "row_count": len(df)})

        elif PM_SCHEMA_CONTRACT["sheet_name"] in sheets:
            try:
                df = validate_pm_excel(contents, f.filename)
            except PmValidationError as e:
                raise HTTPException(400, {"error": e.reason, "message": e.detail})
            df = process_pm_dataframe(df)
            pm_frames.append(df)
            pm_file_results.append({"filename": f.filename, "row_count": len(df)})

        # Installation files are recognised by their column headers, not the sheet name.
        elif (found := find_installation_sheet(contents)) is not None:
            try:
                raw = load_installation_excel(contents, f.filename, found)
            except InstallValidationError as e:
                raise HTTPException(400, {"error": e.reason, "message": e.detail})
            df = process_installation_dataframe(raw)
            if df.empty:
                raise HTTPException(400, {
                    "error": "no_valid_rows",
                    "message": f"'{f.filename}' has no rows with both a machine number and a valid installation date.",
                })
            install_frames.append(df)
            install_file_results.append({"filename": f.filename, "row_count": len(df)})

        else:
            unrecognized.append(f"{f.filename} ({describe_sheets(contents)})")

    if unrecognized:
        raise HTTPException(400, {
            "error": "unrecognized_sheet",
            "message": (
                f"Couldn't tell what kind of data this is for: {'; '.join(unrecognized)}. "
                f"Expected a sheet named '{SCHEMA_CONTRACT['sheet_name']}' (Service Calls), "
                f"'{PM_SCHEMA_CONTRACT['sheet_name']}' (PM), or an Installation sheet with "
                f"'Machine No.' and 'Installation Date' columns."
            ),
        })

    # Every file validated: only now teach the engineer directory, so a
    # rejected upload never writes anything.
    for frame in service_frames + pm_frames:
        learn_from_frame(frame)

    result: dict = {"serviceCalls": None, "pm": None, "installation": None}

    if service_frames:
        combined_service = pd.concat(service_frames, ignore_index=True)
        session_id = create_session(
            combined_service,
            user.sub,
            old_session_id=request.cookies.get("session_id"),
        )
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=SESSION_TTL_SECONDS,
        )
        result["serviceCalls"] = {
            "session_id": session_id,
            "row_count": len(combined_service),
            "files": service_file_results,
        }

    if pm_frames:
        combined_pm = pd.concat(pm_frames, ignore_index=True)
        companies_touched = {
            company: group for company, group in combined_pm.groupby("company") if company
        }
        saved = {company: save_pm_data(company, group) for company, group in companies_touched.items()}
        result["pm"] = {
            "files": pm_file_results,
            "companies": [{"company": c, "total_rows_stored": n} for c, n in saved.items()],
        }

    if install_frames:
        combined_install = resolve_engineers(pd.concat(install_frames, ignore_index=True))
        result["installation"] = {
            "files": install_file_results,
            "row_count": len(combined_install),
            "total_rows_stored": save_installation_data(combined_install),
        }

    if service_frames or pm_frames:
        try:
            relink_installation_engineers()
        except Exception:
            log.exception("Could not re-link installation engineers")

    audit(user.username, "combined_upload", f"{len(files)} files")
    return result