import argparse
import json
import os
import sys
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    print("ERROR: GROQ_API_KEY not set in .env file")
    sys.exit(1)

from graph import run_case


SCENARIOS = {

    "a": {
        "name": "Scenario A — Sharma family (clean case)",
        "input": {
            "deceased_name": "Ramesh Sharma",
            "date_of_death": "2025-01-12",
            "pan_available": True,
            "phone": None,
            "institutions": ["SBI", "LIC"],
            "nominee_name": "Sunita Sharma",
            "nominee_relation": "spouse",
            "multiple_nominees": False,
            "will_exists": False,
            "will_disputed": False,
            "docs_available": ["death_certificate", "aadhaar", "pan"],
        },
        "expected": {
            "min_tasks": 2,
            "must_have_institutions": ["SBI", "LIC"],
            "must_have_high_priority": ["SBI", "LIC"],
            "must_not_be_blocked": ["SBI", "LIC"],
            "must_generate_documents": True,
        },
    },

    "b": {
        "name": "Scenario B — Verma family (multiple nominees + EPFO)",
        "input": {
            "deceased_name": "Anil Verma",
            "date_of_death": "2025-03-03",
            "pan_available": True,
            "phone": None,
            "institutions": ["HDFC", "EPFO", "MUTUAL FUNDS"],
            "nominee_name": "Priya Verma",
            "nominee_relation": "spouse",
            "multiple_nominees": True,
            "will_exists": False,
            "will_disputed": False,
            "docs_available": ["death_certificate", "aadhaar"],
        },
        "expected": {
            "global_flags_must_include": ["multiple_nominees", "legal_heir_cert_needed"],
            "min_tasks": 4,
            "must_have_institutions": ["HDFC", "EPFO"],
            "epfo_must_not_be_blocked": True,
            "hdfc_must_be_blocked": True,
            "must_inject_legal_heir_task": True,
            "must_generate_documents": True,
        },
    },

    "c": {
        "name": "Scenario C — Khan family (PAN missing + disputed will)",
        "input": {
            "deceased_name": "Mohammed Khan",
            "date_of_death": "2025-02-18",
            "pan_available": False,
            "phone": None,
            "institutions": ["SBI", "LIC", "EPFO", "NPS"],
            "nominee_name": "Fatima Khan",
            "nominee_relation": "spouse",
            "multiple_nominees": False,
            "will_exists": True,
            "will_disputed": True,
            "docs_available": ["death_certificate"],
        },
        "expected": {
            "global_flags_must_include": ["pan_missing", "disputed_will", "succession_required"],
            "min_tasks": 5,
            "sbi_must_be_blocked": True,
            "lic_must_be_blocked": True,
            "epfo_must_not_be_blocked": True,
            "must_inject_pan_task": True,
            "must_inject_succession_task": True,
            "must_generate_critical_warnings": True,
        },
    },
}


def check(condition: bool, label: str, results: list) -> None:
    status = "PASS" if condition else "FAIL"
    results.append((status, label))
    print(f"  {'✓' if condition else '✗'} [{status}] {label}")


