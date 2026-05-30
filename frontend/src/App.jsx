// App.jsx
import { Routes, Route, Navigate } from "react-router-dom"; // no BrowserRouter import
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateCase from "./pages/CreateCase";
import CaseDetail from "./pages/CaseDetail";
import Documents from "./pages/Documents";
import Timeline from "./pages/Timeline";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
