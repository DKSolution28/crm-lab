"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alias, password }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Invalid alias or password.");
      return;
    }
    router.push("/accounts");
    router.refresh();
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">CRM Lab uses a signed session. The demo user list does not sign you in.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Alias
          <input
            name="alias"
            autoComplete="username"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            className="h-10 rounded border border-slate-300 px-3"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 rounded border border-slate-300 px-3"
            required
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending || !ready} className="h-10 rounded bg-[#0176d3] text-sm font-semibold text-white disabled:opacity-60">
          Sign in
        </button>
      </form>
    </main>
  );
}
