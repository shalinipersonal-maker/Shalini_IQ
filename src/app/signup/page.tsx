"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { BrandMark } from "@/components/shell/sidebar";
import { toast } from "@/components/shared";
import { submitLead } from "@/components/site/submit-lead";
import { Button, Field, Input } from "@/components/ui";
import { BRAND_DEFAULTS, DEMO_NOTICE } from "@/config/brand";
import { inr } from "@/lib/format";
import { MARKETPLACES, signupSchema, type SignupRequest } from "@/lib/site/leads";
import { PRICING, quote } from "@/lib/site/pricing";
import { useStore } from "@/lib/store";

type FormIn = z.input<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useStore((s) => s.hydrated);
  const createWorkspace = useStore((s) => s.createWorkspace);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const initialSellers = Math.min(2000, Math.max(1, Number(params.get("sellers")) || 10));
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<FormIn, unknown, SignupRequest>({
    resolver: zodResolver(signupSchema),
    defaultValues: { kind: "signup", name: "", agency: "", email: "", phone: "", sellers: initialSellers, marketplaces: ["Amazon", "Flipkart"], website: "" },
  });
  const sellers = Number(watch("sellers")) || 0;
  const q = quote(sellers);

  const onSubmit = async (v: SignupRequest) => {
    setServerError(null);
    const res = await submitLead(v);
    if (!res.ok) {
      if (res.fields) for (const [k, m] of Object.entries(res.fields)) setError(k as keyof FormIn, { message: m });
      setServerError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    createWorkspace({ agency: v.agency, owner: v.name, email: v.email, sellersPlanned: v.sellers, marketplaces: [...v.marketplaces] });
    toast(`${v.agency} workspace created. It starts with sample sellers so you can explore.`);
    router.push("/overview");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md">
      <input type="hidden" {...register("kind")} />
      <div className="absolute -left-[9999px]" aria-hidden><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <h1 className="text-[24px] font-semibold">Start your agency workspace</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">Free to explore. You pay only when you go live with real sellers.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={errors.name?.message}><Input autoComplete="name" {...register("name")} /></Field>
        <Field label="Agency name" error={errors.agency?.message}><Input autoComplete="organization" {...register("agency")} /></Field>
        <Field label="Work email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></Field>
        <Field label="Phone" error={errors.phone?.message}><Input type="tel" autoComplete="tel" placeholder="+91" {...register("phone")} /></Field>
        <Field label="Sellers you plan to manage" error={errors.sellers?.message} className="sm:col-span-2"><Input type="number" min={1} max={2000} {...register("sellers")} /></Field>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[12px] font-medium text-muted">Marketplaces</legend>
        <div className="flex flex-wrap gap-2">
          {MARKETPLACES.map((m) => (
            <label key={m} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[13px] has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" value={m} className="accent-[var(--accent)]" {...register("marketplaces")} />{m}
            </label>
          ))}
        </div>
        {errors.marketplaces && <p className="mt-1 text-[12px] text-neg">{errors.marketplaces.message}</p>}
      </fieldset>
      {sellers > 0 && (
        <p className="tnum mt-4 rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-[13px]">
          When you go live with {q.sellers} seller{q.sellers === 1 ? "" : "s"}: <span className="font-semibold">{inr(q.monthly)}/month</span> + GST, and a one-time setup of {inr(PRICING.setupFee)}.
        </p>
      )}
      <label className="mt-4 flex items-start gap-2 text-[13px] text-muted">
        <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" {...register("consent")} />
        <span>I agree that {BRAND_DEFAULTS.company} may contact me about my workspace.</span>
      </label>
      {errors.consent && <p className="mt-1 text-[12px] text-neg">{errors.consent.message}</p>}
      {serverError && <p className="mt-3 rounded-md bg-neg-soft px-3 py-2 text-[13px] text-neg" role="alert">{serverError}</p>}
      <Button type="submit" variant="primary" className="mt-5 h-10 w-full" disabled={!hydrated || isSubmitting}>{isSubmitting ? "Creating workspace…" : "Create my workspace"}<ArrowRight /></Button>
      <p className="mt-4 rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-[12px] leading-relaxed text-muted">
        In this build the workspace is created in your browser and starts with sample sellers. {DEMO_NOTICE} Accounts with passwords and saved server-side data arrive with the production sign-in.
      </p>
      <p className="mt-4 text-center text-[13px] text-muted">Already have a workspace? <Link href="/login" className="font-medium text-accent">Log in</Link></p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2"><BrandMark size={28} /><span className="text-[15px] font-semibold">{BRAND_DEFAULTS.productName}</span></Link>
        <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to website</Link>
      </header>
      <main className="flex justify-center px-4 py-8 sm:py-14">
        <React.Suspense fallback={null}><SignupForm /></React.Suspense>
      </main>
    </div>
  );
}
