import os
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret")

from unittest.mock import MagicMock, patch

import pytest


def fake_db(row):
    conn = MagicMock()
    conn.__enter__.return_value = conn
    conn.cursor.return_value.__enter__.return_value.fetchone.return_value = row
    return patch("app.core.auth.get_connection", return_value=conn)


@pytest.fixture(autouse=True)
def active_user():
    with fake_db({"is_active": 1}):
        yield