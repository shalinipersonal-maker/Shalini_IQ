"use client";
import * as D from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail, MessageCircle, Phone, Send, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SITE, telHref } from "@/config/site";
import { enquirySchema, SERVICES, type Enquiry } from "@/lib/site/leads";
import { contactLinks, submitLead } from "./submit-lead";
import { ROYAL } from "@/app/site-fonts";
import { clearHash, useHash } from "./use-browser";

type FormIn = z.input<typeof enquirySchema>;

export function EnquiryForm({ compact, defaultInterest }: { compact?: boolean; defaultInterest?: (typeof SERVICES)[number] }) {
  const [done, setDone] = React.useState<{ reference: string; alert: string; lead: Enquiry } | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormIn, unknown, Enquiry>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { kind: "enquiry", name: "", phone: "", email: "", agency: "", interest: defaultInterest, message: "", website: "" },
  });
  const onSubmit = async (v: Enquiry) => {
    setServerError(null);
    const res = await submitLead(v);
    if (!res.ok || !res.reference) {
      if (res.fields) for (const [k, m] of Object.entries(res.fields)) setError(k as keyof FormIn, { message: m });
      setServerError(res.error ?? "Something went wrong. Please try again, or call us.");
      return;
    }
    setDone({ reference: res.reference, alert: res.alert ?? "pending_configuration", lead: v });
  };

  if (done) {
    const links = contactLinks(done.lead, done.reference);
    return (
      <div role="status" className="py-2">
        <CheckCircle2 className="size-8 text-pos" aria-hidden />
        <p className="mt-3 text-[17px] font-semibold">Thank you, {done.lead.name.split(" ")[0]}. Reference {done.reference}.</p>
        <p className="mt-1.5 text-[14px] text-muted">
          {done.alert === "sent" ? "Our team has your enquiry and will call you within one working day." : "Your enquiry is saved. For the fastest reply, send it to us on WhatsApp or email now."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1faa55] px-3 text-[13px] font-medium text-white"><MessageCircle className="size-4" />Send on WhatsApp</a>}
          <a href={links.email} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-raised"><Mail className="size-4" />Email us</a>
          <a href={telHref(SITE.contact.phones[0])} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium hover:bg-raised"><Phone className="size-4" />Call {SITE.contact.phones[0]}</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register("kind")} />
      <div className="absolute -left-[9999px]" aria-hidden><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
        <Field label="Your name" error={errors.name?.message}><Input autoComplete="name" {...register("name")} /></Field>
        <Field label="Phone / WhatsApp" error={errors.phone?.message}><Input type="tel" autoComplete="tel" placeholder="+91" {...register("phone")} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></Field>
        <Field label="Business name (optional)" error={errors.agency?.message}><Input autoComplete="organization" {...register("agency")} /></Field>
        <Field label="What do you need?" error={errors.interest?.message} className={compact ? "" : "sm:col-span-2"}>
          <Select defaultValue={defaultInterest ?? ""} {...register("interest")}>
            <option value="" disabled>Choose a service</option>
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Tell us a little (optional)" error={errors.message?.message} className={compact ? "" : "sm:col-span-2"}><Textarea rows={compact ? 2 : 3} {...register("message")} /></Field>
      </div>
      <label className="mt-3 flex items-start gap-2 text-[12.5px] text-muted">
        <input type="checkbox" className="mt-0.5 accent-[var(--accent)]" {...register("consent")} />
        <span>I agree that Shalini_IQ may contact me by phone, WhatsApp or email.</span>
      </label>
      {errors.consent && <p className="mt-1 text-[12px] text-neg">{errors.consent.message}</p>}
      {serverError && <p className="mt-3 rounded-md bg-neg-soft px-3 py-2 text-[13px] text-neg" role="alert">{serverError}</p>}
      <Button type="submit" variant="primary" className="mt-4 h-10 w-full" disabled={isSubmitting}><Send />{isSubmitting ? "Sending…" : "Get my free consultation"}</Button>
    </form>
  );
}

/** Opens whenever the URL hash is #enquiry — used by the header button, side tab and footer. */
export function EnquiryModal() {
  const open = useHash() === "#enquiry";
  const close = clearHash;
  return (
    <D.Root open={open} onOpenChange={(o) => !o && close()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]" />
        <D.Content className={`${ROYAL} overlay-in fixed top-1/2 left-1/2 z-[60] max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line p-5 shadow-card`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <D.Title className="font-royal text-[26px]">Free consultation</D.Title>
              <D.Description className="mt-0.5 text-[13px] text-muted">Tell us what you need. We reply within one working day.</D.Description>
            </div>
            <D.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X /></Button></D.Close>
          </div>
          <EnquiryForm compact />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
