import difflib
import os
import re
import uuid

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from agents.state import AgentState, GeneratedDocument, Task
from prompts import doc_generator_prompt, nominee_intro

DOCUMENT_TYPE_MAP = {
    "SBI":          "account_closure_request",
    "HDFC":         "nominee_claim_letter",
    "ICICI":        "nominee_claim_letter",
    "LIC":          "death_benefit_claim_letter",
    "EPFO":         "pf_withdrawal_cover_letter",
    "NPS":          "nps_death_withdrawal_letter",
    "MUTUAL FUNDS": "unit_transmission_request",
    "SBI MF":       "unit_transmission_request",
    "GENERAL":      None,
    "INCOME TAX":   None,
    "CIVIL COURT":  None,
}


def get_llm() -> ChatGroq:
    # llama-3.3-70b-versatile was retired by Groq (Aug 2026); override via GROQ_MODEL if needed
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        max_tokens=4096,  # reasoning models spend part of this budget on thinking
        temperature=0.1,
        reasoning_effort="low",
    )


def extract_placeholders(text: str) -> list[str]:
    return re.findall(r"\[([A-Z_\s]+)\]", text)


KINSHIP_WORDS = {
    "father", "mother", "husband", "wife", "son", "daughter",
    "brother", "sister", "parent", "spouse", "sibling", "widow", "widower",
}


def kinship_violations(text: str, relation: str) -> list[str]:
    """Kinship words other than the nominee's own relation: a sign the model reversed it."""
    allowed = {str(relation).strip().lower()}
    words = set(re.findall(r"\b[a-z]+\b", text.lower()))
    return sorted((words & KINSHIP_WORDS) - allowed)


INTRO_RE = re.compile(
    r"I,\s+[^,\n]{2,60},\s+(?:the\s+)?[A-Za-z]+\s+of\s+the\s+late\s+[A-Za-z][A-Za-z .'-]{1,60}?(?=[,.;\n])"
)


def fix_name_typos(text: str, names: list[str]) -> str:
    """Replace near-miss spellings of the real names (e.g. Abhashek for Abhishek) with the exact ones."""
    wanted = {w for n in names for w in re.findall(r"[A-Za-z][A-Za-z'-]{4,}", n)}  # 5+ letters only
    wanted_lower = {w.lower() for w in wanted}

    def swap(m):
        word = m.group(0)
        if word.lower() in wanted_lower:
            return word
        for w in wanted:
            if difflib.SequenceMatcher(None, word.lower(), w.lower()).ratio() >= 0.86:
                return w
        return word

    return re.sub(r"\b[A-Z][a-z][A-Za-z'-]{3,}\b", swap, text)


def ensure_intro(text: str, intro: str) -> tuple[str, bool]:
    """Make sure the exact introduction sentence is present. Returns (text, ok)."""
    if intro.lower() in text.lower():
        return text, True
    fixed, n = INTRO_RE.subn(intro, text, count=1)
    return (fixed, True) if n else (text, False)


def generate_letter(case_input: dict, task: dict, knowledge: dict, doc_type: str, llm=None) -> GeneratedDocument:
    """Draft one letter for one task. Used by the pipeline and by the on-demand route."""
    llm = llm or get_llm()
    prompt = doc_generator_prompt(
        case_input=case_input,
        task=task,
        institution_knowledge=knowledge,
        document_type=doc_type,
    )
    relation = case_input.get("nominee_relation", "")

    letter = llm.invoke([HumanMessage(content=prompt)]).content.strip()
    bad = kinship_violations(letter, relation)

    if bad:  # one retry with a pointed correction
        retry = (
            prompt
            + f"\n\nCORRECTION: your previous draft used the words {', '.join(bad)}, which can misstate "
            "the relationship. Rewrite the whole letter without them. Refer to the deceased only by "
            "name, or as 'the deceased' or 'the account holder'."
        )
        letter = llm.invoke([HumanMessage(content=retry)]).content.strip()
        bad = kinship_violations(letter, relation)

    # Deterministic repairs: exact spelling of the names, and the exact introduction sentence
    letter = fix_name_typos(letter, [case_input.get("deceased_name", ""), case_input.get("nominee_name", "")])
    intro = nominee_intro(case_input["nominee_name"], relation, case_input["deceased_name"])
    letter, intro_ok = ensure_intro(letter, intro)

    placeholders = extract_placeholders(letter)
    if bad:  # still wrong: keep the draft but make the user check it
        placeholders.append("REVIEW_RELATIONSHIP_WORDING")
    if not intro_ok:
        placeholders.append("REVIEW_INTRODUCTION")

    return {
        "doc_id":                 f"doc_{str(uuid.uuid4())[:8]}",
        "institution":            task["institution"],
        "document_type":          doc_type,
        "content":                letter,
        "placeholders_remaining": placeholders,
    }


def doc_generator_node(state: AgentState) -> dict:
    case_input   = state["case_input"]
    tasks        = state["tasks"]
    classified   = state["classified_institutions"]
    knowledge_map = {inst["name"]: inst["knowledge"] for inst in classified}

    documents: list[GeneratedDocument] = []
    llm = get_llm()

    eligible = [
        t for t in tasks
        if t["priority"] == "high"
        and t["status"] != "blocked"
        and DOCUMENT_TYPE_MAP.get(t["institution"].upper()) is not None
    ]

    for task in eligible:
        inst_name = task["institution"].upper()
        doc_type  = DOCUMENT_TYPE_MAP.get(inst_name, "claim_letter")
        knowledge = knowledge_map.get(task["institution"], {})
        documents.append(generate_letter(case_input, task, knowledge, doc_type, llm=llm))

    return {"documents": documents}