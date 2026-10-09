from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import io
import pandas as pd
from app.domains.service_calls.session_cache import get_session_data
from app.domains.service_calls.focus_analytics import compute_focus
from app.domains.service_calls.chart_render import render_bar_chart
from app.domains.service_calls.pdf_service import generate_pdf

router = APIRouter()


def _format_period(min_date, max_date) -> str:
    if pd.isna(min_date) or pd.isna(max_date):
        return "All Data"
    if min_date.strftime("%Y-%m") == max_date.strftime("%Y-%m"):
        return min_date.strftime("%B %Y")
    return f"{min_date.strftime('%b %Y')} - {max_date.strftime('%b %Y')}"


@router.post("/api/reports/pdf")
def create_report(request: Request, customer: str = None):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, {"error": "session_expired"})

    try:
        df = get_session_data(session_id)
    except KeyError:
        raise HTTPException(401, {"error": "session_expired"})

    filtered_df = df[df["customer"] == customer] if customer else df
    period_str = _format_period(filtered_df["call_date"].min(), filtered_df["call_date"].max())

    focus_data = compute_focus(df, customer=customer)

    state_breakdown = [
        state for region in focus_data["regionBreakdown"] for state in region["states"]
    ]

    charts = {
        "repeatMachines": render_bar_chart(focus_data["charts"]["repeatMachines"], "machine", "calls"),
    }

    report_title = f"Service Call Analytics Report — {customer}" if customer else "Service Call Analytics Report"

    pdf_bytes = generate_pdf(
        kpis=focus_data["kpis"],
        state_breakdown=state_breakdown,
        charts=charts,
        report_title=report_title,
        period_str=period_str,
    )

    filename = f"Service Call Report ({period_str}).pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
