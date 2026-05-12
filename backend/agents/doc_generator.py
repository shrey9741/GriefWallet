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
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        max_tokens=2048,
        temperature=0.1,
    )


def extract_placeholders(text: str) -> list[str]:
    return re.findall(r"\[([A-Z_\s]+)\]", text)


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
        inst_name  = task["institution"].upper()
        doc_type   = DOCUMENT_TYPE_MAP.get(inst_name, "claim_letter")
        knowledge  = knowledge_map.get(task["institution"], {})

        prompt = doc_generator_prompt(
            case_input=case_input,
            task=task,
            institution_knowledge=knowledge,
            document_type=doc_type,
        )

        response = llm.invoke([HumanMessage(content=prompt)])
        letter   = response.content.strip()

        documents.append({
            "doc_id":                  f"doc_{str(uuid.uuid4())[:8]}",
            "institution":             task["institution"],
            "document_type":           doc_type,
            "content":                 letter,
            "placeholders_remaining":  extract_placeholders(letter),
        })

    return {"documents": documents}