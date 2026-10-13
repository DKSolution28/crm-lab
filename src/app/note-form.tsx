"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NoteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Observation Salesforce");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!response.ok) {
      setStatus("error");
      setMessage("L'enregistrement Prisma a échoué.");
      return;
    }
    setBody("");
    setStatus("saved");
    setMessage("Note enregistrée dans PostgreSQL.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-ink">Titre</span>
        <input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink outline-none ring-accent/30 focus:ring-4"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-ink">Observation</span>
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="Décrire une surface observée sur l'app Salesforce de démonstration."
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink outline-none ring-accent/30 focus:ring-4"
          required
        />
      </label>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60"
      >
        {status === "saving" ? "Enregistrement…" : "Enregistrer la note"}
      </button>
      {message ? (
        <p className="text-sm text-muted" data-testid="note-status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
