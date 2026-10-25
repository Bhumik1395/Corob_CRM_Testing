import hashlib
import hmac
import io
import os

import pandas as pd

_KEY = hashlib.sha256(b"corob-blob-v1:" + (os.getenv("DATA_SIGNING_KEY") or os.environ["JWT_SECRET"]).encode()).digest()


def _mac(raw: bytes) -> bytes:
    return hmac.new(_KEY, raw, hashlib.sha256).digest()


def dumps(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.to_pickle(buf, compression="gzip")
    raw = buf.getvalue()
    return _mac(raw) + raw


def loads(blob: bytes) -> pd.DataFrame:
    blob = bytes(blob)
    mac, raw = blob[:32], blob[32:]
    if not hmac.compare_digest(mac, _mac(raw)):
        raise ValueError("stored data failed its integrity check")
    return pd.read_pickle(io.BytesIO(raw), compression="gzip")