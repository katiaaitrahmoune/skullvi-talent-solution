"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STEPS } from "@/lib/copy";
import { ApiError, submitApplication } from "@/lib/api";
import type { Post } from "@/lib/posts";
import { DEFAULT_VALUES, fullSchema, STEP_FIELDS, type ApplicationValues } from "@/lib/schema";
import { CvStep } from "./steps/CvStep";
import { ProfileStep } from "./steps/ProfileStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ProjectStep } from "./steps/ProjectStep";
import { SkillsStep } from "./steps/SkillsStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { CoverStep } from "./steps/CoverStep";
import { ReceiptStep } from "./steps/ReceiptStep";
import { SummaryStep } from "./steps/SummaryStep";

const RECEIPT = STEPS.length - 1;
const SUMMARY = RECEIPT - 1;

export function ApplyWizard({ post }: { post: Post }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  const methods = useForm<ApplicationValues>({ resolver: zodResolver(fullSchema), mode: "onTouched", defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (mounted.current) {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
    mounted.current = true;
  }, [step]);

  const go = (to: number) => {
    setServerError(null);
    setStep(to);
  };
  const next = async () => {
    if (await methods.trigger(STEP_FIELDS[step], { shouldFocus: true })) go(step + 1);
  };

  const submit = async () => {
    for (let i = 0; i < STEP_FIELDS.length; i++) {
      if (!(await methods.trigger(STEP_FIELDS[i], { shouldFocus: i === step }))) return go(i);
    }
    setSubmitting(true);
    try {
      const res = await submitApplication(methods.getValues(), post.id);
      setReference(res.reference);
      go(RECEIPT);
    } catch (e) {
      if (e instanceof ApiError && e.code === "duplicate") {
        methods.setError("email", { message: e.message });
        go(0);
      } else {
        setServerError(e instanceof ApiError ? e.message : "Une erreur est survenue. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const meta = STEPS[step];

  return (
    <MotionConfig reducedMotion="user">
      <FormProvider {...methods}>
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
          {step < RECEIPT && (
            <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Toutes les offres
            </Link>
          )}

          <div className="mb-6 rounded-2xl border border-line border-l-4 border-l-brand-500 bg-white p-4">
            <p className="text-xs text-muted">Vous postulez à</p>
            <p className="text-sm font-semibold">{post.title}</p>
          </div>

          {step < RECEIPT && (
            <nav aria-label="Progression" className="mb-8">
              <p className="mb-2 text-xs text-muted">Étape {step + 1} sur {SUMMARY + 1} · {meta.label}</p>
              <ol className="flex gap-1.5">
                {STEPS.slice(0, SUMMARY + 1).map((s, i) => (
                  <li key={s.id} aria-current={i === step ? "step" : undefined} className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100">
                    <motion.div className="h-full bg-brand-500" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                    <span className="sr-only">{s.label}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">{meta.title}</h1>
            <p className="mb-7 mt-1.5 max-w-prose text-sm text-muted">{meta.desc}</p>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {meta.id === "cv" && <CvStep />}
                {meta.id === "education" && <ProfileStep />}
                {meta.id === "experience" && <ExperienceStep />}
                {meta.id === "skills" && <SkillsStep />}
                {meta.id === "project" && <ProjectStep />}
                {meta.id === "questions" && <QuestionsStep />}
                {meta.id === "cover" && <CoverStep />}
                {meta.id === "summary" && <SummaryStep onEdit={(id) => go(STEPS.findIndex((x) => x.id === id))} />}
                {meta.id === "receipt" && reference && <ReceiptStep reference={reference} post={post} />}
              </motion.div>
            </AnimatePresence>

            {step < RECEIPT && (
              <footer className="mt-8 border-t border-line pt-6">
                {serverError && (
                  <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {serverError}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  {step > 0 ? <Button type="button" variant="ghost" onClick={() => go(step - 1)}>Retour</Button> : <span />}
                  {step < SUMMARY ? (
                    <Button type="button" arrow onClick={next}>Continuer</Button>
                  ) : (
                    <Button type="button" onClick={submit} loading={submitting}>Envoyer ma candidature</Button>
                  )}
                </div>
              </footer>
            )}
          </section>
        </div>
      </FormProvider>
    </MotionConfig>
  );
}
