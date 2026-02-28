import Link from "next/link";

const COMPANY_EIK = "206373314";
const COMPANY_REGISTRY_URL = "https://papagal.bg/eik/206373314/c3d6";
const CONTACT_EMAIL = "privacy@zeroshots.app";

export default function TermsPage() {
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
          <span className="text-lg font-bold text-white">Terms of Use</span>
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 font-body">
        <p className="mb-10 text-sm text-slate-500 italic">
          Last updated: February 2026
        </p>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            1. Operator
          </h2>
          <p className="mb-2 text-slate-300 leading-relaxed">
            zeroshots.app is operated by a company registered in Bulgaria with
            EIK <strong className="text-white">{COMPANY_EIK}</strong>. Full
            company name and registered address:
          </p>
          <a
            href={COMPANY_REGISTRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
          >
            papagal.bg/eik/{COMPANY_EIK}/c3d6
          </a>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            2. Use of the website
          </h2>
          <p className="mb-2 text-slate-300 leading-relaxed">
            By using this website you agree to use it only for lawful purposes
            and not to attempt to disrupt, abuse, or gain unauthorised access to
            our systems or data.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-white">
            3. Contact
          </h2>
          <p className="text-slate-300 leading-relaxed">
            For questions about these terms:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
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
