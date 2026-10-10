"use client";

export default function ReviewerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-10 text-center">
      <h1 className="text-xl font-semibold">Impossible de charger la page</h1>
      <p className="mt-2 text-muted">Le serveur démarre peut-être (jusqu'à une minute après une période d'inactivité). Réessayez dans un instant.</p>
      <button onClick={reset} className="mt-6 h-11 rounded-xl bg-brand-500 px-5 font-medium text-white hover:bg-brand-600">Réessayer</button>
    </div>
  );
}
