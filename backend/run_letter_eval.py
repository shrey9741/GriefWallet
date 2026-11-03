"""Letter-quality eval for GriefWallet.

Generates claim letters with the real model across relationships and PAN states and checks
each one automatically. Run from the backend folder (needs GROQ_API_KEY in .env):

    python run_letter_eval.py              # 1 run per case
    python run_letter_eval.py --runs 3     # repeat for a pass rate
    python run_letter_eval.py --selftest   # check the checkers themselves, no API calls
"""
import argparse
import difflib
import json
import os
import re
import sys

from dotenv import load_dotenv

load_dotenv()

from prompts import nominee_intro
from agents.doc_generator import DOCUMENT_TYPE_MAP, generate_letter, kinship_violations

BASE = {
    "deceased_name": "Abhishek Saha",
    "date_of_death": "2019-12-14",
    "phone": None,
    "multiple_nominees": False,
    "will_exists": False,
    "will_disputed": False,
    "nominee_name": "Arun Saha",
}

CASES = []
for rel in ["spouse", "son", "daughter", "parent", "sibling", "other"]:
    for pan in (True, False):
        for inst in ("SBI", "LIC"):
            CASES.append({
                "id": f"{inst}-{rel}-pan{'Y' if pan else 'N'}",
                "inst": inst,
                "input": {**BASE, "nominee_relation": rel, "pan_available": pan,
                          "institutions": [inst], "docs_available": ["death_certificate"]},
            })

DAYS_RE = re.compile(r"(\d+)\s*[-‐-―]\s*(\d+)\s*(?:working\s+|business\s+)?days|\b(\d+)\s*(?:working|business)\s+days", re.I)


def pan_offending_lines(ci: dict, text: str) -> list:
    """Lines claiming a PAN copy/card OF THE DECEASED is enclosed, when the PAN is missing.

    Not flagged: the nominee's/claimant's own PAN, [PLACEHOLDER] lines, and honest statements
    that the PAN is unavailable or will be provided later."""
    if ci["pan_available"]:
        return []
    out = []
    for line in text.splitlines():
        low = line.lower()
        words = re.findall(r"[a-z]+", low)
        if "pan" not in words or not ("copy" in low or "card" in low):
            continue
        if "[" in line:
            continue
        if re.search(r"nominee|claimant|applicant|my own|\bmy\b|\bI\b", line):
            continue
        if re.search(r"\bnot\b|unavailable|\bwill\b|once|to be (?:provided|submitted|added|furnished)|shall|awaiting|yet to|pending|being obtained|applied", low):
            continue
        out.append(line.strip())
    return out


NAME_WORD = re.compile(r"\b[A-Z][a-z][A-Za-z'-]{3,}\b")


def misspelled_names(ci: dict, text: str) -> list:
    """Capitalised words that are close to, but not exactly, a word of the real names."""
    wanted = {w for n in (ci["deceased_name"], ci["nominee_name"]) for w in re.findall(r"[A-Za-z][A-Za-z'-]{4,}", n)}
    low = {w.lower() for w in wanted}
    bad = []
    for m in NAME_WORD.finditer(text):
        w = m.group(0)
        if w.lower() in low:
            continue
        if any(difflib.SequenceMatcher(None, w.lower(), x.lower()).ratio() >= 0.86 for x in wanted):
            bad.append(w)
    return bad


def intro_context(text: str) -> str:
    """The line that introduces the nominee, for debugging a failed intro check."""
    for line in text.splitlines():
        if re.search(r"\bI,\s", line):
            return line.strip()[:200]
    return "(no line starting 'I, ...' found)"


def check_letter(ci: dict, text: str, knowledge: dict) -> dict:
    """Return {check_name: bool}. True means the letter passed that check."""
    rel = ci["nominee_relation"]
    kb = json.dumps(knowledge)
    intro = nominee_intro(ci["nominee_name"], rel, ci["deceased_name"])

    unsourced = False
    for m in DAYS_RE.finditer(text):
        nums = [g for g in m.groups() if g]
        if any(n not in kb for n in nums):
            unsourced = True

    pan_ok = not pan_offending_lines(ci, text)

    return {
        "correct_intro": intro.lower() in text.lower(),
        "no_kinship_slip": not kinship_violations(text, rel),
        "no_unsourced_timeline": not unsourced,
        "pan_not_claimed_when_missing": pan_ok,
        "names_spelled_correctly": not misspelled_names(ci, text),
        "no_PLACEHOLDER_prefix": "PLACEHOLDER" not in text,
        "starts_with_To": text.lstrip().startswith("To"),
    }


