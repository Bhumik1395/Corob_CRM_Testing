import pytest
from fastapi import HTTPException

from app.shared import rate_limit_service as rl


@pytest.fixture
def db(monkeypatch):
    n, locked = {}, set()

    def record(key, max_attempts, window_s, lockout_s):
        n[key] = n.get(key, 0) + 1
        if n[key] >= max_attempts:
            locked.add(key)

    monkeypatch.setattr(rl, "_record_failure", record)
    monkeypatch.setattr(rl, "_is_locked", lambda key: 900 if key in locked else 0)
    monkeypatch.setattr(rl, "_clear", lambda key: (n.pop(key, None), locked.discard(key)))
    return n


def test_one_ip_cannot_lock_the_real_user_out(db):
    for _ in range(8):
        rl.record_account_failure("Victim@Corob.com", "6.6.6.6")
    with pytest.raises(HTTPException) as e:
        rl.enforce_account_not_locked("victim@corob.com", "6.6.6.6")
    assert e.value.status_code == 429
    rl.enforce_account_not_locked("victim@corob.com", "10.0.0.5")  # the real user, other IP: fine


def test_distributed_guessing_still_locks_the_account(db):
    for i in range(50):
        rl.record_account_failure("victim@corob.com", f"7.7.7.{i % 7}")
    with pytest.raises(HTTPException):
        rl.enforce_account_not_locked("victim@corob.com", "10.0.0.5")


def test_success_clears_both_counters(db):
    rl.record_account_failure("a@x.com", "1.1.1.1")
    rl.clear_account_failures("a@x.com", "1.1.1.1")
    assert db == {}


def test_key_fits_the_255_char_column():
    assert len(rl._account_key("x" * 400 + "@y.com", "2001:0db8:85a3:0000:0000:8a2e:0370:7334")) <= 255