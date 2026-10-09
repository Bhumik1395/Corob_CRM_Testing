from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _data_uri_only_fetcher(url: str):
    """WeasyPrint calls this for every resource (images, @font-face, CSS
    url()...) it encounters. Refusing everything except data: URIs means a
    malicious/attacker-controlled string in the rendered HTML cannot cause
    an outbound request to internal services, cloud metadata endpoints, or
    anywhere else."""
    if not url.startswith("data:"):
        raise ValueError(f"Blocked non-data: URL during PDF rendering: {url[:80]}")
    from weasyprint.urls import default_url_fetcher
    return default_url_fetcher(url)


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
