import Link from "next/link";

const COMPANY_EIK = "206373314";
const COMPANY_REGISTRY_URL = "https://papagal.bg/eik/206373314/c3d6";
const CONTACT_EMAIL = "privacy@zeroshots.app";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-dark">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-background-dark/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 hover:text-primary transition-colors"
          >
            ← zeroshots.app
          </Link>
          <span className="text-lg font-bold text-white">Privacy Policy</span>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 font-body">
        <p className="mb-10 text-sm text-slate-500 italic">
          Last updated: February 2026
        </p>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            1. Operator & contact
          </h2>
          <p className="mb-2 text-slate-300 leading-relaxed">
            zeroshots.app is operated by a company registered in Bulgaria with
            EIK (Unified Identification Code){" "}
            <strong className="text-white">{COMPANY_EIK}</strong>.
          </p>
          <p className="mb-2 text-slate-300 leading-relaxed">
            For the full company name and registered address, see the official
            registry entry:
          </p>
          <a
            href={COMPANY_REGISTRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            papagal.bg/eik/{COMPANY_EIK}/c3d6
          </a>
          <p className="mt-4 text-slate-300 leading-relaxed">
            For privacy questions, data requests, or complaints:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            . We respond within 30 days.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            2. What we collect on the website
          </h2>
          <p className="mb-2 text-slate-300 leading-relaxed">
            If you join the waitlist, we collect your email address and any
            optional fields you submit (e.g. device type). We use this only to
            contact you about zeroshots.app and to manage the waitlist. We do
            not sell your data.
          </p>
          <p className="text-slate-300 leading-relaxed">
            We may use cookies or similar tech for basic analytics (e.g.
            visit count). You can control cookies via your browser settings.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            3. Your rights (GDPR)
          </h2>
          <p className="mb-2 text-slate-300 leading-relaxed">
            You have the right to access, correct, delete, or export your data,
            and to withdraw consent or lodge a complaint with a supervisory
            authority. To exercise these rights, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            4. Changes
          </h2>
          <p className="text-slate-300 leading-relaxed">
            We may update this policy. The &quot;Last updated&quot; date at the top will
            change. Continued use of the site after changes means you accept the
            updated policy.
          </p>
        </section>

        <p className="pt-6 text-slate-500 text-sm">
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
