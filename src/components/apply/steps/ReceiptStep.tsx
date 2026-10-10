"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { formatDate, type Post } from "@/lib/posts";

export function ReceiptStep({ reference, post }: { reference: string; post: Post }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the code stays visible and selectable */
    }
  };

  const next = [
    { date: "Après le " + formatDate(post.deadline), text: "Examen des candidatures par l'équipe." },
    ...(post.infoSession ? [{ date: formatDate(post.infoSession), text: "Session d'information pour les candidats retenus." }] : []),
    { date: formatDate(post.startDate), text: "Début officiel du programme." },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 52 52" className="h-24 w-24" aria-hidden>
        <motion.circle
          cx="26" cy="26" r="24" fill="rgb(var(--brand-50))" stroke="rgb(var(--brand-500))" strokeWidth="2.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: "easeInOut" }}
        />
        <motion.path
          d="M15 27l8 8 14-16" fill="none" stroke="rgb(var(--brand-500))" strokeWidth="3.4"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.55, duration: 0.45 }}
        />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-6 w-full max-w-md"
      >
        <p className="text-sm text-muted">Votre référence</p>
        <button
          type="button"
          onClick={copy}
          className="mt-2 inline-flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-3 font-mono text-lg font-semibold tracking-wider text-brand-700 transition-colors hover:bg-brand-100"
          aria-label={`Copier la référence ${reference}`}
        >
          {reference}
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
        <p className="mt-1 h-4 text-xs text-brand-600" aria-live="polite">{copied ? "Copié" : ""}</p>

        <ol className="mt-6 space-y-4 text-left">
          {next.map((n, i) => (
            <li key={i} className="flex gap-4">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink">{n.date}</p>
                <p className="text-sm text-muted">{n.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand-600 hover:underline">Voir les autres offres</Link>
      </motion.div>
    </div>
  );
}
