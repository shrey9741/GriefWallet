import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import api from "../api";
import AppNav from "../components/AppNav";

export default function Account() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const name = user?.fullName || user?.firstName || "Your account";
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.delete("/auth/me");
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete your account. Please try again.");
      setBusy(false);
    }
  };

  const leave = async () => {
    try {
      await signOut(() => navigate("/login"));
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Account and data</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Manage your sign-in and your information.</p>

        {result ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">Your data has been deleted</h2>
            <p className="text-sm text-gray-600 mt-2">
              All your cases, tasks and letters have been removed from GriefWallet.
              {result.auth_account_deleted === false &&
                " Your sign-in account could not be removed automatically. Email us and we will remove it for you."}
            </p>
            <button onClick={leave} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2 rounded-lg">
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 text-sm">Signed in as</h2>
              <p className="text-sm text-gray-700 mt-2">{name}</p>
              {email && <p className="text-xs text-gray-500">{email}</p>}
              <button
                onClick={() => openUserProfile?.()}
                className="mt-4 text-xs border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700 font-medium"
              >
                Manage sign-in details
              </button>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 text-sm">Your information</h2>
              <p className="text-sm text-gray-600 mt-2">
                GriefWallet stores your cases, tasks and drafted letters so you can come back to them. Death certificate images you
                upload are read once and are not stored. See the{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">privacy policy</a>.
              </p>
            </section>

            <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-red-700 text-sm">Delete my account</h2>
              <p className="text-sm text-gray-600 mt-2">
                This permanently deletes your account and every case, task and letter in it. It cannot be undone.
              </p>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="mt-4 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 font-medium"
                >
                  Delete my account
                </button>
              ) : (
                <div className="mt-4">
                  <label className="text-xs text-gray-600 block mb-1">
                    Type <b>DELETE</b> to confirm
                  </label>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 w-40"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={deleteAccount}
                      disabled={typed !== "DELETE" || busy}
                      className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg px-3 py-2 font-bold"
                    >
                      {busy ? "Deleting..." : "Permanently delete"}
                    </button>
                    <button
                      onClick={() => { setConfirming(false); setTyped(""); setError(""); }}
                      className="text-xs border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
