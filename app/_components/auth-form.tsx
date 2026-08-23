"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 2.87-.39c.97 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    router.push("/chat");
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
        {isSignup ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-400">
        {isSignup
          ? "Start browsing the web through your own security layer."
          : "Log in to pick up where your agent left off."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm text-zinc-300">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Ada Lovelace"
              className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white placeholder:text-zinc-600 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/10 focus-visible:outline-none"
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-zinc-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white placeholder:text-zinc-600 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/10 focus-visible:outline-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-zinc-300">
              Password
            </label>
            {!isSignup && (
              <a href="#" className="text-xs text-zinc-500 transition-colors hover:text-white">
                Forgot password?
              </a>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : "••••••••"}
            className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white placeholder:text-zinc-600 focus-visible:border-white/40 focus-visible:ring-[3px] focus-visible:ring-white/10 focus-visible:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-zinc-500">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        <GitHubIcon />
        Continue with GitHub
      </button>

      <p className="mt-8 text-center text-sm text-zinc-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-white underline-offset-4 hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Compositer?{" "}
            <Link href="/signup" className="text-white underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      {isSignup && (
        <p className="mt-6 text-center text-xs leading-relaxed text-zinc-600">
          By signing up you agree that your agent stays local, asks before it acts, and never pays
          on a site that isn&apos;t SAFE.
        </p>
      )}
    </div>
  );
}
