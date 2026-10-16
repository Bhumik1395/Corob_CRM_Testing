import base64
import io
from calendar import month_name
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.domains.service_calls.pdf_service import _data_uri_only_fetcher

_env = Environment(
    loader=FileSystemLoader(Path(__file__).resolve().parent / "templates"),
    autoescape=select_autoescape(["html", "xml"]),
)

GREEN, RED = "#2FA84F", "#D32337"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _chart(done: list[int], dispute: list[int]) -> str:
    fig, ax = plt.subplots(figsize=(7.2, 2.8))
    x = range(12)
    w = 0.38
    b1 = ax.bar([i - w / 2 for i in x], done, w, color=GREEN, label="PM Done")
    b2 = ax.bar([i + w / 2 for i in x], dispute, w, color=RED, label="Dispute")
    for bars in (b1, b2):
        for b in bars:
            if b.get_height():
                ax.text(b.get_x() + b.get_width() / 2, b.get_height(), int(b.get_height()),
                        ha="center", va="bottom", fontsize=6)
    ax.set_xticks(list(x))
    ax.set_xticklabels(MONTHS, fontsize=7)
    ax.tick_params(axis="y", labelsize=7)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(fontsize=7, frameon=False, loc="upper right")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def build_report_pdf(company: str, year: int, month: int, sections: list[dict]) -> bytes:
    from weasyprint import HTML

    for s in sections:
        s["chart"] = _chart(s["done"], s["dispute"])

    html = _env.get_template("pm_report.html").render(
        company=company,
        period=f"{month_name[month]} {year}",
        year=year,
        sections=sections,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    )
    return HTML(string=html, url_fetcher=_data_uri_only_fetcher).write_pdf()