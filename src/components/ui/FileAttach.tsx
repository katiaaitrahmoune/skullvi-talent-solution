"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { ApplicationValues } from "@/lib/schema";

const MAX_MB = 5;

// Optional proof upload (PDF/PNG/JPG, 5 MB). Stores the File in the form under `name`.
export function FileAttach({ name, label }: { name: string; label: string }) {
  const { watch, setValue } = useFormContext<ApplicationValues>();
  const file = watch(name as never) as unknown as File | null | undefined;
  const [tooBig, setTooBig] = useState(false);

  return (
    <div className="mt-4">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink hover:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/20">
        <Paperclip className="h-3.5 w-3.5" aria-hidden />
        {file ? file.name : label}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (!picked) return;
            if (picked.size > MAX_MB * 1024 * 1024) return setTooBig(true);
            setTooBig(false);
            setValue(name as never, picked as never);
          }}
        />
      </label>
      <p role={tooBig ? "alert" : undefined} className={tooBig ? "mt-1.5 pl-1 text-xs text-danger" : "mt-1.5 pl-1 text-xs text-muted"}>
        {tooBig ? `Fichier trop lourd (max ${MAX_MB} Mo).` : `Facultatif · PDF, PNG ou JPG · ${MAX_MB} Mo max`}
      </p>
    </div>
  );
}
