import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/clerk-react";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateCase from "./pages/CreateCase";
import CaseDetail from "./pages/CaseDetail";
import Documents from "./pages/Documents";
import Timeline from "./pages/Timeline";

function RootRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
  return isSignedIn
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
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
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/cases/new" element={
          <ProtectedRoute><CreateCase /></ProtectedRoute>
        } />
        <Route path="/cases/:id" element={
          <ProtectedRoute><CaseDetail /></ProtectedRoute>
        } />
        <Route path="/cases/:id/documents" element={
          <ProtectedRoute><Documents /></ProtectedRoute>
        } />
        <Route path="/cases/:id/timeline" element={
          <ProtectedRoute><Timeline /></ProtectedRoute>
        } />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}