def selftest() -> int:
    ci = {**BASE, "nominee_relation": "parent", "pan_available": False}
    good = ("To,\nThe Manager\n\nI, Arun Saha, parent of the late Abhishek Saha, request closure.\n"
            "Enclosures:\n- Death certificate\n- [PAN_COPY_OF_DECEASED - to be added]")
    bad = ("To,\nThe Manager\n\nI, Arun Saha, son of the late Abhishek Saha. My father passed away.\n"
           "Process within 15‑20 working days.\nEnclosures:\n- PAN card copy of the deceased")
    g, b = check_letter(ci, good, {}), check_letter(ci, bad, {})
    assert all(g.values()), g
    assert not b["correct_intro"] and not b["no_kinship_slip"]
    assert not b["no_unsourced_timeline"] and not b["pan_not_claimed_when_missing"], b
    ok_days = check_letter(ci, good + "\nWithin 15-20 days.", {"timeline": "15-20 days"})
    assert ok_days["no_unsourced_timeline"]
    nom = check_letter(ci, good + "\n- PAN card of nominee (1 copy)\nAs the PAN card of the deceased is not presently available, it will follow.", {})
    assert nom["pan_not_claimed_when_missing"], "nominee PAN / honest wording must pass"
    typo = check_letter(ci, good.replace("Abhishek", "Abhashek"), {})
    assert not typo["names_spelled_correctly"] and not typo["correct_intro"]
    print("selftest passed: checkers accept a good letter and catch all four known defects")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=1)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--save", default="letter_eval_results.json")  # includes failing letters; keep out of git
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not os.getenv("GROQ_API_KEY"):
        print("ERROR: GROQ_API_KEY not set in .env")
        return 1
    from agents.classifier import load_knowledge

    totals, fails, errors, n = {}, [], 0, 0
    for case in CASES:
        ci, inst = case["input"], case["inst"]
        task = {"institution": inst, "title": f"{inst} claim", "priority": "high", "status": "pending"}
        knowledge = load_knowledge(inst)
        for run in range(a.runs):
            n += 1
            try:
                doc = generate_letter(ci, task, knowledge, DOCUMENT_TYPE_MAP[inst])
            except Exception as e:
                errors += 1
                print(f"  ERROR {case['id']}: {e}")
                continue
            res = check_letter(ci, doc["content"], knowledge)
            for k, v in res.items():
                totals[k] = totals.get(k, 0) + int(v)
            bad = [k for k, v in res.items() if not v]
            print(f"  {'OK  ' if not bad else 'FAIL'} {case['id']} run {run + 1}" + (f"  -> {bad}" if bad else ""))
            if bad:
                detail = {}
                if "pan_not_claimed_when_missing" in bad:
                    detail["pan_lines"] = pan_offending_lines(ci, doc["content"])
                    for l in detail["pan_lines"][:2]:
                        print(f"        PAN line: {l[:110]}")
                if "correct_intro" in bad:
                    detail["intro_line"] = intro_context(doc["content"])
                    print(f"        intro:    {detail['intro_line'][:110]}")
                fails.append({"case": case["id"], "run": run + 1, "failed": bad, **detail,
                              "letter": doc["content"]})

    done = n - errors
    print("\n" + "=" * 56)
    for k, v in totals.items():
        print(f"  {k:32} {v}/{done}")
    clean = done - len(fails)
    print(f"  letters passing ALL checks      {clean}/{done}   ({errors} errors)")
    print("=" * 56)
    json.dump({"letters": done, "errors": errors, "per_check": totals, "failures": fails},
              open(a.save, "w"), indent=2)
    print(f"  saved {a.save}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
