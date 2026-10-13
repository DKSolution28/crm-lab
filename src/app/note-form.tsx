import { createNote } from "./actions";

export function NoteForm() {
  return (
    <form action={createNote} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-ink">Titre</span>
        <input
          name="title"
          defaultValue="Observation Salesforce"
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink outline-none ring-accent/30 focus:ring-4"
          required
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-ink">Observation</span>
        <textarea
          name="body"
          rows={4}
          placeholder="Décrire une surface observée sur l'app Salesforce de démonstration."
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink outline-none ring-accent/30 focus:ring-4"
          required
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink"
      >
        Enregistrer la note
      </button>
    </form>
  );
}
