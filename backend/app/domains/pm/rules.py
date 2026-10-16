import re
SUBJ = r"(?:pm2?|mmmp|ppm|p m|preventive|priventive|preventative|prevention|maintenance|maintanance|maintantance|maintanence)"
DONE = r"(?:done|dane|dome|dine|dn|completed|complete|finished|finish|successful|successfully|sucessful|sucessfully|performed|carried out)"
GAP = r"(?:\s+\w+){0,6}\s+"
NEGW = r"(?:not|nt|no|never|cannot|cant|unable)"
FAIL = r"(?:pending|cancel\w*|postponed|rescheduled|refused|denied|skipped|not allowed|not possible)"


PM_NEG = re.compile(
    rf"\b{SUBJ}\s+(?:work\s+|activity\s+|call\s+|visit\s+)?(?:is\s+|was\s+|has\s+been\s+|to\s+be\s+)?{NEGW}\s+(?:\w+\s+)?(?:{DONE}|possible|required|needed)\b"
    rf"|\b{SUBJ}\s+(?:{FAIL})\b|\b(?:refused|denied|cancel\w*|postponed|skipped)\s+(?:for\s+)?{SUBJ}\b"
    rf"|\b(?:not allowed|not able|unable)\s+(?:to\s+)?(?:do\s+)?{SUBJ}\b|\b{NEGW}\s+(?:\w+\s+)?{DONE}\s+{SUBJ}\b|\b{SUBJ}\s+{NEGW}\b(?!\s+(?:in\s+)?use)")

PM_DONE = re.compile(rf"\b{SUBJ}{GAP}{DONE}\b|\b{SUBJ}{DONE}\b|\b{DONE}{GAP}{SUBJ}\b|\b{DONE}{SUBJ}\b")

REASON = re.compile(
    r"\b(?:not|nt)\s+(?:in\s+)?(?:use|used|using)\b|\b(?:machine|mc|m c|dealer|delar)\b.{0,12}\bnot\b.{0,6}\b(?:available|present)\b"
    r"|\bshop\s+(?:is\s+)?(?:permanently\s+)?(?:closed|close|band)\b|\bgodown\b|\bgo down\b|\bshifted\b|\b(?:refused|denied|not allowed)\b|\bpending\b|\bpostponed\b")

def norm(x): return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9 ]"," ",str(x).lower())).strip()

def classify(x):
    t = norm(x)
    if PM_NEG.search(t) and not re.search(rf"\b{SUBJ}{GAP}{DONE}\b(?!.{{0,3}}$)", re.sub(PM_NEG, " ", t)): return "Dispute (explicit)"
    if PM_DONE.search(t): return "Done (explicit)"
    if REASON.search(t): return "Dispute (implicit)"
    return "Review"
