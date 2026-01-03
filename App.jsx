import React, { useEffect, useMemo, useRef, useState } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function makeSeededRng(seed = 1234567) {
  // small deterministic RNG for repeatable motion
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function formatPct(n) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function LiveBacktestCard() {
  const rngRef = useRef(makeSeededRng(20251215));
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x..4x
  const [series, setSeries] = useState(() => {
    // start with a gentle uptrend
    const arr = [];
    let v = 100;
    for (let i = 0; i < 60; i++) {
      const r = rngRef.current();
      v += (r - 0.47) * 0.8;
      arr.push(v);
    }
    return arr;
  });

  const [stats, setStats] = useState(() => ({
    winRate: 52,
    risk: 1,
    maxDD: 6.4,
    monthRet: 2.1,
  }));

  useEffect(() => {
    if (!isRunning) return;

    const tickMs = 220 / speed;
    const id = setInterval(() => {
      const r = rngRef.current();
      const r2 = rngRef.current();

      setSeries((prev) => {
        const last = prev[prev.length - 1];
        // create realistic-ish movement: trend + pullbacks
        const drift = 0.06;
        const shock = (r - 0.5) * 1.2;
        const meanRevert = (prev[Math.max(0, prev.length - 20)] - last) * 0.01;
        const next = last + drift + shock + meanRevert;
        const nextArr = prev.length >= 80 ? prev.slice(1) : prev.slice();
        nextArr.push(next);
        return nextArr;
      });

      setStats((s) => {
        const winRate = clamp(s.winRate + (r - 0.5) * 0.25, 45, 60);
        const maxDD = clamp(s.maxDD + (r2 - 0.5) * 0.18, 3.5, 10.5);
        const monthRet = clamp(s.monthRet + (r - 0.46) * 0.22, -3.5, 6.5);
        return {
          ...s,
          winRate,
          maxDD,
          monthRet,
        };
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [isRunning, speed]);

  const chart = useMemo(() => {
    const w = 220;
    const h = 80;
    const pad = 8;

    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = Math.max(1e-6, max - min);

    const points = series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * (w - pad * 2) + pad;
        const y = h - ((v - min) / span) * (h - pad * 2) - pad;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    // shade under curve
    const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

    // latest value dot
    const lastV = series[series.length - 1];
    const lastX = w - pad;
    const lastY = h - ((lastV - min) / span) * (h - pad * 2) - pad;

    return { w, h, points, area, lastX, lastY };
  }, [series]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Model Backtest <span className="text-slate-600">(Live)</span>
        </span>
        <span className="hidden sm:inline">EURUSD | streaming simulation</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">
          <span className="text-slate-400">Monthly</span>
          <span className={
            stats.monthRet >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"
          }>
            {formatPct(stats.monthRet)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((v) => !v)}
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
            aria-label={isRunning ? "Pause backtest" : "Play backtest"}
          >
            {isRunning ? "Pause" : "Play"}
          </button>
          <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">
            <span className="text-slate-400">Speed</span>
            {[1, 2, 3, 4].map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setSpeed(x)}
                className={
                  "rounded-full px-2 py-0.5 font-semibold transition " +
                  (speed === x
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                    : "text-slate-300 hover:text-emerald-200")
                }
              >
                {x}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 h-24 w-full rounded-xl bg-slate-900/80">
        <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="h-full w-full">
          <defs>
            <linearGradient id="ictArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polyline
            fill="Full"
            stroke="Green"
            strokeWidth="2"
            className="text-emerald-400"
            points={chart.points}
          />
          <polygon
            fill="url(#ictArea)"
            className="text-emerald-400"
            points={chart.area}
          />
          <circle
            cx={chart.lastX}
            cy={chart.lastY}
            r="3"
            className="text-emerald-300"
            fill="currentColor"
          />

          <polyline
            fill="Full"
            stroke="Green"
            strokeWidth="1"
            className="text-slate-700"
            points={`8,${chart.h - 8} ${chart.w - 8},${chart.h - 8}`}
          />
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Win rate: <span className="text-emerald-300 font-semibold">{stats.winRate.toFixed(1)}%</span>
        </span>
        <span>
          Risk / trade: <span className="text-emerald-300 font-semibold">{stats.risk.toFixed(0)}%</span>
        </span>
        <span>
          Max DD: <span className="text-amber-300 font-semibold">{stats.maxDD.toFixed(1)}%</span>
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        This is a live simulation for UI preview only — not real market data and not a promise of results.
      </p>
    </div>
  );
}

export default function ICTForexLandingPage() {
  return (
   <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border-emerald-400/40">
            <img
            src="https://treentechco.wordpress.com/wp-content/uploads/2026/01/chatgpt-image-jan-3-2026-03_13_09-pm.png"
            alt="Logo"
            className="h-9 w-9 object-contain"
             />
            </div>
            <div>
              <div className="text-sm font-bold tracking-[0.2em] text-emerald-300 uppercase">
                ICT
              </div>
              <p className="text-xs text-slate-400 -mt-1">Inner Circle Trading</p>
            </div>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#about" className="hover:text-emerald-300 transition">About</a>
            <a href="#edge" className="hover:text-emerald-300 transition">Our Edge</a>
            <a href="#strategy" className="hover:text-emerald-300 transition">Strategy</a>
            <a href="#learn" className="hover:text-emerald-300 transition">Learn</a>
            <a href="#contact" className="hover:text-emerald-300 transition">Contact</a>
          </nav>
          <a
            href="#contact"
            className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
          >
            Start with ICT
          </a>
        </div>
      </header>
      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4">
        <section className="grid gap-12 py-16 md:grid-cols-[1.2fr,1fr] md:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Forex Trading with Precision
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-5xl">
              ICT Forex Trading
              <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                Smart Liquidity. Smart Risk. Smart Results.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              ICT (Inner Circle Trading) combines institutional concepts, liquidity theory,
              and strict risk management to help traders navigate the global FX markets with
              confidence and clarity.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <button className="rounded-full bg-emerald-500 px-5 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400">
                <a href="#contact" className="rounded-full bg-emerald-500 px-5 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400">Book a Free FX Call</a>
              </button>
              <button className="rounded-full border border-slate-600 px-5 py-2 font-semibold hover:border-emerald-400/70 hover:text-emerald-200">
                View Strategy Breakdown
              </button>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span>✔ Risk-first approach</span>
                <span>✔ Liquidity & time-based models</span>
              </div>
            </div>
          </div>

          {/* Right side hero card */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-emerald-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ICT Liquidity Map</span>
                <span>London & New York Sessions</span>
              </div>
              <div className="mt-4 space-y-4">
                {/* Session blocks */}
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-slate-400">Asian Range</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-300">Accumulation</p>
                    <p className="mt-1 text-[10px] text-slate-400">Define liquidity pool and highs/lows.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-slate-400">London Open</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-300">Stop Hunt</p>
                    <p className="mt-1 text-[10px] text-slate-400">Sweep liquidity before expansion.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
                    <p className="text-slate-400">New York</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-300">Premium / Discount</p>
                    <p className="mt-1 text-[10px] text-slate-400">Refine entries around key levels.</p>
                  </div>
                </div>

                {/* Live backtest (animated) */}
                <LiveBacktestCard />
              </div>
            </div>
          </div>
        </section>

         {/* Learn & Resources */}
        <section id="learn" className="border-t border-slate-800 py-14">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Learn ICT Your Way</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Whether you&apos;re new to forex or transitioning from indicators to price-action and liquidity,
                ICT concepts can be layered at your own pace.
              </p>
            </div>
            <p className="text-xs text-slate-400">Choose a path that matches your current level.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-bold-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Foundation</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">Beginners</h3>
              <p className="mt-2 text-xs text-slate-400">
                Learn how FX markets work, key sessions, basic risk management, and how to read clean price
                charts without clutter.
              </p>
           <a
             href="https://www.treentech.co/"
             className="mt-4 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold hover:border-emerald-400/70 hover:text-emerald-200"
             target=" mt-4 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold hover:border-emerald-400/70 hover:text-emerald-200"
             rel="noopener noreferrer"
             >
                View Beginner Road Map  
             </a>
            </div>

            <div className="flex flex-col rounded-2xl border border-emerald-500/50 bg-emerald-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Core</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">Intermediate</h3>
              <p className="mt-2 text-xs text-slate-200">
                Dive into liquidity sweeps, FVGs, order blocks, and time-of-day models. Build a complete trading
                plan with detailed rules.
              </p>
              <a
             href="https://www.treentech.co/"
             className="mt-4 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
             target="mt-4 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
             rel="noopener noreferrer"
             >
                Explore Core ICT Modules  
             </a>
            </div>

            <div className="flex flex-col rounded-2xl border border-bold-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Pro</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-100">Advanced</h3>
              <p className="mt-2 text-xs text-slate-400">
                Add portfolio thinking, multi-timeframe execution, and journaling routines to refine and
                scale your performance.
              </p>
              
              <a
             href="https://www.treentech.co/"
             className="mt-4 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold hover:border-emerald-400/70 hover:text-emerald-200"
             target=" mt-4 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold hover:border-emerald-400/70 hover:text-emerald-200"
             rel="noopener noreferrer"
             >
                Join Waitlist  
             </a>
            </div>
          </div>
        </section>
        
        {/* About ICT */}
        <section id="about" className="grid gap-10 border-t border-slate-800 py-14 md:grid-cols-[1.2fr,1fr]">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">What is ICT Forex Trading?</h2>
            <p className="mt-3 text-sm text-slate-300">
              ICT stands for <span className="font-semibold text-emerald-300">Inner Circle Trading</span>,
              a modern approach to forex that focuses on how price moves around liquidity rather than relying
              on lagging indicators. We look at where institutions are likely to engineer moves, and we align
              with that narrative.
            </p>
            <div className="mt-5 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Core Pillar</p>
                <h3 className="mt-1 text-sm font-semibold">Liquidity & Market Structure</h3>
                <p className="mt-2 text-xs text-slate-400">
                  Identify buy-side and sell-side liquidity, draw on liquidity, and structural shifts that
                  show where price is likely to run next.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Core Pillar</p>
                <h3 className="mt-1 text-sm font-semibold">Time & Price</h3>
                <p className="mt-2 text-xs text-slate-400">
                  Focused on key sessions (London/NY), optimal trade windows, and precise price levels like
                  premium/discount arrays.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h3 className="text-sm font-semibold text-emerald-200">Disclaimer</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/80">
                Forex trading involves substantial risk of loss and is not suitable for every investor. The
                material on this site is for educational purposes only and should not be considered financial
                advice. Never trade with capital you cannot afford to lose.
              </p>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>No signals, no hype — just smart frameworks and repeatable models.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Suitable for day traders and swing traders focusing on major FX pairs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Clear, rule-based entries, exits, and risk parameters.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Our Edge */}
        <section id="edge" className="border-t border-slate-800 py-14">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">The ICT Edge</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                We focus on consistency, not perfection. ICT helps you remove random trades by narrowing down
                the moments when the market is most likely to deliver high-probability setups.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Built around the 3Ms: <span className="text-emerald-300 font-semibold">Market</span>,{" "}
              <span className="text-emerald-300 font-semibold">Model</span>,{" "}
              <span className="text-emerald-300 font-semibold">Mindset</span>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {["Market", "Model", "Mindset"].map((pillar) => (
              <div
                key={pillar}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">{pillar}</p>
                {pillar === "Market" && (
                  <>
                    <h3 className="mt-1 text-sm font-semibold">Smart Pair & Session Selection</h3>
                    <p className="mt-2 text-xs text-slate-400">
                      Focus on liquid major pairs (EURUSD, GBPUSD, XAUUSD) during optimal sessions, avoiding
                      low-probability environments and news spikes.
                    </p>
                  </>
                )}
                {pillar === "Model" && (
                  <>
                    <h3 className="mt-1 text-sm font-semibold">Rule-Based Trade Models</h3>
                    <p className="mt-2 text-xs text-slate-400">
                      Entries based on liquidity sweeps, fair value gaps, order blocks, and market structure
                      shifts — all clearly defined and backtested.
                    </p>
                  </>
                )}
                {pillar === "Mindset" && (
                  <>
                    <h3 className="mt-1 text-sm font-semibold">Risk & Psychology</h3>
                    <p className="mt-2 text-xs text-slate-400">
                      Position sizing, journaling, and emotional control so that you execute the plan instead
                      of chasing the market.
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Strategy Snapshot */}
        <section id="strategy" className="border-t border-slate-800 py-14">
          <div className="grid gap-10 md:grid-cols-[1.1fr,1fr] md:items-start">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">ICT Strategy Snapshot</h2>
              <p className="mt-2 text-sm text-slate-300">
                A simplified flow of a typical ICT trade idea on a major pair like EURUSD.
              </p>
              <ol className="mt-4 space-y-3 text-sm text-slate-200">
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300 border border-emerald-400/40">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Define Daily Bias</h3>
                    <p className="text-xs text-slate-400">
                      Use higher timeframes (HTF) to mark key highs, lows, and liquidity pools. Determine
                      whether the algorithm is likely to draw price higher or lower today.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300 border border-emerald-400/40">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Wait for Liquidity Sweep</h3>
                    <p className="text-xs text-slate-400">
                      During London or NY session, wait for price to run stops above/below a key level. This
                      sweep shows where the market just delivered liquidity.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300 border border-emerald-400/40">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Refine Entry Zone</h3>
                    <p className="text-xs text-slate-400">
                      Look for fair value gaps (FVGs), order blocks, and optimal trade entry levels inside the
                      premium/discount range relative to your HTF bias.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300 border border-emerald-400/40">
                    4
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">Execute with Fixed Risk</h3>
                    <p className="text-xs text-slate-400">
                      Risk 0.5–1% per trade, pre-define partials and final take profit at opposing liquidity.
                      Log everything in your journal.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
              <h3 className="text-sm font-semibold text-slate-100">Example ICT Trading Plan (Daily)</h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2">
                  <span className="text-slate-400">Pairs</span>
                  <span className="font-medium text-emerald-200">EURUSD, GBPUSD, XAUUSD</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2">
                  <span className="text-slate-400">Sessions</span>
                  <span className="font-medium text-emerald-200">London, NY Killzones</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2">
                  <span className="text-slate-400">Max trades / day</span>
                  <span className="font-medium text-emerald-200">2</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2">
                  <span className="text-slate-400">Risk / trade</span>
                  <span className="font-medium text-emerald-200">1% of account</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  This is a sample structure. Build your own plan with numbers that fit your capital, lifestyle,
                  and experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-t border-slate-800 py-14">
          <div className="grid gap-10 md:grid-cols-[1.1fr,1fr]">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Contact ICT</h2>
              <p className="mt-2 text-sm text-slate-300">
                Ready to take your forex trading more seriously? Share a bit about your experience and goals,
                and we&apos;ll get back to you.
              </p>

              <form className="mt-5 space-y-4 text-sm">
                <div>
                  <label className="block text-xs text-slate-400">Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Experience level</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  >
                    <option>New to Forex</option>
                    <option>Some Experience (0-2 years)</option>
                    <option>Experienced (2+ years)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400">What are you looking for?</label>
                  <textarea
                    rows={4}
                    placeholder="Share your goals, challenges, and what you want to learn about ICT..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 hover:bg-emerald-400"
                >
                <a
                 href="mailto:admin@icttradinghub.com?subject=New%20Message%20from%20ICT%20Website&body=Hello%20ICT%20Team,%0D%0A%0D%0A"
                className="inline-block rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 hover:bg-emerald-400"
                >
               Send Message
               </a>
                </button>
                <p className="text-[11px] text-slate-500">
                  By submitting, you agree that this is educational only and not a request for financial advice.
                </p>
              </form>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Quick Info</h3>
                <p className="mt-2 text-xs text-slate-400">
                  • Session focus: London & New York FX sessions
                  <br />• Markets: Major FX pairs & gold
                  <br />• Style: Price action, liquidity, and time-based setups
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                <p>
                  ICT Forex Trading is an educational brand. We do not manage funds or offer investment
                  services. Nothing on this website is an offer, solicitation, or recommendation to buy or sell
                  any financial instrument.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-6 text-[11px] text-slate-500">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 md:flex-row">
            <p>
             © {new Date().getFullYear()} ICT Forex Trading · Operated by{" "}
             <a
             href="https://www.treentech.co/"
             target="_blank"
             rel="noopener noreferrer"
             >
             TREENTECHCO  
             </a>

            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-300">Terms</a>
              <a href="#" className="hover:text-emerald-300">Privacy</a>
              <a href="#hero" className="hover:text-emerald-300">Back to top</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
























































