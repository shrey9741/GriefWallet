import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      // Small delay to let Clerk fully settle after OAuth
      const timer = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (!isLoaded || !ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-gray-500 text-sm">Loading GriefWallet...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/login" replace />;
  return children;
}