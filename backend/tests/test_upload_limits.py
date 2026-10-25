import io
import zipfile
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core import upload_limits


def upload(data: bytes):
    return SimpleNamespace(filename="a.xlsx", file=io.BytesIO(data))


def zipped(size: int) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("big.xml", b"0" * size)
    return buf.getvalue()


def test_oversized_file_rejected(monkeypatch):
    monkeypatch.setattr(upload_limits, "MAX_FILE_BYTES", 100)
    with pytest.raises(HTTPException) as e:
        upload_limits.read_capped(upload(b"x" * 101))
    assert e.value.status_code == 413
    assert upload_limits.read_capped(upload(b"x" * 100)) == b"x" * 100


def test_zip_bomb_rejected_but_normal_zip_and_non_zip_pass(monkeypatch):
    monkeypatch.setattr(upload_limits, "MAX_UNZIPPED_BYTES", 1000)
    with pytest.raises(HTTPException) as e:
        upload_limits.read_capped(upload(zipped(5000)))
    assert e.value.status_code == 413
    ok = zipped(500)
    assert upload_limits.read_capped(upload(ok)) == ok
    assert upload_limits.read_capped(upload(b"not a zip")) == b"not a zip"