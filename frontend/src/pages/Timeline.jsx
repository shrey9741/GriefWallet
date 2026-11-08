import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AppNav from "../components/AppNav";

const toDate = (v) => (v ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v + "Z") : null);
const dayKey = (d) => d.toDateString();
const dayLabel = (d) => {
  const t = new Date();
  const y = new Date();
  y.setDate(t.getDate() - 1);
  if (dayKey(d) === dayKey(t)) return "Today";
  if (dayKey(d) === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};
const timeOf = (d) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const TYPE = {
  case_created: { label: "Case created", cls: "bg-gray-100 text-gray-700 border-gray-200" },
  task: { label: "Task", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  document: { label: "Letter drafted", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  letter_sent: { label: "Letter sent", cls: "bg-green-50 text-green-700 border-green-200" },
};
const DOT = { done: "bg-green-500", blocked: "bg-red-500", pending: "bg-gray-300", in_progress: "bg-blue-500" };

export default function Timeline() {
  const [data, setData] = useState(null); // [{ case, events, summary }]
  const [error, setError] = useState("");
  const [caseF, setCaseF] = useState("");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: cases } = await api.get("/cases");
        const all = await Promise.all(
          cases.map((c) => api.get(`/timeline/${c.id}`).then((r) => ({ case: c, ...r.data })).catch(() => ({ case: c, events: [], summary: {} })))
        );
        setData(all);
      } catch {
        setError("Could not load your timeline.");
      }
    })();
  }, []);

  const scoped = useMemo(() => (data || []).filter((x) => !caseF || x.case.id === caseF), [data, caseF]);

  const summary = useMemo(() => {
    const s = { total: 0, done: 0, blocked: 0, pending: 0 };
    scoped.forEach((x) => {
      s.total += x.summary.total_tasks || 0;
      s.done += x.summary.done_tasks || 0;
      s.blocked += x.summary.blocked_tasks || 0;
      s.pending += x.summary.pending_tasks || 0;
    });
    s.pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return s;
  }, [scoped]);

  const events = useMemo(
    () =>
      scoped
        .flatMap((x) => x.events.map((e) => ({ ...e, case: x.case, date: toDate(e.timestamp) })))
        .filter((e) => e.date)
        .sort((a, b) => b.date - a.date),
    [scoped]
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter(
      (e) =>
        (tab === "all" ||
          (tab === "tasks" && e.type === "task") ||
          (tab === "letters" && (e.type === "document" || e.type === "letter_sent")) ||
          (tab === "blocked" && e.status === "blocked")) &&
        (!term || `${e.label} ${e.detail || ""} ${e.case.deceased_name}`.toLowerCase().includes(term))
    );
  }, [events, tab, q]);

  const groups = useMemo(() => {
    const g = [];
    shown.forEach((e) => {
      const k = dayKey(e.date);
      if (!g.length || g[g.length - 1].k !== k) g.push({ k, label: dayLabel(e.date), items: [] });
      g[g.length - 1].items.push(e);
    });
    return g;
  }, [shown]);

  const taskEvents = events.filter((e) => e.type === "task");
  const titleByRef = useMemo(() => {
    const m = {};
    taskEvents.forEach((e) => { m[`${e.case.id}:${e.task_ref}`] = e.label; });
    return m;
  }, [taskEvents]);
  const blocked = taskEvents.filter((e) => e.status === "blocked");
  const upNext = taskEvents.filter((e) => e.status === "pending").sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0)).slice(0, 4);

  const tabs = [["all", "All events"], ["tasks", "Tasks"], ["letters", "Letters"], ["blocked", "Blocked"]];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav active="timeline" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recovery timeline and activity</h1>
            <p className="text-sm text-gray-500 mt-1">What has happened, what is blocked and what to do next, across your cases.</p>
          </div>
          {data && data.length > 0 && (
            <select value={caseF} onChange={(e) => setCaseF(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-700">
              <option value="">All cases</option>
              {data.map((x) => <option key={x.case.id} value={x.case.id}>{x.case.deceased_name}</option>)}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {data === null && !error && <p className="text-sm text-gray-500">Loading...</p>}
        {data && data.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">
            No cases yet. <Link to="/cases/new" className="text-blue-600 hover:underline">Start a recovery</Link> to see activity here.
          </div>
        )}

        {data && data.length > 0 && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Overall completion</span>
                <span className="text-sm font-bold text-blue-600">{summary.pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${summary.pct}%` }} />
              </div>
              <div className="flex flex-wrap gap-3 mt-4 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-semibold">{summary.done} completed</span>
                <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold">{summary.blocked} blocked</span>
                <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">{summary.pending} pending</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              <section className="min-w-0">
                <div className="flex flex-wrap gap-2 mb-4">
                  {tabs.map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${tab === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                      {l}
                    </button>
                  ))}
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs ml-auto min-w-[160px]" />
                </div>

                {groups.length === 0 && <p className="text-sm text-gray-500">No events match.</p>}
                {groups.map((g) => (
                  <div key={g.k} className="mb-5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{g.label}</h3>
                    <ol className="space-y-3">
                      {g.items.map((e, i) => {
                        const t = TYPE[e.type] || TYPE.task;
                        const isBlocked = e.status === "blocked";
                        return (
                          <li key={i} className="flex gap-3">
                            <span className={`mt-4 w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT[e.status] || "bg-gray-300"}`} />
                            <div className={`flex-1 min-w-0 bg-white rounded-xl border p-4 shadow-sm ${isBlocked ? "border-red-200" : "border-gray-200"}`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isBlocked ? "bg-red-50 text-red-700 border-red-200" : t.cls}`}>
                                  {isBlocked ? "Blocked" : t.label}
                                </span>
                                <span className="text-[11px] text-gray-400">{timeOf(e.date)}</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{e.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {e.case.deceased_name}{e.detail ? ` · ${e.detail}` : ""}
                              </p>
                              {isBlocked && e.blocker_reason && (
                                <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2">{e.blocker_reason}</p>
                              )}
                              <Link to={`/cases/${e.case.id}`} className="inline-block text-[11px] font-semibold text-blue-600 hover:underline mt-2">Open case</Link>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </section>

              <aside className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Up next</h3>
                  {upNext.length === 0 && <p className="text-xs text-gray-500">Nothing pending.</p>}
                  <div className="space-y-2">
                    {upNext.map((e, i) => (
                      <Link key={i} to={`/cases/${e.case.id}`} className="block rounded-lg border border-gray-200 p-3 hover:border-blue-300">
                        <p className="text-xs font-semibold text-gray-900">{e.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {e.case.deceased_name} · {e.detail}{e.priority === "high" ? " · High priority" : ""}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Blocked tasks</h3>
                  {blocked.length === 0 && <p className="text-xs text-gray-500">Nothing is blocked.</p>}
                  <div className="space-y-2">
                    {blocked.map((e, i) => (
                      <Link key={i} to={`/cases/${e.case.id}`} className="block rounded-lg border border-red-200 bg-red-50/40 p-3">
                        <p className="text-xs font-semibold text-gray-900">{e.label}</p>
                        {e.blocker_reason && <p className="text-[11px] text-red-700 mt-0.5">{e.blocker_reason}</p>}
                        {(e.blocked_by || []).length > 0 && (
                          <p className="text-[11px] text-gray-600 mt-1">
                            Waiting on: {e.blocked_by.map((r) => titleByRef[`${e.case.id}:${r}`] || r).join(", ")}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
