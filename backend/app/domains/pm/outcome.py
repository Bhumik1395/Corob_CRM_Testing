import re
from collections import Counter
import pandas as pd

from .rules import classify as _tier, norm

DONE, DISPUTE = "PM Done", "Dispute"
FILLER = {"the","is","are","was","were","and","of","in","to","at","by","on","for","with","a","an","it",
          "this","that","has","have","been","be","as","so","or","sir","all","also","then","from"}


def _match_learned(t, learned):
    """learned = [(phrase, label)] sorted longest first."""
    padded = f" {t} "
    hits = [(len(p), l) for p, l in learned if f" {p} " in padded]
    if not hits: return None
    top = max(h[0] for h in hits)
    labels = {l for n, l in hits if n == top}
    return DISPUTE if DISPUTE in labels else DONE


def label_text(text, learned):
    """-> (label or None, source)."""
    t = norm(text)
    tier = _tier(t)
    if tier == "Done (explicit)": return DONE, "rule"
    if tier == "Dispute (explicit)": return DISPUTE, "rule"
    hit = _match_learned(t, learned)
    if hit: return hit, "learned"
    if tier == "Dispute (implicit)": return DISPUTE, "rule"
    return None, "unresolved"


def apply_outcomes(df, learned):
    """Adds pm_outcome / pm_resolved and makes is_closed mean 'PM Done' so the existing dashboard maths still works."""
    if "remarks" not in df.columns:
        return df                                   # no remarks column: keep the old Call Status logic
    df = df.copy()
    uniq = {x: label_text(x, learned) for x in df["remarks"].fillna("").astype(str).unique()}
    res = df["remarks"].fillna("").astype(str).map(uniq)
    df["pm_resolved"] = res.map(lambda r: r[0] is not None)
    df["pm_outcome"] = res.map(lambda r: r[0] or DISPUTE)
    df["is_closed"] = df["pm_outcome"] == DONE
    return df


def next_question(df, learned, skip=(), min_rows=5, max_words=4):
    """The unresolved phrase that, once answered, settles the most rows."""
    remarks = df["remarks"].fillna("").astype(str) if "remarks" in df.columns else pd.Series([], dtype=str)
    counts = Counter(remarks)
    unresolved = {x: n for x, n in counts.items() if label_text(x, learned)[0] is None}
    total_unres = sum(unresolved.values())
    if not unresolved:
        return {"done": True, "unresolvedRows": 0, "totalRows": int(len(df))}

    skip, known = set(skip), {p for p, _ in learned}
    cover = Counter()
    for text, n in unresolved.items():
        toks = norm(text).split()
        seen = set()
        for size in range(2, max_words + 1):
            for i in range(len(toks) - size + 1):
                g = toks[i:i + size]
                if any(len(w) < 2 for w in g): continue          # skip fragments like 'm c', 'g data'
                if all(w in FILLER for w in g): continue
                if g[0] in FILLER or g[-1] in FILLER: continue
                seen.add(" ".join(g))
        for g in seen: cover[g] += n
    cands = [(n, len(g.split()), g) for g, n in cover.items() if n >= min_rows and g not in skip and g not in known]
    if not cands:
        return {"done": True, "unresolvedRows": int(total_unres), "totalRows": int(len(df)), "note": "no frequent phrase left"}
    n, _, phrase = max(cands)
    ex = sorted((x for x in unresolved if f" {phrase} " in f" {norm(x)} "), key=lambda x: -unresolved[x])[:3]
    return {"done": False, "phrase": phrase, "rowsAffected": int(n),
            "examples": [e[:160] for e in ex], "unresolvedRows": int(total_unres), "totalRows": int(len(df))}


def count_matches(df, phrases):
    """For each phrase: how many rows it actually decides (rows the explicit rules have not already settled)."""
    if "remarks" not in df.columns or not phrases:
        return {p: 0 for p in phrases}
    counts = Counter(norm(x) for x in df["remarks"].fillna("").astype(str))
    open_rows = [(f" {t} ", n) for t, n in counts.items() if _tier(t) not in ("Done (explicit)", "Dispute (explicit)")]
    return {p: sum(n for t, n in open_rows if f" {p} " in t) for p in phrases}