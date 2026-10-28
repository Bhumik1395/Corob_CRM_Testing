import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)

LOG_PATH = Path(os.getenv(
    "PM_LABEL_LOG",
    Path(__file__).resolve().parents[3] / "data" / "pm_labels.jsonl",
))


def log_label(event: str, user: str, label: str | None, **fields) -> None:
    """Append one structured record per action. Never raises: a full disk
    must not break the review screen."""
    record = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "event": event,
        "user": user,
        "label": label,
        **{k: v for k, v in fields.items() if v is not None},
    }
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(record, ensure_ascii=False) + "\n"
        # O_APPEND keeps lines intact across the 2 uvicorn workers
        fd = os.open(LOG_PATH, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
        try:
            os.write(fd, line.encode("utf-8"))
        finally:
            os.close(fd)
    except Exception:
        log.exception("pm label log write failed")

