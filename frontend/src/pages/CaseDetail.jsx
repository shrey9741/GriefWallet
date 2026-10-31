import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import api from "../api";

// ── icons (inline SVG, no extra dependency) ──────────────────────────────────

const ICONS = {
  back: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  down: <path d="m6 9 6 6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  warn: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  sparkles: <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
  tasks: <><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" /></>,
  bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>,
  shield: <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  clipboard: <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
};

const Icon = ({ name, className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {ICONS[name]}
  </svg>
);

const Spinner = ({ className = "h-4 w-4" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// ── helpers ──────────────────────────────────────────────────────────────────

// The API returns naive UTC timestamps, so mark them as UTC before parsing
const parseTs = (s) =>
  s ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`) : null;

const fmtDate = (s) => {
  const d = parseTs(s) || (s ? new Date(s) : null);
  return d && !isNaN(d)
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
};

const fmtDateTime = (s) => {
  const d = parseTs(s);
  return d && !isNaN(d)
    ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";
};

const FLAG_LABELS = {
  pan_missing: "PAN missing",
  will_exists: "Will exists",
  will_disputed: "Will disputed",
  multiple_nominees: "Multiple nominees",
};
const flagLabel = (f) =>
  FLAG_LABELS[f] || f.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Same institutions as the create-case form
const INSTITUTION_NAMES = {
  SBI: "State Bank of India",
  HDFC: "HDFC Bank Ltd.",
  LIC: "Life Insurance Corp.",
  EPFO: "Provident Fund (EPFO)",
  NPS: "National Pension System",
  "MUTUAL FUNDS": "Mutual Funds",
};
const institutionName = (code) => INSTITUTION_NAMES[String(code).toUpperCase()] || "";

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-green-50 text-green-600 border-green-200",
  blocked: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const errMsg = (err, fallback) => err?.response?.data?.detail || fallback;

const docText = (d) => (typeof d === "string" ? d : d?.doc || JSON.stringify(d));

// Institutions the backend has a letter template for (keep in sync with DOCUMENT_TYPE_MAP)
const LETTER_INSTITUTIONS = new Set(["SBI", "HDFC", "ICICI", "LIC", "EPFO", "NPS", "MUTUAL FUNDS", "SBI MF"]);

const DOC_LABELS = { death_certificate: "Death certificate", aadhaar: "Aadhaar", pan: "PAN" };
const prettyDoc = (s) =>
  DOC_LABELS[String(s).toLowerCase()] ||
  String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// ── task card ────────────────────────────────────────────────────────────────

function TaskCard({ task, titleById, openBlockers, onStatus, saving, defaultOpen, canDraft, hasLetter, drafting, onDraft, onView }) {
  const [open, setOpen] = useState(defaultOpen);
  const blocked = openBlockers.length > 0;
  const done = task.status === "done";
  const shownStatus = task.status === "blocked" ? "pending" : task.status;

  return (
    <div
      className={`rounded-xl border shadow-sm transition-all ${
        blocked ? "bg-amber-50/60 border-amber-200" : done ? "bg-white border-green-200" : "bg-white border-gray-200"
      }`}
    >
      <div className="p-4 flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`mt-0.5 flex-shrink-0 ${blocked ? "text-amber-500" : "text-gray-400 hover:text-gray-600"}`}
          aria-label={open ? "Collapse task" : "Expand task"}
        >
          <Icon name={blocked ? "lock" : open ? "down" : "right"} className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h4
              onClick={() => setOpen(!open)}
              className={`text-sm font-semibold cursor-pointer ${done ? "text-gray-400 line-through" : "text-gray-900"}`}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                }`}
              >
                {task.priority}
              </span>
              {blocked && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-300">
                  Blocked
                </span>
              )}
              <select
                value={shownStatus}
                disabled={blocked || saving}
                onChange={(e) => onStatus(task, e.target.value)}
                title={blocked ? "Complete the blocking task first" : "Update status"}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <Icon name="clock" className="w-3 h-3" />
            Estimated duration: ~{task.estimated_days_min}–{task.estimated_days_max} days
          </p>

          {blocked && (
            <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              <Icon name="warn" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
              <div>
                <span className="font-semibold">Blocked by: </span>
                {openBlockers.map((id) => titleById[id] || id).join(", ")}
                {task.blocker_reason && <span>. {task.blocker_reason}</span>}
              </div>
            </div>
          )}

          {canDraft && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDraft(task)}
                disabled={drafting}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {drafting ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="file" className="w-3.5 h-3.5" />}
                {drafting ? "Drafting…" : hasLetter ? "Redraft letter" : "Draft letter"}
              </button>
              {hasLetter && !drafting && (
                <button
                  type="button"
                  onClick={() => onView(task)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  View letter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="mx-4 mb-4 grid md:grid-cols-2 gap-5 bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div>
            <h5 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <Icon name="file" className="w-3.5 h-3.5 text-blue-600" />
              Required documents
            </h5>
            {task.required_docs?.length ? (
              <ul className="space-y-1.5">
                {task.required_docs.map((d, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <Icon name="check" className="w-3.5 h-3.5 mt-px flex-shrink-0 text-blue-500" />
                    {docText(d)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">None listed</p>
            )}
          </div>
          <div>
            <h5 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <Icon name="tasks" className="w-3.5 h-3.5 text-blue-600" />
              Procedure
            </h5>
            {task.procedure_steps?.length ? (
              <ol className="space-y-2">
                {task.procedure_steps.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-gray-400">None listed</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [caseData, setCaseData] = useState(null);
  const [docs, setDocs] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [insight, setInsight] = useState(null);

  const [tab, setTab] = useState("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [savingTask, setSavingTask] = useState(null);
  const [draftingTask, setDraftingTask] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const caseRes = await api.get(`/cases/${id}`);
      setCaseData(caseRes.data);
      const [docsRes, tlRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/timeline/${id}`),
      ]);
      setDocs(docsRes.data);
      setTimeline(tlRes.data);
      setActiveDoc((cur) => cur ?? docsRes.data[0]?.id ?? null);
    } catch (err) {
      setError(errMsg(err, "Could not load this case. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tasks = caseData?.tasks || [];

  const { titleById, doneIds } = useMemo(() => {
    const titleById = {};
    const doneIds = new Set();
    tasks.forEach((t) => {
      titleById[t.task_id] = t.title;
      if (t.status === "done") doneIds.add(t.task_id);
    });
    return { titleById, doneIds };
  }, [tasks]);

  const openBlockersFor = (t) =>
    t.status === "done" ? [] : (t.blocked_by || []).filter((b) => !doneIds.has(b));

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const blockedTasks = tasks.filter((t) => openBlockersFor(t).length > 0);
  const blockedCount = blockedTasks.length;
  const blockedInstitutions = [...new Set(blockedTasks.map((t) => t.institution))];
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  const caseStatus =
    total === 0
      ? { label: "Plan pending", cls: "bg-gray-100 text-gray-600" }
      : doneCount === total
        ? { label: "Completed", cls: "bg-green-100 text-green-700" }
        : { label: "In progress", cls: "bg-blue-100 text-blue-700" };

  const byInstitution = useMemo(() => {
    const groups = {};
    tasks.forEach((t) => {
      (groups[t.institution] = groups[t.institution] || []).push(t);
    });
    return groups;
  }, [tasks]);

  const handleStatus = async (task, status) => {
    const prev = task.status;
    setSavingTask(task.id);
    setCaseData((c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)),
    }));
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      api.get(`/timeline/${id}`).then((r) => setTimeline(r.data)).catch(() => {});
    } catch (err) {
      setCaseData((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === task.id ? { ...t, status: prev } : t)),
      }));
      setNotice(errMsg(err, "Could not update the task."));
    } finally {
      setSavingTask(null);
    }
  };

  const handleGenerate = async () => {
    if (total > 0 && !window.confirm("Regenerate the plan? Your task progress will be reset.")) return;
    setGenerating(true);
    setNotice("");
    try {
      const res = await api.post("/ai/generate-checklist", { case_id: id });
      if (res.data?.insight) setInsight(res.data.insight);
      setActiveDoc(null);
      await load();
    } catch (err) {
      setNotice(errMsg(err, "The AI step failed. Please try again in a moment."));
    } finally {
      setGenerating(false);
    }
  };

  const handleDraft = async (task) => {
    setDraftingTask(task.id);
    setNotice("");
    try {
      const res = await api.post("/ai/generate-document", { case_id: id, task_id: task.id });
      const docsRes = await api.get(`/documents/${id}`);
      setDocs(docsRes.data);
      api.get(`/timeline/${id}`).then((r) => setTimeline(r.data)).catch(() => {});
      setActiveDoc(res.data.id);
      setTab("documents");
    } catch (err) {
      setNotice(errMsg(err, "Could not draft the letter. Please try again."));
    } finally {
      setDraftingTask(null);
    }
  };

  const handleViewLetter = (task) => {
    const d = docs.find((x) => x.institution === task.institution);
    if (d) {
      setActiveDoc(d.id);
      setTab("documents");
    }
  };

  const handleInsight = async () => {
    setInsightLoading(true);
    setNotice("");
    try {
      const res = await api.post("/ai/generate-insight", { case_id: id });
      setInsight(res.data.insight);
    } catch (err) {
      setNotice(errMsg(err, "Could not generate guidance right now."));
    } finally {
      setInsightLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this case and all its tasks and documents? This cannot be undone.")) return;
    try {
      await api.delete(`/cases/${id}`);
      navigate("/dashboard");
    } catch (err) {
      setNotice(errMsg(err, "Could not delete the case."));
    }
  };

  const selectedDoc = docs.find((d) => d.id === activeDoc);

  const copyDoc = async () => {
    if (!selectedDoc) return;
    try {
      await navigator.clipboard.writeText(selectedDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice("Copy failed. Select the text and copy it manually.");
    }
  };

  const downloadDoc = () => {
    if (!selectedDoc) return;
    const blob = new Blob([selectedDoc.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc.institution}_${selectedDoc.document_type}.txt`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  };

  const firstName = user?.firstName || "G";

  // ── nav ──
  const Nav = (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 sm:gap-6 sticky top-0 z-40">
      <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-base tracking-tight">
        <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
          <Icon name="shield" className="w-3.5 h-3.5" />
        </span>
        GriefWallet
      </Link>
      <div className="flex gap-6 text-sm flex-1 ml-2">
        <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 font-medium">
          Dashboard
        </Link>
        <span className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5">Case</span>
      </div>
      <button
        onClick={() => navigate("/cases/new")}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        <Icon name="plus" className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New Recovery</span>
      </button>
      <div
        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer flex-shrink-0"
        onClick={() => signOut(() => navigate("/login"))}
        title="Click to log out"
      >
        {firstName.charAt(0).toUpperCase()}
      </div>
    </nav>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {Nav}
        <div className="flex items-center justify-center py-32 text-blue-600">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {Nav}
        <div className="max-w-xl mx-auto mt-20 bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-700 mb-4">{error || "Case not found."}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
            >
              Try again
            </button>
            <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const flags = caseData.global_flags || [];
  const flagText = flags.map(flagLabel).join(" · ");

  const tabs = [
    { key: "tasks", label: `Tasks (${total})`, icon: "tasks" },
    { key: "documents", label: `Documents (${docs.length})`, icon: "file" },
    { key: "timeline", label: "Timeline", icon: "clock" },
  ];

  let firstTaskSeen = false;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {Nav}

      {generating && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-blue-600">
          <Spinner className="h-10 w-10" />
          <p className="text-lg font-semibold text-gray-900">AI is generating your recovery plan…</p>
          <p className="text-sm text-gray-500">This may take 15–30 seconds</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Link to="/dashboard" className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1.5">
          <Icon name="back" className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>

        {/* Header card */}
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {caseData.deceased_name?.charAt(0) || "?"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{caseData.deceased_name}</h1>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${caseStatus.cls}`}>
                    {caseStatus.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  GW-{caseData.id.slice(0, 8).toUpperCase()} · Created {fmtDate(caseData.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-all inline-flex items-center gap-1.5"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              Delete case
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Date of death</p>
              <p className="text-gray-800 font-semibold mt-0.5">{fmtDate(caseData.date_of_death)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nominee</p>
              <p className="text-gray-800 font-semibold mt-0.5 capitalize">
                {caseData.nominee_name}
                <span className="text-gray-400 font-normal"> ({caseData.nominee_relation})</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Institutions</p>
              <div className="flex gap-1 flex-wrap mt-1">
                {(caseData.institutions || []).map((i) => (
                  <span key={i} className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">
                    {i}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Documents on hand</p>
              <p className="text-gray-800 font-semibold mt-0.5">
                {(caseData.docs_available || []).length ? caseData.docs_available.map(prettyDoc).join(", ") : "None"}
              </p>
            </div>
          </div>

          {flags.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              <Icon name="warn" className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>
                <span className="font-semibold">{flagText}</span>
                {blockedCount > 0 &&
                  ` — ${blockedCount} ${blockedCount === 1 ? "task" : "tasks"} blocked at ${blockedInstitutions.join(", ")}`}
              </span>
            </div>
          )}

          <div className="mt-4 border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-gray-500">
                Recovery progress · {doneCount}/{total} tasks done
                {blockedCount > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-600 font-semibold">{blockedCount} blocked</span>
                  </>
                )}
              </span>
              <span className="text-[11px] font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {notice && (
          <div className="mt-4 flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} className="text-red-400 hover:text-red-600" aria-label="Dismiss">
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main column */}
          <div className="lg:col-span-2">
            <div className="flex gap-6 border-b border-gray-200 mb-5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-all inline-flex items-center gap-1.5 ${
                    tab === t.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon name={t.icon} className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tasks */}
            {tab === "tasks" &&
              (total === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    <Icon name="clipboard" className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900">No recovery plan yet</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    Generate the plan to get tasks, blockers and draft letters for each institution.
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all"
                  >
                    Generate recovery plan
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(byInstitution).map(([inst, list]) => (
                    <section key={inst}>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        {inst}
                        {institutionName(inst) && <span className="text-gray-400"> · {institutionName(inst)}</span>}
                        <span className="text-gray-400 font-medium ml-1">
                          {list.filter((t) => t.status === "done").length}/{list.length} done
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {list.map((t) => {
                          const first = !firstTaskSeen;
                          firstTaskSeen = true;
                          return (
                            <TaskCard
                              key={t.id}
                              task={t}
                              titleById={titleById}
                              openBlockers={openBlockersFor(t)}
                              onStatus={handleStatus}
                              saving={savingTask === t.id}
                              defaultOpen={first}
                              canDraft={LETTER_INSTITUTIONS.has(String(t.institution).toUpperCase())}
                              hasLetter={docs.some((d) => d.institution === t.institution)}
                              drafting={draftingTask === t.id}
                              onDraft={handleDraft}
                              onView={handleViewLetter}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  <button
                    onClick={handleGenerate}
                    className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1.5"
                  >
                    <Icon name="refresh" className="w-3 h-3" />
                    Regenerate plan
                  </button>
                </div>
              ))}

            {/* Documents */}
            {tab === "documents" &&
              (docs.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-sm text-gray-500">
                  {total > 0
                    ? "No letters yet. Open the Tasks tab and use “Draft letter” on a task. You can draft a claim letter even while the task is blocked, and send it once the blocker is cleared."
                    : "No letters yet. Generate the recovery plan first."}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    {docs.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActiveDoc(d.id)}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                          activeDoc === d.id
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{d.institution}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{d.document_type}</p>
                      </button>
                    ))}
                  </div>
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    {selectedDoc ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {selectedDoc.institution} · {selectedDoc.document_type}
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={copyDoc}
                              className="text-xs border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 text-gray-600 inline-flex items-center gap-1.5"
                            >
                              <Icon name={copied ? "check" : "copy"} className="w-3.5 h-3.5" />
                              {copied ? "Copied" : "Copy"}
                            </button>
                            <button
                              onClick={downloadDoc}
                              className="text-xs border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 text-gray-600 inline-flex items-center gap-1.5"
                            >
                              <Icon name="download" className="w-3.5 h-3.5" />
                              Download
                            </button>
                          </div>
                        </div>
                        {selectedDoc.placeholders_remaining?.length > 0 && (
                          <div className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                            <span className="font-semibold">Fill in before sending: </span>
                            {selectedDoc.placeholders_remaining.map((p) => `[${p}]`).join(", ")}
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-700 font-sans">
                          {selectedDoc.content}
                        </pre>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Select a letter to preview it.</p>
                    )}
                  </div>
                </div>
              ))}

            {/* Timeline */}
            {tab === "timeline" && (
              <ol className="relative border-l-2 border-gray-200 ml-2 space-y-5">
                {(timeline?.events || []).map((e, i) => {
                  const color =
                    e.status === "done"
                      ? "bg-green-500"
                      : e.status === "in_progress"
                        ? "bg-blue-500"
                        : e.status === "blocked"
                          ? "bg-amber-500"
                          : "bg-gray-300";
                  return (
                    <li key={i} className="ml-5">
                      <span className={`absolute -left-[7px] w-3 h-3 rounded-full ring-4 ring-gray-50 ${color}`} />
                      <p className="text-sm font-semibold text-gray-900">{e.label}</p>
                      <p className="text-xs text-gray-500">{e.detail}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(e.timestamp)}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Side column */}
          <aside className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon name="sparkles" className="w-4 h-4" />
                AI Guardian Insights
              </h3>

              {!insight ? (
                <p className="text-xs text-blue-100 mt-3 leading-relaxed">
                  {total === 0
                    ? "Generate the recovery plan to unlock insights."
                    : "Get a prioritised view of what to do next, what could go wrong, and what can run in parallel."}
                </p>
              ) : (
                <div className="mt-3 space-y-4 text-xs">
                  {insight.next_steps && <p className="text-blue-50 leading-relaxed">{insight.next_steps}</p>}
                  {insight.estimated_total_days && (
                    <p className="text-blue-200">Estimated total: {insight.estimated_total_days}</p>
                  )}
                  {insight.critical_warnings?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1.5">Warnings</p>
                      <ul className="space-y-1.5">
                        {insight.critical_warnings.map((w, i) => (
                          <li key={i} className="text-blue-50 flex gap-2">
                            <Icon name="check" className="w-3.5 h-3.5 mt-px flex-shrink-0 text-blue-200" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {insight.parallel_tracks?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1.5">Do in parallel</p>
                      <div className="bg-white/10 border border-white/10 rounded-lg p-3 space-y-2">
                        {insight.parallel_tracks.map((p, i) => (
                          <p key={i} className="text-blue-50 flex gap-2">
                            <Icon name="bulb" className="w-3.5 h-3.5 mt-px flex-shrink-0 text-amber-300" />
                            {typeof p === "string" ? p : JSON.stringify(p)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleInsight}
                disabled={total === 0 || insightLoading}
                className="mt-4 w-full bg-white text-blue-700 text-xs font-bold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {insightLoading && <Spinner />}
                {insightLoading ? "Thinking…" : insight ? "Refresh guidance" : "Get unblocking guidance"}
              </button>

              <p className="text-[10px] text-blue-200 mt-3 leading-snug">
                AI-generated guidance. Always verify requirements with the institution.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Summary</h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Total recovery tasks</dt>
                  <dd className="font-bold text-gray-900">{total}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Completed</dt>
                  <dd className="min-w-[1.5rem] text-center font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {doneCount}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Blocked tasks</dt>
                  <dd className="min-w-[1.5rem] text-center font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {blockedCount}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Letters drafted</dt>
                  <dd className="min-w-[1.5rem] text-center font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {docs.length}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
