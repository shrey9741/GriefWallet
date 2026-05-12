from langgraph.graph import StateGraph, END

from agents.state import AgentState
from agents.classifier import classifier_node
from agents.planner import planner_node
from agents.doc_generator import doc_generator_node
from agents.advisor import advisor_node


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("classifier",    classifier_node)
    graph.add_node("planner",       planner_node)
    graph.add_node("doc_generator", doc_generator_node)
    graph.add_node("advisor",       advisor_node)

    graph.set_entry_point("classifier")
    graph.add_edge("classifier",    "planner")
    graph.add_edge("planner",       "doc_generator")
    graph.add_edge("doc_generator", "advisor")
    graph.add_edge("advisor",       END)

    return graph.compile()


_compiled_graph = None

def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_case(case_input: dict) -> dict:
    graph = get_graph()
    initial_state: AgentState = {
        "case_input":               case_input,
        "classified_institutions":  [],
        "global_flags":             [],
        "tasks":                    [],
        "dependency_order":         [],
        "documents":                [],
        "insight": {
            "next_steps":           "",
            "critical_warnings":    [],
            "estimated_total_days": "",
            "parallel_tracks":      [],
        },
        "errors": [],
    }
    return graph.invoke(initial_state)


def run_advisor_only(case_input: dict, tasks: list, global_flags: list) -> dict:
    from agents.advisor import advisor_node
    partial_state: AgentState = {
        "case_input":               case_input,
        "classified_institutions":  [],
        "global_flags":             global_flags,
        "tasks":                    tasks,
        "dependency_order":         [],
        "documents":                [],
        "insight": {
            "next_steps":           "",
            "critical_warnings":    [],
            "estimated_total_days": "",
            "parallel_tracks":      [],
        },
        "errors": [],
    }
    return advisor_node(partial_state)["insight"]