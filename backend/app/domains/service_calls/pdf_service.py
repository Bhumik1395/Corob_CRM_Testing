from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


from weasyprint.urls import URLFetcher
_data_uri_only_fetcher = URLFetcher(allowed_protocols={"data"})

def generate_pdf(kpis: dict, state_breakdown: list, charts: dict, report_title: str, period_str: str) -> bytes:
    from weasyprint import HTML
    template = env.get_template("report_template.html")
    html_content = template.render(
        kpis=kpis,
        state_breakdown=state_breakdown,
        charts=charts,
        report_title=report_title,
        period_str=period_str,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    )
    return HTML(string=html_content, url_fetcher=_data_uri_only_fetcher).write_pdf()
