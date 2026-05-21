import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignIn, useSignUp } from "@clerk/clerk-react";

export default function Login() {
  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // ── Email/Password Login ──────────────────────────────────────────
  const handleLogin = async () => {
    if (!signInLoaded) return;
    try {
      const result = await signIn.create({
        identifier: form.email,
        password: form.password,
      });
      if (result.status === "complete") {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Login failed. Check your credentials.");
    }
  };

  // ── Email/Password Register ───────────────────────────────────────

  

  const handleRegister = async () => {
    if (!signUpLoaded) return;
    try {
      const nameParts = form.full_name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const result = await signUp.create({
        emailAddress: form.email,
        password: form.password,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        navigate("/dashboard");
      } else {
        // Email verification needed
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setError("Check your email for a verification code.");
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || "Registration failed. Try again.");
    }
  };

  // ── Google OAuth ──────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!signInLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      setError("Google sign-in failed. Try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-950">

      {/* Left Side — Image + Testimonial */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative flex-col justify-end p-10">
        <div className="absolute inset-0 z-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTROQNgzcaQVVs-Am_H9OzTxwQKFvlgxv33fdmpxkO1mhSmySSqK2hkKws_NqT99QfG1URKINd4eaEhie_uXddWR_RQJrjiZ4ce0LWDZrSM3SUpslkhfmLd7FQht8pCl7d49Cv8yGh0h04Xd_4QAEqKp-7piLyzawKg5KJuh9X5h_rQVyye0WZVk23ZRQNyEXiABtTFucf3vwkqbUE42kK6EkggzF5ZTKGKDuw1LouJXKs4Ln0sW1S7T6iITCQ9GXTDcrbLRG3209J"
            alt="Professional workspace"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-xl">
          <blockquote className="mb-4">
            <p className="text-2xl font-semibold text-white italic leading-tight">
              "GriefWallet gave me the peace of mind I desperately needed.
              Managing my mother's estate felt like an impossible mountain
              until I had this clear, secure roadmap."
            </p>
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-purple-400 overflow-hidden">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3QGUx5m01NRMGvZawQ4mjlqsDfW4ylWkeX-KsdwqvXXYhmJ4gVBUbt9_Z93-QOjJhNihStGxsV9sVs_ey3RAVvlX2FP4gwmn2nPP9_5hg_V7B8XoOJnuMS1WyLzJ37JF47LR-JaYJDdzTtvUOt-vvIuWiQIxCCrMY7bKjmekhGbEkK56Cdx0hUzpFtAWeXGVuOghBKWBBpOu0N2YS4BuhsvS6A2FPfKujGLrJxO5BtJBNdKeyoVTCpJQqHiCr0h-lvtj4x4uUtko4"
                alt="Sarah J."
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-300">Sarah J.</p>
              <p className="text-xs text-gray-400">Executor & Guardian</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side — Form */}
      <main className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center bg-white dark:bg-gray-950 px-6 md:px-12 py-10 min-h-screen overflow-y-auto">
        <div className="max-w-md mx-auto w-full">

          {/* Brand */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              GriefWallet
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Financial guardianship with security and empathy.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 ${
                tab === "login"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`pb-2 px-1 text-sm font-semibold transition-all border-b-2 ${
                tab === "register"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {tab === "login" ? "Welcome Back" : "Get Started"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tab === "login"
                ? "Please enter your credentials to access the guardian dashboard."
                : "Create your account to start managing recovery cases."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name — register only */}
            {tab === "register" && (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Sunita Sharma"
                  required
                  className="h-12 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@organization.com"
                required
                className="h-12 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Password
                </label>
                {tab === "login" && (
                  <a href="#" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 px-4 pr-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {tab === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <>🔒 {tab === "login" ? "Secure Sign In" : "Create Account"}</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white dark:bg-gray-950 px-4 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Button */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleGoogle}
              type="button"
              className="flex items-center justify-center gap-2 h-12 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYuAws7ZfqS6JIMVt2ZGSepb4vZ_ezRhxeQLy9QIYvKnhtT8_qSdh1Fl8DDejjevx43VFKfhMEOnkcFas7GirbLN5lIM5BJ1Xn8BpGPCvBbBNpzkvDyS6tEDwv_vlWlBhQVz0ytinnI10c6OJDYJt8lS3bwK6FG7IgIWQCBumdQtPvrUnqL8oPGucEzmxTqjjsHcP1-KtW789Ol75O8WUv4aS-9d4kx_RNae2iz2x_YO_7oK91eiJdLdDGYUvHlcOlHW54FroAKWvH"
                alt="Google"
                className="w-4 h-4"
              />
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-12 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              🔑 Passkey
            </button>
          </div>

          {/* Switch tab */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
              >
                {tab === "login" ? "Create an Account" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex justify-center gap-6 text-xs text-gray-400">
              <a href="#" className="hover:text-purple-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Support</a>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              © 2024 GriefWallet Financial Guardianship Services
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}