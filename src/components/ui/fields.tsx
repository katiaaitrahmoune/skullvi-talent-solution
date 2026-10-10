"use client";

import type { ReactNode } from "react";
import { get, useFormContext, type FieldErrors } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ApplicationValues } from "@/lib/schema";
import type { Option } from "@/lib/options";

type Name = string;
export function getError(errors: FieldErrors<ApplicationValues>, name: Name): string | undefined {
  return (get(errors, name) as { message?: string } | undefined)?.message;
}

export function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <div id={id} className="min-h-[1.4rem] pl-1 pt-1.5 text-xs">
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" className="text-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const controlCls =
  "peer w-full rounded-xl border border-line bg-white px-4 text-sm text-ink outline-none transition-colors " +
  "placeholder-transparent hover:border-brand-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

const floatCls =
  "pointer-events-none absolute left-3 bg-white px-1 text-muted transition-all duration-200 " +
  "peer-focus:top-0 peer-focus:text-xs peer-focus:text-brand-600";

type CommonProps = {
  name: Name;
  label: string;
  hint?: string;
  className?: string;
};

export function TextField({
  name,
  label,
  hint,
  className,
  type = "text",
  autoComplete,
  inputMode,
}: CommonProps & { type?: string; autoComplete?: string; inputMode?: "text" | "email" | "tel" | "url" }) {
  const { register, formState: { errors } } = useFormContext<ApplicationValues>();
  const error = getError(errors, name);
  const id = `f-${name}`;
  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder=" "
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={`${id}-msg`}
          className={cn(controlCls, "h-12")}
          {...register(name as never)}
        />
        <label
          htmlFor={id}
          className={cn(floatCls, "top-1/2 -translate-y-1/2 text-sm", "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs")}
        >
          {label}
        </label>
      </div>
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  className,
  max,
  tall,
}: CommonProps & { max: number; tall?: boolean }) {
  const { register, watch, formState: { errors } } = useFormContext<ApplicationValues>();
  const error = getError(errors, name);
  const id = `f-${name}`;
  const length = String(watch(name as never) ?? "").length;
  return (
    <div className={className}>
      <div className="relative">
        <textarea
          id={id}
          placeholder=" "
          rows={tall ? 10 : 4}
          aria-invalid={!!error}
          aria-describedby={`${id}-msg`}
          className={cn(controlCls, tall ? "min-h-[16rem] resize-y py-3.5" : "min-h-[7.5rem] resize-none py-3.5")}
          {...register(name as never)}
        />
        <label
          htmlFor={id}
          className={cn(floatCls, "top-[22px] -translate-y-1/2 text-sm", "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs")}
        >
          {label}
        </label>
        <span className={cn("pointer-events-none absolute bottom-2.5 right-3 text-[11px]", length > max ? "text-danger" : "text-muted")}>
          {length}/{max}
        </span>
      </div>
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  options,
}: CommonProps & { options: Option[] }) {
  const { register, watch, formState: { errors } } = useFormContext<ApplicationValues>();
  const error = getError(errors, name);
  const id = `f-${name}`;
  const filled = String(watch(name as never) ?? "") !== "";
  return (
    <div className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={`${id}-msg`}
          className={cn(controlCls, "h-12 cursor-pointer appearance-none pr-10")}
          {...register(name as never)}
        >
          <option value="" hidden />
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label
          htmlFor={id}
          className={cn(floatCls, filled ? "top-0 -translate-y-1/2 text-xs" : "top-1/2 -translate-y-1/2 text-sm")}
        >
          {label}
        </label>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      <Message id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  name,
  children,
}: {
  name: Name;
  children: ReactNode;
}) {
  const { register, formState: { errors } } = useFormContext<ApplicationValues>();
  const error = getError(errors, name);
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input id={id} type="checkbox" className="peer sr-only" aria-invalid={!!error} {...register(name as never)} />
        <span
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-white text-white transition-all",
            "peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20",
            "peer-aria-[invalid=true]:border-danger",
            "[&>svg]:scale-0 [&>svg]:transition-transform peer-checked:[&>svg]:scale-100",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
        <span className="text-sm leading-relaxed text-ink">{children}</span>
      </label>
      <Message id={`${id}-msg`} error={error} />
    </div>
  );
}

export function DateField({ name, label, disabled }: { name: Name; label: string; disabled?: boolean }) {
  const { register, formState: { errors } } = useFormContext<ApplicationValues>();
  const error = getError(errors, name);
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block pl-1 text-xs font-medium text-ink">{label}</label>
      <input
        id={id}
        type="month"
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={`${id}-msg`}
        className={cn(controlCls, "h-12 disabled:cursor-not-allowed disabled:bg-brand-50 disabled:opacity-60")}
        {...register(name as never)}
      />
      <Message id={`${id}-msg`} error={error} />
    </div>
  );
}
