from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import io
import pandas as pd
from app.core.rate_limit import rate_limit
from app.domains.service_calls.session_auth import get_authorized_session_df
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


@router.post("/api/reports/pdf", dependencies=[Depends(rate_limit("pdf", 20, 60))])
def create_report(customer: str = None, df: pd.DataFrame = Depends(get_authorized_session_df)):
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