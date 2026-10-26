import { Link } from "react-router-dom";

const UPDATED = "27 October 2026";
const CONTACT = "shreykr03@gmail.com";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">
            GriefWallet
          </Link>
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 text-slate-700 leading-relaxed">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: {UPDATED}</p>

        <p className="mb-6">
          GriefWallet helps families organise the administrative work that follows the loss of
          a loved one, such as tracking tasks, drafting documents and keeping a timeline. We
          know this information is sensitive, so we collect as little as we can and never sell
          it.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">
          Information we collect
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <b>Account details:</b> your name and email address, and your Google profile name
            and email if you choose to sign in with Google. We never receive your Google
            password.
          </li>
          <li>
            <b>Case information you enter:</b> details about a case, tasks, documents and
            timeline events that you add yourself.
          </li>
          <li>
            <b>Basic technical data:</b> information needed to keep you signed in and secure,
            such as session cookies.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">
          How we use your information
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To create your account and keep you signed in.</li>
          <li>To store your cases and show them back to you.</li>
          <li>
            To generate suggestions and draft documents with AI. Case text you submit for
            this purpose is sent to our AI provider only to produce your result.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">
          Services we rely on
        </h2>
        <p>
          Authentication is handled by Clerk. Our site is hosted on Vercel, and AI features
          use a third-party language-model provider. These services process data only to
          provide their function to us.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">
          Sharing and selling
        </h2>
        <p>
          We do not sell your data and we do not use it for advertising. We share it only
          with the services above, or if required by law.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">
          Your choices
        </h2>
        <p>
          You can ask us to view, correct or delete your account and case data at any time by
          emailing us. Deleting your account removes your cases from our systems.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">Security</h2>
        <p>
          Data is transmitted over HTTPS and access to your cases is limited to your signed-in
          account. No online service can promise perfect security, but we work to protect your
          information.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8 mb-2">Contact</h2>
        <p>
          Questions or requests:{" "}
          <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
        </p>

        <p className="mt-10 text-xs text-slate-400">
          GriefWallet is a student project and does not provide legal advice.
        </p>
      </main>
    </div>
  );
}
