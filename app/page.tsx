import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainIcon,
  Check,
  CreditCard,
  Eye,
  Fingerprint,
  Globe,
  Lock,
  MessagesSquare,
  MonitorSmartphone,
  MousePointerClick,
  ScanLine,
  Server,
  ShieldCheck,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { CompositerIcon } from "@/app/_components/compositer-icon";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compositer — The safe way to browse, buy, and pay online",
  description:
    "Compositer is a local AI browser agent with a built-in security layer. One prompt, and Eve shops, logs in, and pays for you — scanning every site with 10 local security checks before money ever moves.",
};

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#security", label: "Security" },
  { href: "#how-it-works", label: "How it works" },
];

function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <CompositerIcon className="size-5" />
      <span className="font-semibold tracking-tight text-white">Compositer</span>
    </span>
  );
}

function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Compositer home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center rounded-md bg-white px-3.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

const SECURITY_CHECKS = [
  { id: "https_transport", weight: 10, note: "URL uses HTTPS" },
  { id: "tls_page_match", weight: 8, note: "Active tab is HTTPS" },
  { id: "typosquatting", weight: 12, note: "Hostname vs known brands" },
  { id: "homograph_domain", weight: 10, note: "Punycode / mixed scripts" },
  { id: "suspicious_tld", weight: 8, note: ".tk, .ml, raw IP hosts" },
  { id: "phishing_url_path", weight: 10, note: "Phishy paths on odd hosts" },
  { id: "redirect_depth", weight: 8, note: "Navigation redirect count" },
  { id: "credential_form_risk", weight: 14, note: "Password fields on risky hosts" },
  { id: "cross_origin_submit", weight: 10, note: "Forms posting cross-domain" },
  { id: "phishing_page_text", weight: 8, note: "Phishing phrases in page text" },
];

const RISK_TIERS = [
  {
    tier: "SAFE",
    range: "0–25",
    tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    action: "Journey continues. Compositer Pay unlocked at checkout.",
    icon: ShieldCheck,
  },
  {
    tier: "REVIEW",
    range: "26–60",
    tone: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    action: "Agent pauses. You choose — Continue or Stop.",
    icon: TriangleAlert,
  },
  {
    tier: "DANGER",
    range: "61+",
    tone: "text-red-400 border-red-500/30 bg-red-500/10",
    action: "Session killed, browser reset, site blocked.",
    icon: Lock,
  },
];

const FEATURES = [
  {
    icon: Eye,
    title: "Live browser panel",
    body: "Watch every step as JPEG snapshots of real Chrome at ~500ms. Idle, Live, Your turn, or You control — you always know what the agent sees.",
  },
  {
    icon: MessagesSquare,
    title: "Human-in-the-loop checkpoints",
    body: "Eve never guesses. Product picks, logins, OTPs, captchas, and carts all pause for your call — via inline options or secure form dialogs.",
  },
  {
    icon: ScanLine,
    title: "10-point site scanner",
    body: "Every navigation runs through ten local security metrics — typosquatting, homographs, phishing paths, credential risk — scored 0–100.",
  },
  {
    icon: CreditCard,
    title: "Payments on SAFE sites only",
    body: "At checkout on a SAFE-tier site, payment routes through Compositer's Razorpay flow with signature verification. Never the merchant's pay button.",
  },
  {
    icon: MousePointerClick,
    title: "Take Control anytime",
    body: "One click cancels the agent turn and hands you the browser. Finish things yourself, then return control or start a new journey.",
  },
  {
    icon: Server,
    title: "100% local by default",
    body: "Next.js app, Docker sandbox, headless Chromium. No cloud browsers, no MCP servers — the agent, checks, and payment APIs run on your machine.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Describe it once",
    body: "One natural-language task boots Eve, resets Chrome, and wires BU_CDP_URL to your sandbox — no follow-up chat required.",
  },
  {
    n: "02",
    title: "Watch it work",
    body: "Eve drives headless Chrome inside a sandbox while the drawer streams live previews and safety cards score every site in parallel.",
  },
  {
    n: "03",
    title: "Decide at checkpoints",
    body: "The chat locks itself. You approve products, fill logins and OTPs in secure dialogs, and confirm every cart before it happens.",
  },
  {
    n: "04",
    title: "Pay the safe way",
    body: "If the site scores SAFE, checkout opens Compositer Pay — an HMAC-verified Razorpay flow. The agent never touches a merchant pay button.",
  },
];

