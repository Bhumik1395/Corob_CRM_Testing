import base64
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ACCENT = "#0F6E56"
ACCENT_LIGHT = "#7DC9B0"
ACCENT_PALE = "#B7E4D8"


def _fig_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=110)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def render_pie_chart(data: list) -> str:
    labels = [d["name"] for d in data]
    values = [d["value"] for d in data]
    fig, ax = plt.subplots(figsize=(3.2, 2.6))
    colors = [ACCENT, ACCENT_LIGHT, ACCENT_PALE][: len(values)]
    ax.pie(values, labels=labels, autopct="%1.1f%%", colors=colors,
           wedgeprops={"width": 0.4}, textprops={"fontsize": 8})
    return _fig_to_base64(fig)


def render_bar_chart(data: list, x_key: str, y_key: str) -> str:
    labels = [str(d[x_key]) for d in data]
    values = [d[y_key] for d in data]
    fig, ax = plt.subplots(figsize=(3.6, 2.6))
    ax.bar(labels, values, color=ACCENT)
    ax.tick_params(axis="x", rotation=45, labelsize=6)
    ax.tick_params(axis="y", labelsize=7)
    fig.tight_layout()
    return _fig_to_base64(fig)


def render_line_chart(data: list, x_key: str, y_key: str) -> str:
    labels = [str(d[x_key]) for d in data]
    values = [d[y_key] for d in data]
    fig, ax = plt.subplots(figsize=(3.6, 2.6))
    ax.plot(labels, values, color=ACCENT, marker="o")
    ax.tick_params(axis="x", rotation=45, labelsize=6)
    ax.tick_params(axis="y", labelsize=7)
    fig.tight_layout()
    return _fig_to_base64(fig)