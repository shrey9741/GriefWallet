import json
import re
import uuid

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from agents.state import AgentState, Task
from prompts import planner_prompt


def get_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        max_tokens=4096,
        temperature=0,
    )


def inject_prerequisite_tasks(tasks: list, global_flags: list) -> list:
    titles_lower = [t["title"].lower() for t in tasks]

    if "legal_heir_cert_needed" in global_flags:
        if not any("legal heir" in t for t in titles_lower):
            tasks.insert(0, {
                "task_id": f"task_{str(uuid.uuid4())[:6]}",
                "institution": "GENERAL",
                "title": "Obtain legal heir certificate",
                "priority": "high",
                "status": "pending",
                "required_docs": [
                    "Death certificate",
                    "Family Aadhaar of all members",
                    "Affidavit on stamp paper",
                ],
                "procedure_steps": [
                    "Visit local tehsil or municipality office",
                    "Submit death certificate + family Aadhaar + affidavit",
                    "Collect acknowledgement receipt",
                    "Certificate issued in 7-14 working days",
                ],
                "estimated_days_min": 7,
                "estimated_days_max": 14,
                "blocked_by": [],
                "blocker_reason": None,
            })

    if "pan_missing" in global_flags:
        if not any("duplicate pan" in t for t in titles_lower):
            tasks.insert(0, {
                "task_id": f"task_{str(uuid.uuid4())[:6]}",
                "institution": "INCOME TAX",
                "title": "Apply for duplicate PAN card of deceased",
                "priority": "high",
                "status": "pending",
                "required_docs": [
                    "Death certificate",
                    "Legal heir Aadhaar",
                    "Form 49A",
                ],
                "procedure_steps": [
                    "Visit NSDL portal (nsdl.co.in)",
                    "Select Correction/Reprint of PAN",
                    "Submit Form 49A with death certificate",
                    "Pay Rs. 107 fee online",
                    "PAN delivered in 15-20 days",
                ],
                "estimated_days_min": 15,
                "estimated_days_max": 20,
                "blocked_by": [],
                "blocker_reason": None,
            })

    if "succession_required" in global_flags:
        if not any("succession" in t for t in titles_lower):
            tasks.insert(0, {
                "task_id": f"task_{str(uuid.uuid4())[:6]}",
                "institution": "CIVIL COURT",
                "title": "Obtain succession certificate from civil court",
                "priority": "high",
                "status": "pending",
                "required_docs": [
                    "Death certificate",
                    "Family tree affidavit",
                    "Court petition via civil lawyer",
                ],
                "procedure_steps": [
                    "Engage a registered civil lawyer immediately",
                    "Lawyer files petition in local civil court",
                    "Court publishes notice for 30-45 days",
                    "Certificate issued if no objections",
                    "Do NOT submit SBI or LIC claims until obtained",
                ],
                "estimated_days_min": 90,
                "estimated_days_max": 180,
                "blocked_by": [],
                "blocker_reason": None,
            })

    return tasks


def assign_ids_and_wire_blockers(tasks: list, global_flags: list) -> list:
    for i, task in enumerate(tasks):
        task["task_id"] = f"task_{str(i+1).zfill(3)}"

    legal_heir_id  = next((t["task_id"] for t in tasks if "legal heir" in t["title"].lower()), None)
    pan_task_id    = next((t["task_id"] for t in tasks if "duplicate pan" in t["title"].lower()), None)
    succession_id  = next((t["task_id"] for t in tasks if "succession" in t["title"].lower()), None)

    for task in tasks:
        title_lower = task["title"].lower()
        blockers = []

        if "legal_heir_cert_needed" in global_flags and legal_heir_id:
            if any(b in title_lower for b in ["sbi", "hdfc", "icici", "bank", "mutual fund", "mf"]):
                if task["task_id"] != legal_heir_id:
                    blockers.append(legal_heir_id)

        if "pan_missing" in global_flags and pan_task_id:
            if any(b in title_lower for b in ["sbi", "hdfc", "icici", "bank", "lic", "insurance"]):
                if task["task_id"] != pan_task_id:
                    blockers.append(pan_task_id)

        if "succession_required" in global_flags and succession_id:
            if any(b in title_lower for b in ["sbi", "hdfc", "lic", "insurance", "bank"]):
                if task["task_id"] != succession_id:
                    blockers.append(succession_id)

        if blockers:
            task["blocked_by"] = list(set(blockers))
            task["status"] = "blocked"
            task["priority"] = "blocked"
            blocker_titles = [t["title"] for t in tasks if t["task_id"] in blockers]
            task["blocker_reason"] = f"Requires: {', '.join(blocker_titles)}"
        else:
            task.setdefault("blocked_by", [])
            task.setdefault("blocker_reason", None)

    return tasks


def parse_planner_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Planner returned invalid JSON: {e}\n\nRaw:\n{raw[:500]}")


def planner_node(state: AgentState) -> dict:
    case_input   = state["case_input"]
    classified   = state["classified_institutions"]
    global_flags = state["global_flags"]
    knowledge_map = {inst["name"]: inst["knowledge"] for inst in classified}

    prompt = planner_prompt(
        case_input=case_input,
        classified_institutions=classified,
        global_flags=global_flags,
        knowledge_map=knowledge_map,
    )

    llm = get_llm()
    response = llm.invoke([HumanMessage(content=prompt)])
    parsed = parse_planner_response(response.content)

    tasks: list[Task] = parsed.get("tasks", [])
    tasks = inject_prerequisite_tasks(tasks, global_flags)
    tasks = assign_ids_and_wire_blockers(tasks, global_flags)

    unblocked = [t["task_id"] for t in tasks if not t["blocked_by"]]
    blocked   = [t["task_id"] for t in tasks if t["blocked_by"]]

    return {
        "tasks": tasks,
        "dependency_order": unblocked + blocked,
    }