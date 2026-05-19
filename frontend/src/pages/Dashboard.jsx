import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import api from "../api";

const StatCard = ({ label, value, icon, badge, badgeColor }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-base">
        {icon}
      </div>
      {badge && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </div>
    <div className="text-3xl font-bold text-gray-900 tracking-tight">
      {value}
    </div>
    <div className="text-xs text-gray-400 uppercase tracking-widest font-medium">
      {label}
    </div>
  </div>
);

const CaseCard = ({ case: c, onOpen }) => {
  const progress = c.progress || 0;
  const institutions = c.institutions || [];
  const tasks = c.tasks || [];
  const doneTasks = tasks.filter((t) => t.status === "done");
  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "blocked",
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {c.deceased_name?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold text-sm">
              {c.deceased_name}
            </h3>
            <div className="flex gap-1">
              {institutions.slice(0, 2).map((inst) => (
                <span
                  key={inst}
                  className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium"
                >
                  {inst}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            GW-{c.id?.slice(0, 8).toUpperCase()}
          </p>

          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-gray-500 font-medium">
                Recovery Progress
              </span>
              <span className="text-[11px] font-bold text-blue-600">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {doneTasks.slice(0, 1).map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-green-600"
              >
                <span className="w-3.5 h-3.5 bg-green-100 rounded-full flex items-center justify-center text-[8px]">
                  ✓
                </span>
                {t.title?.slice(0, 35)}
                {t.title?.length > 35 ? "..." : ""}
              </div>
            ))}
            {pendingTasks.slice(0, 1).map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-orange-500"
              >
                <span className="w-3.5 h-3.5 bg-orange-100 rounded-full flex items-center justify-center text-[8px]">
                  ○
                </span>
                {t.title?.slice(0, 35)}
                {t.title?.length > 35 ? "..." : ""}
              </div>
            ))}
            {doneTasks.length === 0 && pendingTasks.length === 0 && (
              <div className="text-[11px] text-gray-400">
                No tasks yet — generate checklist
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => onOpen(c.id)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition-all"
            >
              Open Dashboard
            </button>
            <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all text-sm">
              ⋮
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    active_cases: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    documents_generated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const token = await user?.getToken?.();
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      const [casesRes, statsRes] = await Promise.all([
        api.get("/cases"),
        api.get("/cases/dashboard-stats"),
      ]);
      setCases(casesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const firstName =
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Guardian";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6 sticky top-0 z-50 shadow-sm">
        <span className="text-blue-600 font-bold text-base tracking-tight flex-shrink-0">
          GriefWallet
        </span>
        <div className="flex gap-6 text-sm flex-1 justify-start ml-4">
          {[
            { label: "Dashboard", path: "/dashboard", active: true },
            { label: "Cases", path: "/cases/new" },
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
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => navigate("/cases/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
          >
            New Asset Recovery
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            🔍
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            🔔
          </button>
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            onClick={() => signOut(() => navigate("/login"))}
            title="Click to logout"
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left + Center */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome */}
            
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, <span className="text-blue-600">{firstName}</span>
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {stats.pending_tasks > 0
                  ? `You have ${stats.pending_tasks} pending tasks requiring your attention today. Everything is set for ${cases[0]?.deceased_name || "your"}'s recovery journey.`
                  : "All tasks are up to date. Great work!"}
              </p>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Active Cases"
                value={String(stats.active_cases).padStart(2, "0")}
                icon="📁"
                badge={stats.active_cases > 0 ? `+${stats.active_cases}` : null}
                badgeColor="bg-blue-100 text-blue-600"
              />
              <StatCard
                label="Completed"
                value={String(stats.completed_tasks).padStart(3, "0")}
                icon="✅"
                badge={
                  stats.completed_tasks > 0
                    ? `${Math.round((stats.completed_tasks / Math.max(stats.completed_tasks + stats.pending_tasks, 1)) * 100)}%`
                    : null
                }
                badgeColor="bg-green-100 text-green-600"
              />
              <StatCard
                label="Pending Inst."
                value={String(stats.pending_tasks).padStart(2, "0")}
                icon="⏳"
                badge={stats.pending_tasks > 0 ? "Action" : null}
                badgeColor="bg-red-100 text-red-500"
              />
              <StatCard
                label="Docs Gen"
                value={String(stats.documents_generated).padStart(2, "0")}
                icon="📄"
                badge={
                  stats.documents_generated > 0
                    ? `${stats.documents_generated}+`
                    : null
                }
                badgeColor="bg-purple-100 text-purple-600"
              />
            </div>

            {/* Cases */}

            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  Active Recovery Journeys
                </h2>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View All →
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                </div>
              ) : cases.length === 0 ? (
                <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center shadow-sm">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-gray-900 font-semibold mb-1">
                    No cases yet
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Create your first recovery case to get started
                  </p>
                  <button
                    onClick={() => navigate("/cases/new")}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all"
                  >
                    + Create First Case
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cases.map((c) => (
                    <CaseCard
                      key={c.id}
                      case={c}
                      onOpen={(id) => navigate(`/cases/${id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recent Documents */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">
                  Recent Document Activity
                </h2>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View Archive →
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
                {cases.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    No documents generated yet
                  </div>
                ) : (
                  cases.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-all"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500 text-sm flex-shrink-0">
                        📄
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate">
                          Recovery_Plan_{c.deceased_name?.replace(/\s+/g, "_")}
                          .pdf
                        </p>
                        <p className="text-xs text-gray-400">
                          Generated{" "}
                          {c.updated_at
                            ? new Date(c.updated_at).toLocaleDateString()
                            : "—"}{" "}
                          · 1.1 MB
                        </p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 transition-all text-lg">
                        ⬇
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* System Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs">
                  🛡
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  System Status
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-semibold">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Secure & Active
              </span>
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">✨</span>
                <span className="text-white font-bold text-sm">
                  AI Guardian Insights
                </span>
              </div>
              <p className="text-blue-100 text-xs leading-relaxed mb-4">
                {cases.length > 0
                  ? `Our AI detected ${stats.pending_tasks} pending tasks linked to ${cases[0]?.deceased_name}'s PAN records across ${cases[0]?.institutions?.length || 0} institution portals.`
                  : "Create your first case to receive AI-powered insights and recovery recommendations."}
              </p>
              {cases.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <span>⚡</span>
                    <span>
                      Verified claim status: {stats.completed_tasks}/
                      {stats.completed_tasks + stats.pending_tasks}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-200">
                    <span>📅</span>
                    <span>Predicted timeline: 14 days</span>
                  </div>
                </div>
              )}
              <button
                onClick={() =>
                  cases.length > 0
                    ? navigate(`/cases/${cases[0].id}`)
                    : navigate("/cases/new")
                }
                className="w-full bg-white text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-50 transition-all"
              >
                {cases.length > 0
                  ? "Review Potential Assets"
                  : "Start Recovery Journey"}
              </button>
            </div>

            {/* Quick Tools */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
                Quick Tools
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "⬆️", label: "Upload" },
                  {
                    icon: "✏️",
                    label: "Draft",
                    action: () => navigate("/cases/new"),
                  },
                  { icon: "🔗", label: "Share" },
                  { icon: "❓", label: "Help" },
                ].map((tool) => (
                  <button
                    key={tool.label}
                    onClick={tool.action}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-all border border-gray-100"
                  >
                    <span className="text-xl">{tool.icon}</span>
                    <span className="text-xs text-gray-500 font-medium">
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 px-6 py-6 flex items-center justify-between bg-white">
        <span className="text-blue-600 font-bold text-sm">GriefWallet</span>
        <div className="flex gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-gray-600">
            Terms of Service
          </a>
          <a href="#" className="hover:text-gray-600">
            Security Standards
          </a>
          <a href="#" className="hover:text-gray-600">
            Support
          </a>
        </div>
        <span className="text-xs text-gray-400">
          © 2026 GriefWallet Financial Guardianship Services
        </span>
      </footer>
    </div>
  );
}
