import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SITE } from "@/config/site";

/** Shared layout for the policy pages. Content is plain sections so it is easy to edit. */
export function PolicyPage({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string[] }[] }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] text-muted hover:text-ink"><ArrowLeft className="size-4" />Back to website</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-[30px] font-semibold">{title}</h1>
        <p className="mt-1 text-[13px] text-faint">Last updated {updated} · {SITE.company}</p>
        <div className="mt-8 space-y-7 text-[15px] leading-relaxed">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[18px] font-semibold">{s.h}</h2>
              {s.p.map((t, i) => <p key={i} className="mt-2 text-muted">{t}</p>)}
            </section>
          ))}
          <section>
            <h2 className="text-[18px] font-semibold">Contact</h2>
            <p className="mt-2 text-muted">Questions about this policy: {[...SITE.contact.emails, ...SITE.contact.phones].filter(Boolean).join(" · ")} · {SITE.location.address || SITE.location.city}.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
