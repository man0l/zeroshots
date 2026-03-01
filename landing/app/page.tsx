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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background-dark/80 border-b border-slate-800">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
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
              Get Early Access
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
        <section className="relative px-4 sm:px-6 py-10 sm:py-16 lg:px-8 lg:py-24 max-w-7xl mx-auto overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl min-w-0">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Launching Soon
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.15] tracking-tight text-white">
                Delete 200 screenshots.{" "}
                <span className="text-primary">Five minutes.</span> Done.
              </h1>
              <p className="text-base sm:text-lg leading-relaxed text-slate-400 font-body">
                ZeroShots turns your screenshot backlog into a fast, satisfying
                swipe session — and tells you exactly how much space you freed.
                No more scrolling past screenshots you&apos;ll never look at again.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <a
                  href="#cta"
                  className="flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-background-dark hover:bg-primary/90 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all"
                >
                  Claim Free Pro — 137 Spots Left →
                </a>
              </div>
              <p className="text-xs text-slate-500 -mt-2">No spam. Unsubscribe anytime.</p>
            </div>

            {/* Phone mockups */}
            <div className="relative w-full h-[500px] sm:h-[580px] lg:h-[660px] flex items-center justify-center">
              <div className="relative z-20 flex items-center justify-center w-full h-full">
                {/* Right phone - Session Recap (desktop only) */}
                <div className="hidden lg:block absolute right-0 top-10 w-[260px] h-[540px] bg-background-dark rounded-[3rem] border-8 border-slate-800 shadow-2xl transform rotate-6 z-10 overflow-hidden opacity-90">
                  <div className="w-full h-full relative">
                    <Image
                      src="/images/recap.png"
                      alt="Session Recap - Storage Reclaimed 142 MB"
                      fill
                      className="object-cover object-top"
                      sizes="260px"
                    />
                  </div>
                </div>
                {/* Main phone - The Stack */}
                <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[220px] h-[440px] sm:w-[260px] sm:h-[520px] lg:left-8 lg:translate-x-0 lg:top-8 lg:w-[300px] lg:h-[600px] bg-background-dark rounded-[2.5rem] sm:rounded-[3rem] border-4 sm:border-8 border-slate-800 mockup-shadow transform lg:-rotate-3 z-30 overflow-hidden">
                  <div className="w-full h-full relative">
                    <Image
                      src="/images/stack.png"
                      alt="The Stack - swipe to triage screenshots"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 260px, 300px"
                      priority
                    />
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] lg:w-[500px] h-[300px] sm:h-[400px] lg:h-[500px] bg-primary/20 rounded-full blur-[80px] z-0" />
            </div>
          </div>
        </section>

        {/* The Problem - Before / After */}
        <section className="py-12 sm:py-20 bg-[#15232b] border-y border-slate-800 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">
                The Problem
              </h2>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                From chaos to clarity
              </h3>
              <p className="mt-3 sm:mt-4 text-slate-400 max-w-2xl mx-auto font-body text-sm sm:text-base">
                The average iPhone has 800+ unreviewed screenshots. Here&apos;s
                what happens when you actually deal with them.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-10 sm:gap-8 lg:gap-16 items-center justify-items-center">
              <div className="group relative flex flex-col items-center">
                <div className="absolute top-0 right-0 z-10 bg-rose-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm transform translate-x-2 -translate-y-2">
                  BEFORE
                </div>
                <div className="relative w-[260px] h-[520px] sm:w-[300px] sm:h-[600px] bg-background-dark rounded-[2.5rem] sm:rounded-[3rem] border-4 border-slate-700 shadow-xl overflow-hidden flex-shrink-0">
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

              <div className="group relative flex flex-col items-center">
                <div className="absolute top-0 right-0 z-10 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm transform translate-x-2 -translate-y-2">
                  AFTER
                </div>
                <div className="relative w-[260px] h-[520px] sm:w-[300px] sm:h-[600px] bg-background-dark rounded-[2.5rem] sm:rounded-[3rem] border-4 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] overflow-hidden flex-shrink-0">
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
        <section className="py-12 sm:py-24 relative overflow-hidden" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
                Designed for <span className="text-primary">speed</span>
              </h2>
              <div className="h-1 w-20 bg-primary rounded-full" />
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 hover:bg-slate-800/60 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">swipe</span>
                </div>
                <h3 className="text-xl font-bold text-white">Swipe 100 screenshots in 4 minutes</h3>
                <p className="text-slate-400 font-body leading-relaxed mb-4">
                  Left to delete, right to keep. The fastest way to triage your
                  camera roll — no folders, no labels, no thinking required.
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
                    Watch your storage grow in real time
                  </h3>
                  <p className="text-slate-400 font-body leading-relaxed text-sm">
                    Every swipe shows MB reclaimed instantly. Your session recap
                    keeps score so the satisfaction never gets old.
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
                    Bulk-delete a month of junk in one tap
                  </h3>
                  <p className="text-slate-400 font-body leading-relaxed text-sm">
                    Browse your full library, select everything you don&apos;t need,
                    and delete it all at once. Your phone. Finally under control.
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
          className="py-12 sm:py-24 bg-[#15232b] overflow-hidden"
          id="how-it-works"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Three steps to freedom
              </h2>
            </div>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -translate-y-1/2 z-0" />
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 relative z-10">
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

        {/* Coming Soon */}
        <section
          className="py-12 sm:py-24 relative overflow-hidden"
          id="cta"
          aria-labelledby="coming-soon-heading"
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-primary/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary mb-4 sm:mb-6 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              363 of 500 spots claimed
            </div>
            <h2
              id="coming-soon-heading"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight"
            >
              Get Pro free — before it costs <span className="line-through text-slate-500">$4.99</span><span className="text-primary"> $0.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-400 mb-5 font-body">
              The first 500 subscribers unlock <span className="text-white font-semibold">lifetime Pro access</span> at no cost.
              137 spots left. Drop your email and we&apos;ll notify you the moment ZeroShots goes live.
            </p>

            {/* Scarcity progress bar */}
            <div className="w-full max-w-md mx-auto mb-6 sm:mb-8">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>363 claimed</span>
                <span className="text-primary font-semibold">137 spots left</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full" style={{ width: "73%" }} />
              </div>
            </div>

            {/* Email signup — primary conversion */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-4 sm:px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base min-h-[48px]"
                aria-label="Email address"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-primary hover:bg-sky-400 text-background-dark font-bold rounded-lg px-6 py-3.5 transition-colors whitespace-nowrap disabled:opacity-70 shadow-[0_0_15px_rgba(56,189,248,0.3)] min-h-[48px]"
              >
                {status === "loading" ? "Joining…" : "Claim Free Pro →"}
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              No spam. Unsubscribe anytime.
            </p>
            {status === "success" && (
              <p className="mt-4 text-emerald-400 font-medium">
                You&apos;re in. We&apos;ll notify you at launch — check your inbox.
              </p>
            )}
            {status === "error" && error && (
              <p className="mt-4 text-rose-400 font-medium">{error}</p>
            )}

            {/* App Store badges — trust signals, not primary CTA */}
            <div className="flex flex-col items-center gap-3 mt-10 sm:mt-12">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                Coming to
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 opacity-60">
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block h-[40px] w-auto focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  aria-label="Download on the App Store"
                >
                  <img
                    src="/images/Pre-order_on_the_App_Store_Badge_US-UK_RGB_wht_121217.svg"
                    alt="Download on the App Store"
                    className="h-[40px] w-auto object-contain"
                    width={140}
                    height={40}
                  />
                </a>
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block h-[40px] w-auto focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-dark rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  aria-label="Get it on Google Play"
                >
                  <img
                    src="/images/PreRegisterOnGooglePlay_Badge_Web_color_english.png.png"
                    alt="Get it on Google Play"
                    className="h-[40px] w-auto object-contain"
                    width={160}
                    height={40}
                    onError={(e) => {
                      const t = e.currentTarget;
                      if (t.getAttribute("data-fallback") !== "1") {
                        t.setAttribute("data-fallback", "1");
                        t.src =
                          "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg";
                      }
                    }}
                  />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-background-dark py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 text-center md:text-left">
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
          <div className="flex flex-wrap justify-center md:justify-end gap-4 sm:gap-8">
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="/privacy"
            >
              Privacy
            </a>
            <a
              className="text-slate-500 hover:text-primary text-sm transition-colors"
              href="/terms"
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
