import base64
import io
import logging
import os
import re

import pymysql

log = logging.getLogger(__name__)

_IDENT = re.compile(r"^[A-Za-z0-9_]+$")
MAX_SIDE = 1400


def _ident(name: str) -> str:
    if not _IDENT.match(name):
        raise ValueError(f"Unsafe SQL identifier in env config: {name!r}")
    return f"`{name}`"


def _to_data_uri(raw: bytes) -> str | None:
    """Downscale to JPEG so the PDF stays small."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        log.exception("Could not decode a ticket image")
        return None


def fetch_ticket_images(ticket_no: str, limit: int = 8) -> tuple[list[str], str | None]:
    table = os.getenv("PM_IMG_TABLE")
    ticket_col = os.getenv("PM_IMG_TICKET_COL")
    blob_col = os.getenv("PM_IMG_BLOB_COL")
    if not (table and ticket_col and blob_col):
        return [], "Image database is not configured."

    try:
        order_col = os.getenv("PM_IMG_ORDER_COL")
        sql = (
            f"SELECT {_ident(blob_col)} AS img FROM {_ident(table)} "
            f"WHERE {_ident(ticket_col)} IN (%s, %s)"
        )
        if order_col:
            sql += f" ORDER BY {_ident(order_col)}"
        sql += " LIMIT %s"

        raw_id = ticket_no.strip()
        alt_id = raw_id.replace("/", "_")

        conn = pymysql.connect(
            host=os.getenv("PM_IMG_DB_HOST", "localhost"),
            port=int(os.getenv("PM_IMG_DB_PORT", "3306")),
            user=os.getenv("PM_IMG_DB_USER", ""),
            password=os.getenv("PM_IMG_DB_PASSWORD", ""),
            database=os.getenv("PM_IMG_DB_NAME", ""),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5,
            read_timeout=15,
        )
        try:
            with conn.cursor() as cur:
                cur.execute(sql, (raw_id, alt_id, limit))
                rows = cur.fetchall()
        finally:
            conn.close()
    except Exception:
        log.exception("Image database lookup failed for ticket %s", ticket_no)
        return [], "Images could not be loaded right now."

    uris = []
    for r in rows:
        blob = r.get("img")
        if isinstance(blob, (bytes, bytearray)) and blob:
            uri = _to_data_uri(bytes(blob))
            if uri:
                uris.append(uri)
    return uris, (None if uris else "No images were uploaded for this ticket.")