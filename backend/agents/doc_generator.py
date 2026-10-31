import os
import re
import uuid

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from agents.state import AgentState, GeneratedDocument, Task
from prompts import doc_generator_prompt

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

    placeholders = extract_placeholders(letter)
    if bad:  # still wrong: keep the draft but make the user check it
        placeholders.append("REVIEW_RELATIONSHIP_WORDING")

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