"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@/lib/cn";
import { SKILL_SUGGESTIONS } from "@/lib/options";
import type { ApplicationValues } from "@/lib/schema";
import { getError, Message } from "./fields";

const MAX = 15;

function Inner({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onBlur: () => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const skill = raw.trim().replace(/,$/, "").trim();
    if (!skill || value.length >= MAX) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    onChange([...value, skill]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const suggestions = SKILL_SUGGESTIONS.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  ).slice(0, 8);

  return (
    <div>
      <p className="mb-2 pl-1 text-xs font-medium text-ink">Compétences techniques</p>
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 transition-colors",
          "focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10",
          error && "border-danger",
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {value.map((skill) => (
            <motion.span
              key={skill}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-medium text-brand-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== skill))}
                aria-label={`Retirer ${skill}`}
                className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-brand-200"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            add(draft);
            onBlur();
          }}
          placeholder={value.length ? "Ajouter…" : "Tapez une compétence puis Entrée"}
          aria-label="Ajouter une compétence"
          className="h-8 min-w-[10rem] flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
        />
      </div>
      <Message id="skills-msg" error={error} hint={`${value.length}/${MAX} compétences`} />
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs text-muted transition-colors hover:border-brand-500 hover:text-brand-600"
          >
            <Plus className="h-3 w-3" aria-hidden />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SkillsField() {
  const { control, formState: { errors } } = useFormContext<ApplicationValues>();
  return (
    <Controller
      control={control}
      name="skills"
      render={({ field }) => (
        <Inner value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={getError(errors, "skills")} />
      )}
    />
  );
}
