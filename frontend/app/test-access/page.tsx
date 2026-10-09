"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";

export default function TestAccessPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/app");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPath = params.get("next");
    setNextPath(requestedPath?.startsWith("/") ? requestedPath : "/app");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/test-access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.message === "string" ? payload.message : "Invalid test password.");
      }

      window.location.href = nextPath.startsWith("/") ? nextPath : "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid test password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--brse-panel-border)] bg-surface/90 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-ink">BrSE Assistant Test Access</p>
            <p className="mt-1 text-sm leading-6 text-textMuted">
              Enter the local test password to access the UI. API proxy routes stay available for trusted local tools such as the Chrome Extension.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Test password</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="min-h-12 rounded-lg border border-[var(--brse-panel-border)] bg-background/80 px-3 py-2 text-base text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {error ? <p className="rounded-md border border-vermilion/30 bg-vermilion/10 px-3 py-2 text-sm text-vermilion">{error}</p> : null}
          <button
            type="submit"
            disabled={!password.trim() || isLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
            Enter app
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-textMuted">
          Local test access is disabled unless TEST_GATE_ENABLED=true and TEST_GATE_PASSWORD is set.
        </p>
      </section>
    </main>
  );
}
