from typing import TypedDict, Literal, Optional


class CaseInput(TypedDict):
    deceased_name: str
    date_of_death: str
    pan_available: bool
    phone: Optional[str]
    institutions: list[str]
    nominee_name: str
    nominee_relation: str
    multiple_nominees: bool
    will_exists: bool
    will_disputed: bool
    docs_available: list[str]


class ClassifiedInstitution(TypedDict):
    name: str
    type: Literal["bank", "insurance", "government", "pension", "mutual_fund"]
    knowledge: dict
    special_flags: list[str]


class Task(TypedDict):
    task_id: str
    institution: str
    title: str
    priority: Literal["high", "medium", "low", "blocked"]
    status: Literal["pending", "in_progress", "done", "blocked"]
    required_docs: list[str]
    procedure_steps: list[str]
    estimated_days_min: int
    estimated_days_max: int
    blocked_by: list[str]
    blocker_reason: Optional[str]


class GeneratedDocument(TypedDict):
    doc_id: str
    institution: str
    document_type: str
    content: str
    placeholders_remaining: list[str]


class AIInsight(TypedDict):
    next_steps: str
    critical_warnings: list[str]
    estimated_total_days: str
    parallel_tracks: list[str]


class AgentState(TypedDict):
    case_input: CaseInput
    classified_institutions: list[ClassifiedInstitution]
    global_flags: list[str]
    tasks: list[Task]
    dependency_order: list[str]
    documents: list[GeneratedDocument]
    insight: AIInsight
    errors: list[str]