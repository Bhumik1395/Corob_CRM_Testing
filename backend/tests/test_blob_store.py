import gzip
import pickle

import pandas as pd
import pytest

from app.shared import blob_store

RAN = []


def _boom():
    RAN.append(1)


class Evil:
    def __reduce__(self):
        return (_boom, ())


def test_roundtrip_keeps_dtypes():
    df = pd.DataFrame({"d": pd.to_datetime(["2026-01-02"]), "b": [True], "s": ["x"]})
    out = blob_store.loads(blob_store.dumps(df))
    pd.testing.assert_frame_equal(df, out)


def test_forged_or_tampered_blob_is_never_unpickled():
    pickle.loads(pickle.dumps(Evil()))
    assert RAN == [1]; RAN.clear()  # control: this payload does execute
    evil = gzip.compress(pickle.dumps(Evil()))
    for blob in (evil, b"\0" * 32 + evil, blob_store.dumps(pd.DataFrame({"a": [1]}))[:-1] + b"x"):
        with pytest.raises(ValueError):
            blob_store.loads(blob)
    assert RAN == []