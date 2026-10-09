from app.core.db import get_connection
from .outcome import norm, DONE, DISPUTE


def _log(cur, rule_id, action, old, new, user):
    cur.execute(
        "INSERT INTO pm_phrase_rule_log (rule_id, action, old_label, new_label, changed_by) VALUES (%s, %s, %s, %s, %s)",
        (rule_id, action, old, new, user))


def get_learned_rules():
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT phrase, label FROM pm_phrase_rules WHERE is_active = TRUE")
        rows = cur.fetchall()
    return sorted(((r["phrase"], r["label"]) for r in rows), key=lambda x: -len(x[0]))


def list_history(only_user=None):
    """All rules, newest change first. only_user -> just the rules that person has answered or changed."""
    sql = """SELECT r.id, r.phrase, r.label, r.answered_by, r.is_active, r.created_at, r.updated_at,
                    (SELECT COUNT(*) FROM pm_phrase_rule_log l WHERE l.rule_id = r.id) AS log_count
             FROM pm_phrase_rules r"""
    args = ()
    if only_user:
        sql += " WHERE EXISTS (SELECT 1 FROM pm_phrase_rule_log l WHERE l.rule_id = r.id AND l.changed_by = %s)"
        args = (only_user,)
    sql += " ORDER BY r.updated_at DESC"
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, args)
        return cur.fetchall()


def save_rule(phrase, label, user):
    phrase = norm(phrase)
    if len(phrase.split()) < 2 or label not in (DONE, DISPUTE):
        raise ValueError("invalid rule")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, label FROM pm_phrase_rules WHERE phrase = %s", (phrase,))
        row = cur.fetchone()
        if row is None:
            cur.execute("INSERT INTO pm_phrase_rules (phrase, label, answered_by) VALUES (%s, %s, %s)", (phrase, label, user))
            _log(cur, cur.lastrowid, "answered", None, label, user)
        else:
            cur.execute("UPDATE pm_phrase_rules SET label = %s, answered_by = %s, is_active = TRUE WHERE id = %s",
                        (label, user, row["id"]))
            _log(cur, row["id"], "answered", row["label"], label, user)


def set_label(rule_id, label, user):
    """Change an existing answer. Returns False if the rule does not exist."""
    if label not in (DONE, DISPUTE):
        raise ValueError("invalid label")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT label FROM pm_phrase_rules WHERE id = %s", (rule_id,))
        row = cur.fetchone()
        if row is None:
            return False
        if row["label"] != label:
            cur.execute("UPDATE pm_phrase_rules SET label = %s, answered_by = %s WHERE id = %s", (label, user, rule_id))
            _log(cur, rule_id, "changed", row["label"], label, user)
        return True


def set_active(rule_id, active, user):
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT label FROM pm_phrase_rules WHERE id = %s", (rule_id,))
        row = cur.fetchone()
        if row is None:
            return False
        cur.execute("UPDATE pm_phrase_rules SET is_active = %s WHERE id = %s", (bool(active), rule_id))
        _log(cur, rule_id, "restored" if active else "removed",
             None if active else row["label"], row["label"] if active else None, user)
        return True