"use client";

export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-10 text-center">
      <h1 className="text-xl font-semibold">Impossible de joindre le serveur</h1>
      <p className="mt-2 text-muted">Il démarre peut-être (jusqu'à une minute après une période d'inactivité). Réessayez dans un instant.</p>
      {error.message && <p className="mt-3 text-xs text-muted">{error.message}</p>}
      <button onClick={reset} className="mt-6 h-11 rounded-xl bg-brand-500 px-5 font-medium text-white hover:bg-brand-600">Réessayer</button>
    </div>
  );
}