def evaluate_scenario(key: str, verbose: bool = False) -> tuple[int, int]:
    scenario = SCENARIOS[key]
    print(f"\n{'='*60}")
    print(f"  {scenario['name']}")
    print(f"{'='*60}")

    try:
        result = run_case(scenario["input"])
    except Exception as e:
        print(f"  ERROR running scenario: {e}")
        return 0, 1

    expected  = scenario["expected"]
    results   = []
    tasks     = result.get("tasks", [])
    global_flags = result.get("global_flags", [])
    documents = result.get("documents", [])
    insight   = result.get("insight", {})

    # Task count
    check(len(tasks) >= expected.get("min_tasks", 1),
          f"Min tasks: got {len(tasks)}, expected >= {expected.get('min_tasks',1)}",
          results)

    # Global flags
    for flag in expected.get("global_flags_must_include", []):
        check(flag in global_flags, f"Flag detected: '{flag}'", results)

    # Institution tasks present
    task_institutions = [t["institution"].upper() for t in tasks]
    for inst in expected.get("must_have_institutions", []):
        check(any(inst.upper() in i for i in task_institutions),
              f"Task exists for {inst}", results)

    # Priority checks
    for inst in expected.get("must_have_high_priority", []):
        inst_tasks = [t for t in tasks if inst.upper() in t["institution"].upper()]
        check(any(t["priority"] == "high" for t in inst_tasks),
              f"{inst} task is high priority", results)

    # Not blocked checks
    for inst in expected.get("must_not_be_blocked", []):
        inst_tasks = [t for t in tasks if inst.upper() in t["institution"].upper()]
        check(all(t["status"] != "blocked" for t in inst_tasks),
              f"{inst} task is NOT blocked", results)

    # EPFO must not be blocked
    if expected.get("epfo_must_not_be_blocked"):
        epfo_tasks = [t for t in tasks if "EPFO" in t["institution"].upper()]
        check(len(epfo_tasks) > 0 and all(t["status"] != "blocked" for t in epfo_tasks),
              "EPFO is NOT blocked (PAN not required for EPFO)", results)

    # HDFC must be blocked
    if expected.get("hdfc_must_be_blocked"):
        hdfc_tasks = [t for t in tasks if "HDFC" in t["institution"].upper()]
        check(any(t["status"] == "blocked" for t in hdfc_tasks),
              "HDFC IS blocked (legal heir cert required)", results)

    # SBI must be blocked
    if expected.get("sbi_must_be_blocked"):
        sbi_tasks = [t for t in tasks if "SBI" in t["institution"].upper()
                     and "mf" not in t["title"].lower()]
        check(any(t["status"] == "blocked" for t in sbi_tasks),
              "SBI IS blocked (PAN missing / disputed will)", results)

    # LIC must be blocked
    if expected.get("lic_must_be_blocked"):
        lic_tasks = [t for t in tasks if "LIC" in t["institution"].upper()]
        check(any(t["status"] == "blocked" for t in lic_tasks),
              "LIC IS blocked (disputed will)", results)

    # Injected tasks
    if expected.get("must_inject_legal_heir_task"):
        check(any("legal heir" in t["title"].lower() for t in tasks),
              "Legal heir certificate task injected", results)

    if expected.get("must_inject_pan_task"):
        check(any("duplicate pan" in t["title"].lower() for t in tasks),
              "Duplicate PAN task injected", results)

    if expected.get("must_inject_succession_task"):
        check(any("succession" in t["title"].lower() for t in tasks),
              "Succession certificate task injected", results)

    # Documents generated
    if expected.get("must_generate_documents"):
        check(len(documents) > 0,
              f"Documents generated: {len(documents)}", results)

    # Critical warnings
    if expected.get("must_generate_critical_warnings"):
        check(len(insight.get("critical_warnings", [])) > 0,
              "Critical warnings in AI insight", results)

    # Summary
    passed = sum(1 for s, _ in results if s == "PASS")
    total  = len(results)
    print(f"\n  Result: {passed}/{total} checks passed")

    if verbose:
        print(f"\n  --- Tasks ({len(tasks)}) ---")
        for t in tasks:
            blocked_note = f" <- blocked by {t['blocked_by']}" if t["blocked_by"] else ""
            print(f"  [{t['priority'].upper():8}] {t['title']}{blocked_note}")
        print(f"\n  --- Global flags ---")
        print(f"  {global_flags}")
        print(f"\n  --- Documents generated ---")
        for d in documents:
            print(f"  {d['institution']} — {d['document_type']}")
        print(f"\n  --- AI Insight ---")
        print(f"  Next steps: {insight.get('next_steps', '')[:300]}")
        print(f"  Warnings:   {insight.get('critical_warnings', [])}")
        print(f"  Timeline:   {insight.get('estimated_total_days', '')}")

    return passed, total


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", choices=["a", "b", "c"],
                        help="Run one scenario only")
    parser.add_argument("--verbose", action="store_true",
                        help="Print full task list and insight")
    args = parser.parse_args()

    scenarios_to_run = [args.scenario] if args.scenario else ["a", "b", "c"]

    total_passed = 0
    total_checks = 0

    for key in scenarios_to_run:
        p, t = evaluate_scenario(key, verbose=args.verbose)
        total_passed += p
        total_checks += t

    print(f"\n{'='*60}")
    print(f"  OVERALL: {total_passed}/{total_checks} checks passed")
    if total_passed == total_checks:
        print("  ALL PASS — agent is ready. Start building the backend.")
    else:
        print("  FAILURES found — fix prompts in prompts.py then re-run.")
    print(f"{'='*60}\n")