const STATS = [
  { value: "10", label: "local security checks per navigation" },
  { value: "~500ms", label: "live browser preview latency" },
  { value: "0", label: "cloud browsers required" },
  { value: "0–100", label: "risk score on every site visited" },
];

function HeroMockup() {
  return (
    <div className="card-glow relative overflow-hidden rounded-xl bg-zinc-950/90 shadow-[0_40px_120px_-20px_rgba(255,255,255,0.15)]">
      {/* App chrome */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-zinc-900/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-zinc-600" />
          <span className="size-2.5 rounded-full bg-zinc-600" />
          <span className="size-2.5 rounded-full bg-zinc-600" />
        </div>
        <div className="flex items-center gap-2">
          <CompositerIcon className="size-3.5" />
          <span className="font-medium text-white text-xs">Compositer</span>
        </div>
        <div className="hidden h-5 w-px bg-white/10 sm:block" />
        <span className="hidden font-mono text-[10px] text-zinc-500 sm:inline">
          eve · docker/eve-sandbox · BU_CDP_URL
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          agent running
        </span>
      </div>

      {/* Browser URL bar */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-black px-4 py-2">
        <Globe className="size-3.5 shrink-0 text-zinc-500" />
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-zinc-900/60 px-3 py-1.5 font-mono text-[11px] text-zinc-400">
          <Lock className="size-3 shrink-0 text-emerald-400" />
          <span className="truncate">en.wikipedia.org/wiki/Headless_browser</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <ShieldCheck className="size-3" /> 8 · SAFE
          </span>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_200px]">
        {/* Chat + browser split — mirrors real UI */}
        <div className="grid min-w-0 border-white/10 sm:grid-cols-[minmax(0,38%)_minmax(0,1fr)] sm:border-r">
          {/* Chat column */}
          <div className="space-y-3 border-b border-white/10 p-3 sm:border-b-0 sm:border-r">
            <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">Chat</p>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <p className="font-mono text-[10px] text-zinc-500">you</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                Summarize headless browser security tradeoffs from Wikipedia — no cloud browsers.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <p className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                <BrainIcon className="size-3" /> eve
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                Loaded <span className="text-zinc-300">browser-use</span> ·{" "}
                <span className="text-emerald-400/90">page_info()</span> → HTTPS tab active
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                  activate_tab(0)
                </span>
                <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                  js(tree)
                </span>
              </div>
            </div>
            <div className="rounded-md border border-dashed border-white/15 px-2 py-1.5 text-center font-mono text-[10px] text-zinc-600">
              composer locked · HITL only
            </div>
          </div>

          {/* Live browser preview */}
          <div className="min-w-0 bg-[#0a0a0a] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium text-white text-[11px]">Live browser</p>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-400">
                Live
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white">
              {/* Mini Wikipedia article */}
              <div className="border-b border-zinc-200 bg-[#f8f9fa] px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded bg-white border border-zinc-300 flex items-center justify-center text-[8px] font-bold text-zinc-600">
                    W
                  </div>
                  <span className="font-medium text-[10px] text-zinc-800">Headless browser</span>
                </div>
              </div>
              <div className="space-y-2 p-2.5 text-[9px] leading-relaxed text-zinc-700">
                <p className="font-semibold text-[11px] text-zinc-900">Headless browser</p>
                <p>
                  A <span className="bg-yellow-100">headless browser</span> is a web browser without
                  a graphical user interface — controlled via{" "}
                  <span className="text-blue-700">Chrome DevTools Protocol</span> or WebDriver.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-1.5">
                    <p className="font-mono text-[8px] text-zinc-500">CDP port</p>
                    <p className="font-semibold text-zinc-800">9222</p>
                  </div>
                  <div className="rounded border border-zinc-200 bg-zinc-50 p-1.5">
                    <p className="font-mono text-[8px] text-zinc-500">sandbox</p>
                    <p className="font-semibold text-zinc-800">isolated</p>
                  </div>
                </div>
                <p className="text-zinc-500">
                  Used for automation, testing, and agent-driven navigation…
                </p>
              </div>
            </div>
            <p className="mt-2 truncate font-mono text-[9px] text-zinc-500">
              compositer-chrome:9222 · JPEG ~500ms
            </p>
          </div>
        </div>

        {/* Site checks rail */}
        <div className="space-y-1.5 p-3 font-mono text-[10px]">
          <p className="pb-1 text-[10px] tracking-widest text-zinc-500 uppercase">Site checks</p>
          {[
            ["https_transport", "pass", "TLS on wire"],
            ["typosquatting", "pass", "no brand drift"],
            ["homograph_domain", "pass", "ASCII host"],
            ["credential_form_risk", "warn", "login form"],
            ["phishing_url_path", "pass", "clean path"],
          ].map(([id, status, note]) => (
            <div
              key={id}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-zinc-300">{id}</span>
                {status === "pass" ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-emerald-400">
                    <Check className="size-2.5" /> SAFE
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-0.5 text-amber-400">
                    <TriangleAlert className="size-2.5" /> warn
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[9px] text-zinc-600">{note}</p>
            </div>
          ))}
          <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
            <p className="text-[9px] text-zinc-500">aggregate score</p>
            <p className="font-semibold text-emerald-400">8 / 100 · SAFE tier</p>
          </div>
        </div>
      </div>

      <div className="mx-3 mb-3 flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 sm:mx-4 sm:mb-4 sm:flex-row sm:items-center">
        <p className="text-xs text-amber-300">
          <span className="font-semibold">HITL checkpoint:</span> TLS + homograph checks passed — proceed?
        </p>
        <div className="flex shrink-0 gap-2 sm:ml-auto">
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
            Continue · score 8 SAFE
          </span>
          <span className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
            Take control
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-black text-zinc-300 antialiased selection:bg-white selection:text-black">
      <SiteNav />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hero-glow relative overflow-hidden pt-36 pb-24">
        <div className="bg-grid mask-fade-b absolute inset-x-0 top-0 h-[560px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pr-3 pl-1 text-xs text-zinc-300 transition-colors hover:border-white/30"
            >
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-black">
                New
              </span>
              Local-first AI browsing, now in beta
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1 className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tighter text-balance text-white sm:text-6xl md:text-7xl">
              Browse. Buy. Pay.
              <br />
              <span className="text-gradient">Without the risk.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-zinc-400 sm:text-lg">
              Eve runs in an isolated Docker sandbox and drives headless Chromium over CDP.
              Ten local security metrics score every navigation — TLS, typosquatting, homographs,
              credential risk — before Razorpay opens on SAFE-tier sites only.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Start browsing safely
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 font-mono text-xs text-zinc-600">
              docker/eve-sandbox · compositer-chrome:9222 · BU_CDP_URL · 10-point risk scorer
            </p>
          </div>

          <div className="relative mx-auto mt-16 max-w-4xl">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-zinc-950/60">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-white/10 px-6 md:grid-cols-4 md:divide-x">
          {STATS.map((stat) => (
            <div key={stat.value} className="px-2 py-10 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-mono text-3xl font-semibold text-white">{stat.value}</dd>
              <dd className="mt-2 text-sm text-zinc-500">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">Features</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tighter text-balance text-white sm:text-4xl">
            An agent that earns your trust at every step
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Nothing runs in a cloud browser unless you ask. The agent, UI, security checks, and
            payment APIs live on your machine — and you watch everything.
          </p>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6 transition-colors hover:border-white/25"
              >
                <feature.icon className="size-5 text-zinc-300" />
                <h3 className="mt-4 font-medium text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────── */}
      <section id="security" className="scroll-mt-20 border-y border-white/10 bg-zinc-950/60 py-28">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
              Security layer
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tighter text-balance text-white sm:text-4xl">
              Ten checks. Every page. Zero trust.
            </h2>
            <p className="mt-4 text-zinc-400">
              A read-only scanner streams alongside the agent, scoring every hostname the moment
              focus changes. Checks return pass, warn, or fail — weighted into a single 0–100 risk
              score that decides whether the journey continues.
            </p>

            <ul className="mt-8 space-y-2 font-mono text-xs">
              {SECURITY_CHECKS.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-black px-3 py-2.5"
                >
                  <Check className="size-3.5 shrink-0 text-emerald-400" />
                  <span className="text-zinc-200">{check.id}</span>
                  <span className="ml-auto hidden text-zinc-500 sm:block">{check.note}</span>
                  <span className="text-zinc-600">w:{check.weight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm text-zinc-400">
              The score maps to three tiers — and each tier has teeth:
            </p>
            {RISK_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium",
                      tier.tone,
                    )}
                  >
                    <tier.icon className="size-3.5" />
                    {tier.tier}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">score {tier.range}</span>
                </div>
                <p className="mt-3 text-sm text-zinc-300">{tier.action}</p>
              </div>
            ))}
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Same-hostname results are cached ~60s so scanning never slows the agent down. On
              DANGER, the session dies instantly — no dialog required.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tighter text-balance text-white sm:text-4xl">
            From one sentence to a paid order
          </h2>

          <ol className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li key={step.n} className="bg-black p-6">
                <span className="font-mono text-sm text-zinc-600">{step.n}</span>
                <h3 className="mt-3 font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80">
            <div className="border-b border-white/10 px-4 py-2.5 font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
              Journey state
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 font-mono text-sm">
              <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-zinc-400">
                idle
              </span>
              <ArrowRight className="size-3.5 text-zinc-600" />
              <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-300">
                running
              </span>
              <ArrowRight className="size-3.5 text-zinc-600" />
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                done
              </span>
              <span className="ml-auto hidden text-xs text-zinc-600 md:block">
                // chat locks mid-journey — only option buttons, form dialogs &amp; Compositer Pay
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-28">
        <div className="bg-grid relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/10 px-6 py-20 text-center">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_110%,rgba(120,119,198,0.25),transparent_70%)]"
            aria-hidden="true"
          />
          <Fingerprint className="relative mx-auto size-8 text-zinc-400" />
          <h2 className="relative mt-6 text-4xl font-semibold tracking-tighter text-balance text-white sm:text-5xl">
            Your agent is ready.
            <br />
            Your guardrails are too.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
            Create an account, describe what you need, and let Eve handle the sketchy parts of the
            internet — with you holding the keys.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Create free account
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-md border border-white/15 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[1fr_auto]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              A local AI browser agent with a security layer between you and the internet.
            </p>
            <div className="mt-6 flex gap-4 text-zinc-500">
              <Globe className="size-4" />
              <MonitorSmartphone className="size-4" />
              <Zap className="size-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            {[
              {
                heading: "Product",
                links: [
                  ["Live browser panel", "#features"],
                  ["Security scanner", "#security"],
                  ["How it works", "#how-it-works"],
                  ["Sign up", "/signup"],
                ],
              },
              {
                heading: "Resources",
                links: [
                  ["Architecture (README2)", "https://github.com/browser-use/browser-harness"],
                  ["eve documentation", "https://eve.dev/docs"],
                  ["browser-harness", "https://github.com/browser-use/browser-harness"],
                ],
              },
              {
                heading: "Legal",
                links: [
                  ["Privacy", "#"],
                  ["Terms", "#"],
                  ["Security", "#security"],
                ],
              },
            ].map((column) => (
              <div key={column.heading}>
                <h3 className="text-sm font-medium text-white">{column.heading}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith("/") || href.startsWith("#") ? (
                        href.startsWith("#") && !href.startsWith("/#") ? (
                          <a
                            href={href}
                            className="text-sm text-zinc-500 transition-colors hover:text-white"
                          >
                            {label}
                          </a>
                        ) : (
                          <Link
                            href={href}
                            className="text-sm text-zinc-500 transition-colors hover:text-white"
                          >
                            {label}
                          </Link>
                        )
                      ) : (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-zinc-500 transition-colors hover:text-white"
                        >
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-14 flex max-w-6xl items-center justify-between border-t border-white/10 px-6 pt-8 text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} Compositer. Runs on your machine.</p>
          <p className="font-mono">local-first · human-in-the-loop · zero-trust browsing</p>
        </div>
      </footer>
    </div>
  );
}
