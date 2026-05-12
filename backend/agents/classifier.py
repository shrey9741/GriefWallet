import json
import os
from pathlib import Path

from agents.state import AgentState, ClassifiedInstitution

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge_base"

INSTITUTION_TYPE_MAP = {
    "SBI":          "bank",
    "HDFC":         "bank",
    "ICICI":        "bank",
    "AXIS":         "bank",
    "PNB":          "bank",
    "LIC":          "insurance",
    "HDFC LIFE":    "insurance",
    "SBI LIFE":     "insurance",
    "EPFO":         "government",
    "NPS":          "pension",
    "MUTUAL FUNDS": "mutual_fund",
    "SBI MF":       "mutual_fund",
    "HDFC MF":      "mutual_fund",
}


def load_knowledge(institution_name: str) -> dict:
    key = institution_name.upper().replace(" ", "_")
    filepath = KNOWLEDGE_DIR / f"{key.lower()}.json"
    if filepath.exists():
        with open(filepath) as f:
            return json.load(f)
    return {
        "institution": institution_name,
        "type": INSTITUTION_TYPE_MAP.get(institution_name.upper(), "bank"),
        "required_documents": [
            "Death certificate (original + 2 copies)",
            "Aadhaar of nominee",
            "PAN of deceased",
        ],
        "procedure_steps": [
            "Visit the nearest branch/office",
            "Submit death certificate and nominee ID proof",
            "Fill institution-specific claim form",
            "Processing takes 15-30 days",
        ],
        "typical_timeline_days": {"min": 15, "max": 30},
        "special_cases": {},
    }


def detect_global_flags(case_input: dict) -> list[str]:
    flags = []
    docs = [d.lower() for d in case_input.get("docs_available", [])]

    if not case_input.get("pan_available", True):
        flags.append("pan_missing")
    if "death_certificate" not in docs and "death certificate" not in docs:
        flags.append("no_death_cert")
    if "aadhaar" not in docs:
        flags.append("no_aadhaar")
    if case_input.get("will_disputed", False):
        flags.append("disputed_will")
        flags.append("succession_required")
    if not case_input.get("will_exists", True) and case_input.get("multiple_nominees", False):
        flags.append("legal_heir_cert_needed")
    if case_input.get("multiple_nominees", False):
        flags.append("multiple_nominees")

    return flags


def detect_institution_flags(institution_name: str, global_flags: list[str]) -> list[str]:
    inst_flags = []
    inst_upper = institution_name.upper()

    if "pan_missing" in global_flags and INSTITUTION_TYPE_MAP.get(inst_upper) == "bank":
        inst_flags.append("pan_missing_blocks_claim")
    if "disputed_will" in global_flags and INSTITUTION_TYPE_MAP.get(inst_upper) == "insurance":
        inst_flags.append("succession_cert_required")
    if "legal_heir_cert_needed" in global_flags:
        inst_flags.append("legal_heir_cert_needed")
    if "multiple_nominees" in global_flags:
        inst_flags.append("all_nominees_must_be_present")

    return inst_flags


def classifier_node(state: AgentState) -> dict:
    case_input = state["case_input"]
    institutions_raw = case_input.get("institutions", [])
    global_flags = detect_global_flags(case_input)

    classified: list[ClassifiedInstitution] = []
    for inst_name in institutions_raw:
        knowledge = load_knowledge(inst_name)
        inst_type = INSTITUTION_TYPE_MAP.get(inst_name.upper(), knowledge.get("type", "bank"))
        inst_flags = detect_institution_flags(inst_name, global_flags)
        classified.append({
            "name": inst_name,
            "type": inst_type,
            "knowledge": knowledge,
            "special_flags": inst_flags,
        })

    return {
        "classified_institutions": classified,
        "global_flags": global_flags,
        "errors": [],
    }