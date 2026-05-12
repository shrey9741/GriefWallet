import json


def classifier_prompt(case_input: dict) -> str:
    return f"""You are a financial case analyst specialising in post-death asset recovery in India.

Analyse the case below and classify each institution. For each institution:
1. Identify its type (bank, insurance, government, pension, mutual_fund)
2. Detect any special flags that will complicate or block claims

CASE INPUT:
{json.dumps(case_input, indent=2)}

SPECIAL FLAGS to detect (only include what applies):
- "pan_missing"              -> pan_available is false
- "no_will"                  -> will_exists is false and multiple_nominees is true
- "disputed_will"            -> will_disputed is true
- "multiple_nominees"        -> multiple_nominees is true
- "no_death_cert"            -> death_certificate not in docs_available
- "no_aadhaar"               -> aadhaar not in docs_available
- "succession_required"      -> will_disputed is true

Respond ONLY with valid JSON. No explanation, no markdown, no preamble.

{{
  "classified_institutions": [
    {{
      "name": "SBI",
      "type": "bank",
      "special_flags": ["pan_missing"]
    }}
  ],
  "global_flags": ["pan_missing"]
}}"""


def planner_prompt(
    case_input: dict,
    classified_institutions: list,
    global_flags: list,
    knowledge_map: dict
) -> str:
    return f"""You are a senior financial recovery specialist helping Indian families
claim assets after a death. Generate a precise actionable task list.

CASE:
{json.dumps(case_input, indent=2)}

GLOBAL FLAGS (complications detected):
{json.dumps(global_flags, indent=2)}

INSTITUTION KNOWLEDGE BASE (use this — do not rely on general knowledge):
{json.dumps(knowledge_map, indent=2)}

RULES:
1. One primary task per institution
2. Generate prerequisite tasks if needed (legal heir cert, duplicate PAN)
3. Priority: "high" = start immediately | "medium" = depends on high | "low" = admin | "blocked" = cannot start
4. required_docs must come from the knowledge base only
5. procedure_steps must be institution-specific, not generic
6. If pan_missing: mark bank claims blocked, NOT EPFO (EPFO does not need PAN)
7. If disputed_will: mark bank and insurance claims blocked
8. estimated_days must match knowledge base timeline

Respond ONLY with valid JSON. No explanation, no markdown.

{{
  "tasks": [
    {{
      "task_id": "task_001",
      "institution": "SBI",
      "title": "SBI savings account closure + balance transfer",
      "priority": "high",
      "status": "pending",
      "required_docs": ["Death certificate (original + 2 copies)", "Aadhaar of nominee"],
      "procedure_steps": ["Visit home branch of deceased", "Submit death certificate"],
      "estimated_days_min": 15,
      "estimated_days_max": 20,
      "blocked_by": [],
      "blocker_reason": null
    }}
  ],
  "dependency_order": ["task_001"]
}}"""


def doc_generator_prompt(
    case_input: dict,
    task: dict,
    institution_knowledge: dict,
    document_type: str
) -> str:
    return f"""You are a legal document specialist helping Indian families draft formal
letters for financial asset recovery after death.

Generate a {document_type} letter for this case.

CASE:
- Deceased: {case_input['deceased_name']}
- Date of death: {case_input['date_of_death']}
- Nominee: {case_input['nominee_name']} ({case_input['nominee_relation']})

INSTITUTION: {task['institution']}
TASK: {task['title']}

INSTITUTION KNOWLEDGE:
{json.dumps(institution_knowledge, indent=2)}

REQUIREMENTS:
1. Use formal Indian letter format: To, Subject, Salutation, Body, Yours faithfully
2. 200 to 300 words
3. Use [PLACEHOLDER_NAME] for fields user must fill (account numbers, branch name, phone)
4. List all enclosures at the end
5. Do NOT invent legal claims
6. Tone: respectful, clear, firm

Respond ONLY with the letter text. Start with "To," directly."""


def advisor_prompt(
    case_input: dict,
    tasks: list,
    global_flags: list
) -> str:
    completed = [t for t in tasks if t['status'] == 'done']
    pending   = [t for t in tasks if t['status'] == 'pending']
    blocked   = [t for t in tasks if t['status'] == 'blocked']

    pending_summary  = json.dumps([{"title": t["title"], "priority": t["priority"]} for t in pending])
    blocked_summary  = json.dumps([{"title": t["title"], "reason": t["blocker_reason"]} for t in blocked])
    completed_titles = json.dumps([t["title"] for t in completed])

    return f"""You are a compassionate financial recovery advisor helping a grieving Indian family.

CASE: {case_input['deceased_name']} — Nominee: {case_input['nominee_name']}
COMPLICATIONS: {json.dumps(global_flags)}

COMPLETED ({len(completed)}): {completed_titles}
PENDING ({len(pending)}): {pending_summary}
BLOCKED ({len(blocked)}): {blocked_summary}

Respond ONLY with this JSON:

{{
  "next_steps": "2-3 sentences — exactly what to do THIS WEEK. Name specific institutions and forms.",
  "critical_warnings": ["warning 1", "warning 2"],
  "estimated_total_days": "e.g. 45-60 days",
  "parallel_tracks": ["action that can run in parallel", "another parallel action"]
}}"""