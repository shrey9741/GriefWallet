import json
import re

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from agents.state import AgentState, AIInsight
from prompts import advisor_prompt


def get_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        max_tokens=1024,
        temperature=0.2,
    )


def parse_advisor_response(raw: str) -> AIInsight:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
    try:
        data = json.loads(cleaned)
        return {
            "next_steps":           data.get("next_steps", ""),
            "critical_warnings":    data.get("critical_warnings", []),
            "estimated_total_days": data.get("estimated_total_days", ""),
            "parallel_tracks":      data.get("parallel_tracks", []),
        }
    except json.JSONDecodeError:
        return {
            "next_steps":           raw[:500],
            "critical_warnings":    [],
            "estimated_total_days": "Unknown",
            "parallel_tracks":      [],
        }


def advisor_node(state: AgentState) -> dict:
    prompt = advisor_prompt(
        case_input=state["case_input"],
        tasks=state["tasks"],
        global_flags=state["global_flags"],
    )
    llm      = get_llm()
    response = llm.invoke([HumanMessage(content=prompt)])
    insight  = parse_advisor_response(response.content)
    return {"insight": insight}