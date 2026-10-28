// App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom"; // no BrowserRouter import
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/clerk-react";
import { setTokenGetter } from "./api";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Dashboard from "./pages/Dashboard";
import CreateCase from "./pages/CreateCase";
import CaseDetail from "./pages/CaseDetail";
import Documents from "./pages/Documents";
import Timeline from "./pages/Timeline";

export default function App() {
  const { getToken } = useAuth();

  // Give the API client a way to fetch the current Clerk token
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/sso-callback"
        element={
          <AuthenticateWithRedirectCallback
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
          />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <ProtectedRoute>
            <CreateCase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute>
            <CaseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id/timeline"
        element={
          <ProtectedRoute>
            <Timeline />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
