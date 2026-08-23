import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthForm } from "@/app/_components/auth-form";
import { CompositerIcon } from "@/app/_components/compositer-icon";

export const metadata: Metadata = {
  title: "Log in — Compositer",
};

export default function LoginPage() {
  return (
    <div className="bg-grid relative flex min-h-dvh flex-col bg-black text-zinc-300 antialiased selection:bg-white selection:text-black">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 hero-glow"
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <CompositerIcon className="size-5" />
          <span className="font-semibold tracking-tight text-white">Compositer</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Back to home
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-6 pt-16 pb-24 sm:items-center sm:pt-0">
        <div className="card-glow w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950/80 p-8 shadow-[0_30px_90px_-20px_rgba(255,255,255,0.12)] backdrop-blur">
          <AuthForm mode="login" />
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-2 pb-8 text-xs text-zinc-600">
        <ShieldCheck className="size-3.5 text-emerald-400" />
        Protected by 10 local security checks · SAFE-only payments
      </footer>
    </div>
  );
}
