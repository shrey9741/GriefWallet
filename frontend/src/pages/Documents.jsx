import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AppNav from "../components/AppNav";

const pretty = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
// The API returns naive UTC timestamps; mark them as UTC so they show in local time.
const toDate = (v) => (v ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v + "Z") : null);
const fmtDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
};
const statusOf = (d) => (d.sent_at ? "sent" : d.placeholders_remaining?.length ? "draft" : "ready");
const placeholderName = (p) => p.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Badge({ doc }) {
  const st = statusOf(doc);
  if (st === "sent")
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Sent {fmtDate(doc.sent_at)}</span>;
  if (st === "ready")
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Ready to send</span>;
  const n = doc.placeholders_remaining.length;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Draft ({n} blank{n > 1 ? "s" : ""} left)</span>;
}

function Letter({ content }) {
  const parts = content.split(/(\[[A-Z_\s]+\])/g);
  return (
    <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-800 font-serif">
      {parts.map((p, i) =>
        /^\[[A-Z_\s]+\]$/.test(p) ? (
          <mark key={i} className="bg-amber-100 text-amber-800 rounded px-0.5">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </div>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [caseF, setCaseF] = useState("");
  const [instF, setInstF] = useState("");
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .get("/documents")
      .then((r) => {
        setDocs(r.data);
        if (r.data[0]) setSel(r.data[0].id);
      })
      .catch(() => setError("Could not load your letters."));
  }, []);

  useEffect(() => {
    setValues({});
    setMsg("");
  }, [sel]);

  const cases = useMemo(() => {
    const m = new Map();
    (docs || []).forEach((d) => m.set(d.case_id, d.deceased_name));
    return [...m.entries()];
  }, [docs]);
  const institutions = useMemo(() => [...new Set((docs || []).map((d) => d.institution))], [docs]);

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, ready: 0, sent: 0 };
    (docs || []).forEach((d) => { c.all++; c[statusOf(d)]++; });
    return c;
  }, [docs]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (docs || []).filter(
      (d) =>
        (tab === "all" || statusOf(d) === tab) &&
        (!caseF || d.case_id === caseF) &&
        (!instF || d.institution === instF) &&
        (!term || `${d.institution} ${d.document_type} ${d.deceased_name}`.toLowerCase().includes(term))
    );
  }, [docs, tab, q, caseF, instF]);

  const doc = (docs || []).find((d) => d.id === sel);

  const patch = async (body, okMsg) => {
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.patch(`/documents/single/${doc.id}`, body);
      setDocs((all) => all.map((d) => (d.id === data.id ? { ...d, ...data } : d)));
      if (okMsg) setMsg(okMsg);
      return true;
    } catch (err) {
      setMsg(err.response?.data?.detail || "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyValues = async () => {
    let text = doc.content;
    for (const p of doc.placeholders_remaining) {
      const v = (values[p] || "").trim();
      if (v) text = text.split(`[${p}]`).join(v);
    }
    if (text === doc.content) return setMsg("Type a value into at least one blank first.");
    if (await patch({ content: text }, "Saved.")) setValues({});
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content);
      setMsg("Letter copied.");
    } catch {
      setMsg("Copy failed. Select the text and copy it manually.");
    }
  };

  const download = () => {
    const blob = new Blob([doc.content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.institution}-${doc.document_type}-letter.txt`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return setMsg("Allow pop-ups to print or save as PDF.");
    const esc = doc.content.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(`<pre style="font:14px/1.6 Georgia,serif;white-space:pre-wrap;max-width:700px;margin:40px auto">${esc}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const tabs = [["all", "All"], ["draft", "Drafts"], ["ready", "Ready to send"], ["sent", "Sent"]];
  const sc = "h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav active="documents" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Documents and formal letters</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">Review, fill in and track the letters drafted across all your cases.</p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {docs === null && !error && <p className="text-sm text-gray-500">Loading...</p>}
        {docs && docs.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">
            No letters yet. Open a case and draft one from a task.{" "}
            <Link to="/dashboard" className="text-blue-600 hover:underline">Go to dashboard</Link>
          </div>
        )}

        {docs && docs.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, institution or type" className={`${sc} flex-1 min-w-[200px]`} />
              <select value={caseF} onChange={(e) => setCaseF(e.target.value)} className={sc}>
                <option value="">All cases</option>
                {cases.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
              <select value={instF} onChange={(e) => setInstF(e.target.value)} className={sc}>
                <option value="">All institutions</option>
                {institutions.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
              {/* Pipeline */}
              <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Letters in pipeline</h2>
                  <span className="text-[11px] text-gray-500">{counts.all} total</span>
                </div>
                <div className="flex gap-1 px-3 pt-3 flex-wrap">
                  {tabs.map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tab === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                      {l} ({counts[k]})
                    </button>
                  ))}
                </div>
                <div className="p-3 space-y-2 max-h-[640px] overflow-y-auto">
                  {list.length === 0 && <p className="text-xs text-gray-500 px-1 py-4">No letters match.</p>}
                  {list.map((d) => (
                    <button key={d.id} onClick={() => setSel(d.id)} className={`w-full text-left rounded-lg border p-3 ${sel === d.id ? "border-blue-400 bg-blue-50/40" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">{d.institution}</span>
                        <Badge doc={d} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{pretty(d.document_type)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{d.deceased_name} · {fmtDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Detail */}
              {doc && (
                <section className="space-y-4 min-w-0">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{doc.institution}</p>
                        <h2 className="text-lg font-bold text-gray-900">{pretty(doc.document_type)}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Estate of {doc.deceased_name} ·{" "}
                          <Link to={`/cases/${doc.case_id}`} className="text-blue-600 hover:underline">Open case</Link>
                        </p>
                      </div>
                      <Badge doc={doc} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {doc.sent_at ? (
                        <button disabled={busy} onClick={() => patch({ sent: false }, "Marked as not sent.")} className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
                          Mark as not sent
                        </button>
                      ) : (
                        <button disabled={busy || doc.placeholders_remaining.length > 0} onClick={() => patch({ sent: true }, "Marked as sent.")} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-3 py-2">
                          Mark as sent
                        </button>
                      )}
                      <button onClick={copy} className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700">Copy text</button>
                      <button onClick={download} className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700">Download .txt</button>
                      <button onClick={printPdf} className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700">Print / save as PDF</button>
                    </div>
                    {doc.placeholders_remaining.length > 0 && !doc.sent_at && (
                      <p className="text-[11px] text-gray-500 mt-2">Fill in all blanks below to enable "Mark as sent".</p>
                    )}
                    {msg && <p className="text-xs text-gray-600 mt-2" role="status">{msg}</p>}
                  </div>

                  {doc.placeholders_remaining.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Details to fill in ({doc.placeholders_remaining.length})
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-1 mb-3">Add what you know; it replaces the highlighted blanks in the letter.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {doc.placeholders_remaining.map((p) => (
                          <label key={p} className="block">
                            <span className="text-[11px] font-medium text-gray-600">{placeholderName(p)}</span>
                            <input
                              value={values[p] || ""}
                              onChange={(e) => setValues({ ...values, [p]: e.target.value })}
                              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
                            />
                          </label>
                        ))}
                      </div>
                      <button disabled={busy} onClick={applyValues} className="mt-3 text-xs font-bold bg-gray-900 hover:bg-black disabled:opacity-40 text-white rounded-lg px-3 py-2">
                        Save details
                      </button>
                    </div>
                  )}

                  <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-4">Letter preview</p>
                    <Letter content={doc.content} />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    GriefWallet drafts letters only. Nothing is sent to any institution on your behalf. Check every detail before you send.
                  </p>
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
