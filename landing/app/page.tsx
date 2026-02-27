"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company: "", budget: "" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't add you. Please try again.");
      }
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* Background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background-dark/80 border-b border-slate-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              zeroshots.app
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              className="text-sm font-medium text-slate-300 hover:text-primary transition-colors"
              href="#how-it-works"
            >
              How it Works
            </a>
            <a
              className="text-sm font-medium text-slate-300 hover:text-primary transition-colors"
              href="#features"
            >
              Features
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="#cta"
              className="hidden sm:flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-bold text-background-dark hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            >
              Join Waitlist
            </a>
            <button
              type="button"
              className="md:hidden p-2 text-slate-300"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      <main className="z-10 flex-1">
        {/* Hero */}
        <section className="relative px-6 py-16 lg:px-8 lg:py-24 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Waitlist Open v1.0
              </div>
              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl md:text-7xl">
                A cleaner camera roll,{" "}
                <span className="text-primary">one swipe</span> at a time.
              </h1>
              <p className="text-lg leading-relaxed text-slate-400 font-body">
                Sort your screenshot chaos with &quot;The Stack&quot; and manage your
                library with &quot;The Vault&quot;. Stop scrolling through thousands of
                screenshots. Start organizing with intention.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <a
                  href="#cta"
                  className="flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-background-dark hover:bg-primary/90 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all"
                >
                  Get Early Access
                </a>
              </div>
            </div>

            {/* Phone mockups with real screenshots */}
            <div className="relative w-full h-[600px] flex items-center justify-center">
              <div className="relative z-20 flex items-center justify-center w-full h-full">
                {/* Right phone - Session Recap */}
                <div className="absolute right-0 top-20 w-[280px] h-[580px] bg-background-dark rounded-[3rem] border-8 border-slate-800 shadow-2xl transform rotate-6 scale-90 z-10 overflow-hidden opacity-90">
                  <div className="w-full h-full relative">
                    <Image
                      src="/images/recap.png"
                      alt="Session Recap - Storage Reclaimed 142 MB"
                      fill
                      className="object-cover object-top"
                      sizes="280px"
                    />
                  </div>
                </div>
                {/* Left phone - The Stack (main) */}
                <div className="absolute left-4 top-10 w-[300px] h-[600px] bg-background-dark rounded-[3rem] border-8 border-slate-800 mockup-shadow transform -rotate-3 z-30 overflow-hidden">
                  <div className="w-full h-full relative">
                    <Image
                      src="/images/stack.png"
                      alt="The Stack - swipe to triage screenshots"
                      fill
                      className="object-cover object-top"
                      sizes="300px"
                      priority
                    />
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[80px] z-0" />
            </div>
          </div>
        </section>

        {/* The Problem - Before / After */}
        <section className="py-20 bg-[#15232b] border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">
                The Problem
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white">
                From chaos to clarity
              </h3>
              <p className="mt-4 text-slate-400 max-w-2xl mx-auto font-body">
                See how AI transforms your cluttered camera roll into a clean
                start in seconds.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div className="group relative flex justify-center">
                <div className="absolute top-0 right-0 z-10 bg-rose-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm transform translate-x-2 -translate-y-2">
                  BEFORE
                </div>
                <div className="relative w-[300px] h-[600px] bg-background-dark rounded-[3rem] border-4 border-slate-700 shadow-xl overflow-hidden">
                  <div className="h-12 w-full bg-background-dark flex items-center justify-between px-6 pt-2">
                    <span className="text-white text-xs font-bold">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-slate-800" />
                      <div className="w-4 h-4 rounded-full bg-slate-800" />
                    </div>
                  </div>
                  <div className="px-6 py-2 flex justify-between items-center bg-background-dark">
                    <span className="material-symbols-outlined text-slate-400">
                      arrow_back_ios
                    </span>
                    <span className="text-white font-bold text-lg tracking-wider">
                      LIBRARY
                    </span>
                    <span className="material-symbols-outlined text-slate-400">
                      more_horiz
                    </span>
                  </div>
                  <div className="flex gap-2 px-4 py-4 overflow-x-hidden whitespace-nowrap">
                    <div className="px-4 py-1.5 rounded-full bg-primary text-background-dark font-bold text-xs">
                      ALL ITEMS
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 font-bold text-xs">
                      SCREENSHOTS
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 px-1 overflow-hidden opacity-60">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-slate-800 rounded-sm"
                      />
                    ))}
                  </div>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%]">
                    <div className="w-full py-3 bg-rose-500 rounded-full flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                      <span className="material-symbols-outlined text-white text-lg">
                        delete
                      </span>
                      <span className="text-white font-bold text-sm">
                        DELETE (842)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h4 className="text-xl font-bold text-white mb-2">
                    Clutter Chaos
                  </h4>
                  <p className="text-slate-400 text-sm font-body max-w-xs mx-auto">
                    Thousands of unorganized screenshots taking up space.
                    Impossible to find what you need.
                  </p>
                </div>
              </div>

              <div className="group relative flex justify-center">
                <div className="absolute top-0 right-0 z-10 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm transform translate-x-2 -translate-y-2">
                  AFTER
                </div>
                <div className="relative w-[300px] h-[600px] bg-background-dark rounded-[3rem] border-4 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] overflow-hidden">
                  <div className="w-full h-full relative">
                    <Image
                      src="/images/recap.png"
                      alt="Session Recap - 142 MB reclaimed"
                      fill
                      className="object-cover object-top"
                      sizes="300px"
                    />
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h4 className="text-xl font-bold text-white mb-2">
                    The Recap
                  </h4>
                  <p className="text-slate-400 text-sm font-body max-w-xs mx-auto">
                    Instant gratification. See exactly how much space you&apos;ve
                    saved and feel the digital weight lift off.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 relative overflow-hidden" id="features">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                Designed for <span className="text-primary">speed</span>
              </h2>
              <div className="h-1 w-20 bg-primary rounded-full" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 hover:bg-slate-800/60 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">swipe</span>
                </div>
                <h3 className="text-xl font-bold text-white">Tactile Triage</h3>
                <p className="text-slate-400 font-body leading-relaxed mb-4">
                  Swipe left to delete, right to keep. Our Tinder-style interface
                  makes cleaning your gallery actually fun and incredibly fast.
                </p>
              </div>
              <div className="glass-card p-0 rounded-2xl flex flex-col hover:bg-slate-800/60 transition-colors group overflow-hidden relative">
                <div className="p-8 pb-0 z-10">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">
                      psychology
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Instant Results
                  </h3>
                  <p className="text-slate-400 font-body leading-relaxed text-sm">
                    Track your progress in real-time. AI tags only—see storage
                    reclaimed and items processed after every session.
                  </p>
                </div>
                <div className="mt-6 mx-auto w-3/4 bg-background-dark rounded-t-xl border-t border-x border-slate-700 p-4 pb-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-white">
                      142<span className="text-sm text-slate-500">MB</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 uppercase tracking-widest mt-1">
                      RECLAIMED
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-card p-0 rounded-2xl flex flex-col hover:bg-slate-800/60 transition-colors group overflow-hidden relative">
                <div className="p-8 pb-0 z-10">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl">
                      grid_view
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Reclaim Your Space
                  </h3>
                  <p className="text-slate-400 font-body leading-relaxed text-sm">
                    Manage &quot;The Vault&quot;. Use multi-select to bulk delete
                    unwanted screenshots—identified by AI tags only.
                  </p>
                </div>
                <div className="mt-6 mx-auto w-full h-32 relative opacity-60 group-hover:opacity-100 transition-opacity">
                  <div className="grid grid-cols-3 gap-1 px-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-slate-700 rounded-sm relative"
                      >
                        <div className="absolute top-1 right-1 w-3 h-3 bg-rose-500 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[8px] text-white">
                            check
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-bold py-2 px-6 rounded-full shadow-lg whitespace-nowrap">
                    DELETE (4)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          className="py-24 bg-[#15232b]"
          id="how-it-works"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Three steps to freedom
              </h2>
            </div>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -translate-y-1/2 z-0" />
              <div className="grid md:grid-cols-3 gap-12 relative z-10">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-background-dark border-4 border-slate-700 flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      sync
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      1. Sync
                    </h3>
                    <p className="text-slate-400 font-body text-sm px-4">
                      Connect your gallery. We scan locally for privacy,
                      identifying screenshots vs. photos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-primary text-background-dark border-4 border-background-dark ring-4 ring-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                    <span className="material-symbols-outlined text-4xl">
                      filter_list
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      2. Sort
                    </h3>
                    <p className="text-slate-400 font-body text-sm px-4">
                      Swipe through &quot;The Stack&quot; or bulk manage in &quot;The
                      Vault&quot;. AI tags only—no manual labels.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-background-dark border-4 border-slate-700 flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      celebration
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      3. Celebrate
                    </h3>
                    <p className="text-slate-400 font-body text-sm px-4">
                      Review your &quot;Session Recap&quot; and watch your available
                      storage grow.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-16 mx-auto max-w-md bg-background-dark rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-rose-500" />
                <div className="text-center relative z-10">
                  <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">
                    Session Complete
                  </p>
                  <div className="flex items-center justify-center gap-1 mb-6">
                    <span className="font-mono text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                      142
                    </span>
                    <span className="font-mono text-xl text-slate-500 self-end mb-2">
                      MB
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-6">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">72</span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Deleted
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">14</span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Kept
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-white">3:20</span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Duration
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 relative" id="cta">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready for a fresh start?
            </h2>
            <p className="text-lg text-slate-400 mb-10 font-body">
              Join thousands of users who have already reclaimed terabytes of
              storage. It takes less than 2 minutes to get organized.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-6 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-primary hover:bg-sky-400 text-background-dark font-bold rounded-lg px-8 py-4 transition-colors whitespace-nowrap disabled:opacity-70"
              >
                {status === "loading" ? "Joining…" : "Get Early Access"}
              </button>
            </form>
            {status === "success" && (
              <p className="mt-4 text-emerald-400 font-medium">
                You&apos;re on the list. Talk soon.
              </p>
            )}
            {status === "error" && error && (
              <p className="mt-4 text-rose-400 font-medium">{error}</p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              No credit card required. Unsubscribe at any time.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-background-dark py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="size-6 text-slate-400">
              <svg
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-slate-500 font-medium">
              zeroshots.app © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex gap-8">
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="#"
            >
              Privacy
            </a>
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="#"
            >
              Terms
            </a>
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="#"
            >
              Twitter
            </a>
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="#"
            >
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
