import type { ButtonHTMLAttributes } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "ghost";
  loading?: boolean;
  arrow?: boolean;
};

// Matches the skullvi.org buttons: rounded rectangle, orange primary, #444 secondary, optional arrow.
export function Button({ variant = "primary", loading, arrow, className, children, disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "group inline-flex h-12 items-center justify-center gap-3 rounded-xl px-6 text-[15px] font-medium transition-all duration-200",
        "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand-500 text-white hover:bg-brand-600",
        variant === "dark" && "bg-night-btn text-white hover:bg-night",
        variant === "ghost" && "px-5 text-muted hover:bg-brand-50 hover:text-ink",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
      {arrow && !loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />}
    </button>
  );
}
