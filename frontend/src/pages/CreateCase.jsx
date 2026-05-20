import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import api from "../api";

const INSTITUTIONS = [
  { id: "SBI", name: "SBI", sub: "STATE BANK OF INDIA", icon: "🏦" },
  { id: "HDFC", name: "HDFC", sub: "HDFC BANK LTD.", icon: "🏛" },
  { id: "LIC", name: "LIC", sub: "LIFE INSURANCE CORP.", icon: "🛡" },
  { id: "EPFO", name: "EPFO", sub: "PROVIDENT FUND", icon: "💼" },
  { id: "NPS", name: "NPS", sub: "NATIONAL PENSION", icon: "📊" },
  { id: "MUTUAL FUNDS", name: "Mutual Funds", sub: "INVESTMENTS", icon: "📈" },
];

const RELATIONS = [
  "Select Relationship",
  "Spouse",
  "Son",
  "Daughter",
  "Parent",
  "Sibling",
  "Other",
];

const Toggle = ({ checked, onChange, label, sub }) => (
  <div className="flex items-center justify-between">
    <div>
      {label && <p className="text-xs font-medium text-gray-700">{label}</p>}
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  </div>
);

export default function CreateCase() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    deceased_name: "",
    date_of_death: "",
    pan_available: false,
    phone: "",
    institutions: [],
    nominee_name: "",
    nominee_relation: "",
    multiple_nominees: false,
    will_exists: false,
    will_disputed: false,
    docs_available: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(1);

  const toggleInstitution = (id) => {
    setForm((prev) => ({
      ...prev,
      institutions: prev.institutions.includes(id)
        ? prev.institutions.filter((i) => i !== id)
        : [...prev.institutions, id],
    }));
  };

  const toggleDoc = (doc) => {
    setForm((prev) => ({
      ...prev,
      docs_available: prev.docs_available.includes(doc)
        ? prev.docs_available.filter((d) => d !== doc)
        : [...prev.docs_available, doc],
    }));
  };

  const selectAll = () => {
    setForm((prev) => ({
      ...prev,
      institutions: INSTITUTIONS.map((i) => i.id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deceased_name) return setError("Please enter the deceased person's name.");
    if (!form.date_of_death) return setError("Please enter the date of death.");
    if (form.institutions.length === 0) return setError("Please select at least one institution.");
    if (!form.nominee_name) return setError("Please enter the nominee name.");
    if (!form.nominee_relation || form.nominee_relation === "Select Relationship") return setError("Please select nominee relation.");

    setLoading(true);
    setError("");

    try {
      const token = await user?.getToken?.();
      if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Step 1 — create case
      const caseRes = await api.post("/cases/create", {
        deceased_name: form.deceased_name,
        date_of_death: form.date_of_death,
        pan_available: form.pan_available,
        phone: form.phone || null,
        institutions: form.institutions,
        nominee_name: form.nominee_name,
        nominee_relation: form.nominee_relation.toLowerCase(),
        multiple_nominees: form.multiple_nominees,
        will_exists: form.will_exists,
        will_disputed: form.will_disputed,
        docs_available: form.docs_available,
      });

      const caseId = caseRes.data.case_id;

      // Step 2 — generate AI checklist
      await api.post("/ai/generate-checklist", { case_id: caseId });

      // Redirect to case detail
      navigate(`/cases/${caseId}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-lg font-semibold text-gray-800">AI is generating your recovery plan...</p>
          <p className="text-sm text-gray-500">This may take 15–20 seconds</p>
        </div>
      )}

      {/* Navbar */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6 sticky top-0 z-40 shadow-sm">
        <span className="text-blue-600 font-bold text-base tracking-tight flex-shrink-0">
          GriefWallet
        </span>
        <div className="flex gap-6 text-sm flex-1 ml-4">
          {[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Cases", path: "/cases/new", active: true },
            { label: "Documents", path: "#" },
            { label: "Timeline", path: "#" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`pb-0.5 font-medium transition-all ${
                item.active
                  ? "text-gray-900 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
          New Asset Recovery
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">🌙</button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">🔔</button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
          {user?.firstName?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {[
            { num: 1, label: "Step 1", sub: "Deceased Information" },
            { num: 2, label: "Step 2", sub: "Institutions" },
            { num: 3, label: "Step 3", sub: "Nominee Details" },
          ].map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setActiveStep(step.num)}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  activeStep >= step.num
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}>
                  {step.num}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${activeStep >= step.num ? "text-blue-600" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{step.sub}</p>
                </div>
              </div>
              {idx < 2 && (
                <div className={`w-16 h-px mx-3 ${activeStep > step.num ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-6">

            {/* Left — Form */}
            <div className="col-span-2 space-y-6">

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Step 1 — Deceased Info */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Step 1: Deceased Information
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Legal Name of Deceased
                    </label>
                    <input
                      type="text"
                      value={form.deceased_name}
                      onChange={(e) => setForm({ ...form, deceased_name: e.target.value })}
                      placeholder="As per Death Certificate"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Date of Death
                    </label>
                    <input
                      type="date"
                      value={form.date_of_death}
                      onChange={(e) => setForm({ ...form, date_of_death: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="border border-gray-100 rounded-lg p-3">
                  <Toggle
                    checked={form.pan_available}
                    onChange={(v) => setForm({ ...form, pan_available: v })}
                    label="PAN Card Available?"
                    sub="This helps in faster asset discovery across financial institutions."
                  />
                </div>
              </div>

              {/* Step 2 — Institutions */}

              


              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-gray-900">
                    Step 2: Financial Institutions
                  </h2>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Select the institutions where the deceased held accounts or investments.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {INSTITUTIONS.map((inst) => {
                    const selected = form.institutions.includes(inst.id);
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => toggleInstitution(inst.id)}
                        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                            ✓
                          </span>
                        )}
                        <span className="text-2xl">{inst.icon}</span>
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-800">{inst.name}</p>
                          <p className="text-[9px] text-gray-400 leading-tight">{inst.sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3 — Nominee */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Step 3: Nominee & Documentation
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Primary Nominee Name
                    </label>
                    <input
                      type="text"
                      value={form.nominee_name}
                      onChange={(e) => setForm({ ...form, nominee_name: e.target.value })}
                      placeholder="Full name as per ID"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Relationship to Deceased
                    </label>
                    <select
                      value={form.nominee_relation}
                      onChange={(e) => setForm({ ...form, nominee_relation: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                    >
                      {RELATIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { key: "multiple_nominees", label: "Multiple nominees" },
                    { key: "will_exists", label: "Will exists" },
                    { key: "will_disputed", label: "Will disputed" },
                  ].map((item) => (
                    <div key={item.key} className="border border-gray-100 rounded-lg p-3">
                      <Toggle
                        checked={form[item.key]}
                        onChange={(v) => setForm({ ...form, [item.key]: v })}
                        label={item.label}
                      />
                    </div>
                  ))}
                </div>

                {/* Available docs */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Available Documents</p>
                  <div className="flex gap-4">
                    {["death_certificate", "aadhaar", "pan"].map((doc) => (
                      <label key={doc} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.docs_available.includes(doc)}
                          onChange={() => toggleDoc(doc)}
                          className="w-3.5 h-3.5 accent-blue-600"
                        />
                        <span className="text-xs text-gray-600 capitalize">
                          {doc === "death_certificate" ? "Death Certificate" : doc.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* File upload */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Upload Death Certificate</p>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-all">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm text-gray-500">Drag and drop file or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPEG, or PNG (Max 5MB)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="space-y-4">

              {/* Why this matters */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 text-base">ℹ️</span>
                  <span className="text-xs font-bold text-blue-700">Why this information matters</span>
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  The documentation you provide is verified against institutional records to streamline the legal transfer of assets. Ensuring accuracy here prevents delays in the 4-6 week processing window.
                </p>
              </div>

              {/* Case Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Case Summary Preview
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Case ID</span>
                    <span className="text-xs font-mono font-semibold text-gray-700">GW-{Math.floor(Math.random() * 9000 + 1000)}-A</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Est. Recovery</span>
                    <span className="text-xs font-semibold text-blue-600">Calculating...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Documents Verified</span>
                    <span className="text-xs font-semibold text-red-500">
                      {form.docs_available.length} / 4 Required
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Institutions</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {form.institutions.length} selected
                    </span>
                  </div>
                </div>
              </div>

              {/* Need Help */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
                <p className="text-xs font-semibold text-blue-600 mb-1">Need Professional Help?</p>
                <p className="text-xs text-gray-500 mb-3">
                  Our legal guardians can assist with complex paperwork.
                </p>
                <button
                  type="button"
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  Chat with Advisor
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-all"
            >
              ← Back to Dashboard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-8 py-2.5 rounded-lg transition-all"
            >
              Generate Recovery Plan
              <span>⚙️</span>
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8 px-6 py-6 flex items-center justify-between bg-white">
        <span className="text-blue-600 font-bold text-sm">GriefWallet</span>
        <div className="flex gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600">Privacy Policy</a>
          <a href="#" className="hover:text-gray-600">Terms of Service</a>
          <a href="#" className="hover:text-gray-600">Security Standards</a>
          <a href="#" className="hover:text-gray-600">Support</a>
        </div>
        <span className="text-xs text-gray-400">© 2024 GriefWallet Financial Guardianship Services</span>
      </footer>
    </div>
  );
}