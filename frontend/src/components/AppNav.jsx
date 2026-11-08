import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";

const Svg = ({ children, className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export default function AppNav({ active }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const name = user?.fullName || user?.firstName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
  const initial = (user?.firstName || name || "U").charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };
  const item = "w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2";

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 sm:gap-6 sticky top-0 z-40 shadow-sm">
      <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-base tracking-tight flex-shrink-0">
        <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
          <Svg className="w-3.5 h-3.5">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          </Svg>
        </span>
        GriefWallet
      </Link>

      <div className="hidden sm:flex gap-6 text-sm flex-1 ml-2">
        <Link
          to="/dashboard"
          className={`pb-0.5 font-medium transition-all ${
            active === "dashboard" ? "text-gray-900 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Dashboard
        </Link>
      </div>
      <div className="flex-1 sm:hidden" />

      <button
        onClick={() => navigate("/cases/new")}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        <Svg className="w-3.5 h-3.5">
          <path d="M5 12h14M12 5v14" />
        </Svg>
        <span className="hidden sm:inline">New Recovery</span>
      </button>

      <div className="relative flex-shrink-0" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white text-xs font-bold"
        >
          {initial}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="px-3 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
              {email && <p className="text-xs text-gray-500 truncate">{email}</p>}
            </div>
            <div className="py-1">
              <button role="menuitem" className={item} onClick={() => go("/dashboard")}>My cases</button>
              <button role="menuitem" className={item} onClick={() => go("/cases/new")}>New recovery</button>
              <button role="menuitem" className={item} onClick={() => go("/account")}>Account and data</button>
              <button role="menuitem" className={item} onClick={() => go("/privacy")}>Privacy policy</button>
            </div>
            <div className="py-1 border-t border-gray-100">
              <button role="menuitem" className={`${item} !text-red-600`} onClick={() => signOut(() => navigate("/login"))}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
